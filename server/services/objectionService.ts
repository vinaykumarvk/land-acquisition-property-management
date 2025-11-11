/**
 * Objection Service
 * Handles objection submission, resolution, and tracking
 */

import { storage } from "../storage";
import { workflowService } from "./workflowService";
import { notificationService } from "./notificationService";
import { InsertObjection, ObjectionAttachment } from "@shared/schema";
import { LAMS_ROLES } from "@shared/roles";

export class ObjectionService {
  /**
   * Submit an objection to a notification
   */
  async submitObjection(
    objectionData: Omit<InsertObjection, 'status'>,
    userId?: number
  ): Promise<any> {
    try {
      // Verify notification exists and is published
      const notification = await storage.getLandNotification(objectionData.notificationId);
      if (!notification) {
        throw new Error('Notification not found');
      }

      // Allow objections for published notifications (objection window is automatically open for published Sec 11)
      if (!['published', 'objection_window_open'].includes(notification.status)) {
        throw new Error('Objections can only be submitted for published notifications');
      }

      // Verify parcel exists
      const parcel = await storage.getParcel(objectionData.parcelId);
      if (!parcel) {
        throw new Error('Parcel not found');
      }

      const payload: InsertObjection = {
        ...objectionData,
        ownerId: objectionData.ownerId || userId || null,
        status: 'received',
        attachmentsJson: objectionData.attachmentsJson ?? null,
        attachmentPath: objectionData.attachmentsJson?.[0]?.path,
      };

      // Create objection
      const objection = await storage.createObjection(payload);

      // Notify case officers about new objection
      const caseOfficers = await storage.getAllUsers();
      const officers = caseOfficers.filter(
        u => u.role === LAMS_ROLES.CASE_OFFICER || u.role === LAMS_ROLES.ADMIN
      );

      for (const officer of officers) {
        await notificationService.createNotification({
          userId: officer.id,
          title: 'New Objection Received',
          message: `New objection received for notification ${notification.refNo}`,
          type: 'status_update',
          relatedType: 'objection',
          relatedId: objection.id,
        });
      }

      // Create audit log
      await storage.createAuditLog({
        userId: userId || 0, // Anonymous objections
        action: 'submit_objection',
        resourceType: 'objection',
        resourceId: objection.id,
        details: { notificationId: objectionData.notificationId, parcelId: objectionData.parcelId },
      });

      return objection;
    } catch (error) {
      console.error('Error submitting objection:', error);
      throw error;
    }
  }

  /**
   * Resolve an objection
   */
  async resolveObjection(
    objectionId: number,
    resolutionText: string,
    status: 'resolved' | 'rejected',
    resolverId: number
  ): Promise<any> {
    try {
      const objection = await storage.getObjection(objectionId);
      if (!objection) {
        throw new Error('Objection not found');
      }

      if (['resolved', 'rejected'].includes(objection.status)) {
        throw new Error('Objection has already been resolved');
      }

      // Check user role
      const user = await storage.getUser(resolverId);
      if (user?.role !== LAMS_ROLES.CASE_OFFICER && user?.role !== LAMS_ROLES.LEGAL_OFFICER && user?.role !== LAMS_ROLES.ADMIN) {
        throw new Error('Only case officers and legal officers can resolve objections');
      }

      // Update objection
      const updated = await storage.updateObjection(objectionId, {
        status,
        resolutionText,
        resolvedBy: resolverId,
        resolvedAt: new Date(),
      });

      // Check if all objections for this notification are resolved
      const notification = await storage.getLandNotification(objection.notificationId);
      if (notification) {
        const unresolved = await storage.getUnresolvedObjections(notification.id);
        
        if (unresolved.length === 0 && notification.type === 'sec11') {
          // All objections resolved - can publish Sec 19
          await workflowService.transitionNotificationState(notification.id, 'objection_resolved', resolverId);
          await storage.updateLandNotification(notification.id, {
            status: 'objection_resolved',
          });

          // Notify case officers that Sec 19 can be published
          const caseOfficers = await storage.getAllUsers();
          const officers = caseOfficers.filter(
            u => u.role === LAMS_ROLES.CASE_OFFICER || u.role === LAMS_ROLES.ADMIN
          );

          for (const officer of officers) {
            await notificationService.createNotification({
              userId: officer.id,
              title: 'All Objections Resolved',
              message: `All objections for ${notification.refNo} have been resolved. Sec 19 can now be published.`,
              type: 'status_update',
              relatedType: 'land_notification',
              relatedId: notification.id,
            });
          }
        }
      }

      // Notify objector if owner is known
      if (objection.ownerId) {
        await notificationService.createNotification({
          userId: objection.ownerId,
          title: 'Objection Resolved',
          message: `Your objection has been ${status}. ${resolutionText}`,
          type: 'status_update',
          relatedType: 'objection',
          relatedId: objectionId,
        });
      }

      // Create audit log
      await storage.createAuditLog({
        userId: resolverId,
        action: 'resolve_objection',
        resourceType: 'objection',
        resourceId: objectionId,
        details: { status, resolutionText },
      });

      return updated;
    } catch (error) {
      console.error('Error resolving objection:', error);
      throw error;
    }
  }

  /**
   * Get objection with related data
   */
  async getObjectionWithDetails(objectionId: number): Promise<any> {
    try {
      const objection = await storage.getObjection(objectionId);
      if (!objection) {
        throw new Error('Objection not found');
      }

      const notification = await storage.getLandNotification(objection.notificationId);
      const parcel = await storage.getParcel(objection.parcelId);
      const owner = objection.ownerId ? await storage.getOwner(objection.ownerId) : null;
      const resolver = objection.resolvedBy ? await storage.getUser(objection.resolvedBy) : null;

      return {
        ...objection,
        notification,
        parcel,
        owner,
        resolver,
      };
    } catch (error) {
      console.error('Error getting objection details:', error);
      throw error;
    }
  }

  /**
   * Get all objections with filters
   */
  async getObjections(filters?: { notificationId?: number; status?: string }): Promise<any[]> {
    return await storage.getObjections(filters);
  }

  /**
   * Get unresolved objections for a notification
   */
  async getUnresolvedObjections(notificationId: number): Promise<any[]> {
    return await storage.getUnresolvedObjections(notificationId);
  }
}

export const objectionService = new ObjectionService();
