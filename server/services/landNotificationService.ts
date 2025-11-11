/**
 * Land Notification Service (Sec 11/19)
 * Handles notification creation, legal approval, publishing, and objection management
 */

import { storage } from "../storage";
import { workflowService } from "./workflowService";
import { pdfService } from "./pdfService";
import { notificationService as userNotificationService } from "./notificationService";
import { InsertLandNotification, InsertNotificationParcel } from "@shared/schema";
import { LAMS_ROLES } from "@shared/roles";
import { citizenAlertService } from "./citizenAlertService";

export class LandNotificationService {
  /**
   * Generate notification reference number (SEC11-YYYY-XXX or SEC19-YYYY-XXX)
   */
  private async generateRefNo(type: 'sec11' | 'sec19'): Promise<string> {
    const year = new Date().getFullYear();
    const sequenceName = type === 'sec11' ? 'SEC11' : 'SEC19';
    const sequence = await storage.getNextSequenceValue(sequenceName);
    return `${sequenceName}-${year}-${sequence.toString().padStart(3, '0')}`;
  }

  /**
   * Create a new notification (Sec 11 or Sec 19)
   */
  async createNotification(
    notificationData: Omit<InsertLandNotification, 'refNo' | 'status'>,
    parcelIds: number[],
    createdBy: number
  ): Promise<any> {
    try {
      // Validate notification type
      if (!['sec11', 'sec19'].includes(notificationData.type)) {
        throw new Error('Invalid notification type. Must be sec11 or sec19');
      }

      // Generate reference number
      const refNo = await this.generateRefNo(notificationData.type as 'sec11' | 'sec19');

      // Create notification
      const notification = await storage.createLandNotification({
        ...notificationData,
        refNo,
        status: 'draft',
        createdBy,
      });

      // Link parcels to notification
      for (const parcelId of parcelIds) {
        await storage.createNotificationParcel({
          notificationId: notification.id,
          parcelId,
        });
      }

      // Create audit log
      await storage.createAuditLog({
        userId: createdBy,
        action: 'create',
        resourceType: 'land_notification',
        resourceId: notification.id,
        details: { refNo, type: notificationData.type, parcelCount: parcelIds.length },
      });

      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Update notification
   */
  async updateNotification(
    notificationId: number,
    notificationData: Partial<InsertLandNotification>,
    parcelIds?: number[],
    userId: number
  ): Promise<any> {
    try {
      const existing = await storage.getLandNotification(notificationId);
      if (!existing) {
        throw new Error('Notification not found');
      }

      // Only allow updates if in draft status
      if (existing.status !== 'draft') {
        throw new Error('Notification can only be updated when in draft status');
      }

      const updated = await storage.updateLandNotification(notificationId, notificationData);

      // Update parcels if provided
      if (parcelIds) {
        // Delete existing parcel associations
        const existingParcels = await storage.getNotificationParcels(notificationId);
        for (const np of existingParcels) {
          await storage.deleteNotificationParcel(np.id);
        }

        // Create new associations
        for (const parcelId of parcelIds) {
          await storage.createNotificationParcel({
            notificationId,
            parcelId,
          });
        }
      }

      // Create audit log
      await storage.createAuditLog({
        userId,
        action: 'update',
        resourceType: 'land_notification',
        resourceId: notificationId,
        details: { changes: notificationData },
      });

      return updated;
    } catch (error) {
      console.error('Error updating notification:', error);
      throw error;
    }
  }

  /**
   * Submit notification for legal review
   */
  async submitForLegalReview(notificationId: number, userId: number): Promise<any> {
    try {
      const existing = await storage.getLandNotification(notificationId);
      if (!existing) {
        throw new Error('Notification not found');
      }

      if (existing.status !== 'draft') {
        throw new Error('Only draft notifications can be submitted for legal review');
      }

      // Transition to legal_review state
      await workflowService.transitionNotificationState(notificationId, 'legal_review', userId);
      const updated = await storage.updateLandNotification(notificationId, {
        status: 'legal_review',
      });

      // Create tasks for legal officers
      const legalOfficers = await storage.getAllUsers();
      const officers = legalOfficers.filter(u => u.role === LAMS_ROLES.LEGAL_OFFICER || u.role === LAMS_ROLES.ADMIN);

      for (const officer of officers) {
        await storage.createTask({
          assigneeId: officer.id,
          requestType: 'land_notification',
          requestId: notificationId,
          taskType: 'approval',
          title: `Legal Review Required - ${existing.refNo}`,
          description: `Please review and approve notification ${existing.refNo}: ${existing.title}`,
          dueDate: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours SLA
        });

        await userNotificationService.createNotification({
          userId: officer.id,
          title: 'Legal Review Required',
          message: `Notification ${existing.refNo} requires your legal review`,
          type: 'approval_needed',
          relatedType: 'land_notification',
          relatedId: notificationId,
        });
      }

      // Create audit log
      await storage.createAuditLog({
        userId,
        action: 'submit_legal_review',
        resourceType: 'land_notification',
        resourceId: notificationId,
        details: { refNo: existing.refNo },
      });

      return updated;
    } catch (error) {
      console.error('Error submitting for legal review:', error);
      throw error;
    }
  }

  /**
   * Approve notification (legal officer)
   */
  async approveNotification(notificationId: number, approverId: number, comments?: string): Promise<any> {
    try {
      const existing = await storage.getLandNotification(notificationId);
      if (!existing) {
        throw new Error('Notification not found');
      }

      if (existing.status !== 'legal_review') {
        throw new Error('Notification must be in legal_review status to be approved');
      }

      // Check user role
      const user = await storage.getUser(approverId);
      if (user?.role !== LAMS_ROLES.LEGAL_OFFICER && user?.role !== LAMS_ROLES.ADMIN) {
        throw new Error('Only legal officers can approve notifications');
      }

      // Transition to approved state
      await workflowService.transitionNotificationState(notificationId, 'approved', approverId);
      const updated = await storage.updateLandNotification(notificationId, {
        status: 'approved',
        approvedBy: approverId,
        approvedAt: new Date(),
      });

      // Notify creator
      await userNotificationService.createNotification({
        userId: existing.createdBy,
        title: 'Notification Approved',
        message: `Notification ${existing.refNo} has been approved by legal officer`,
        type: 'status_update',
        relatedType: 'land_notification',
        relatedId: notificationId,
      });

      // Create audit log
      await storage.createAuditLog({
        userId: approverId,
        action: 'approve',
        resourceType: 'land_notification',
        resourceId: notificationId,
        details: { refNo: existing.refNo, comments },
      });

      return updated;
    } catch (error) {
      console.error('Error approving notification:', error);
      throw error;
    }
  }

  /**
   * Publish notification (Sec 11)
   */
  async publishNotification(
    notificationId: number,
    publishDate: Date,
    userId: number,
    options?: { notifyChannels?: string[] }
  ): Promise<any> {
    try {
      const existing = await storage.getLandNotification(notificationId);
      if (!existing) {
        throw new Error('Notification not found');
      }

      if (existing.status !== 'approved') {
        throw new Error('Notification must be approved before publishing');
      }

      // Get linked parcels
      const notificationParcels = await storage.getNotificationParcels(notificationId);
      const parcels = await Promise.all(
        notificationParcels.map(np => storage.getParcel(np.parcelId))
      );
      const validParcels = parcels.filter(p => p !== undefined).map(p => ({
        parcelNo: p!.parcelNo,
        village: p!.village,
        area: Number(p!.areaSqM),
      }));

      // Generate PDF
      const { filePath, hash, qrCode } = await pdfService.generateNotificationPdf(
        notificationId,
        existing.type as 'sec11' | 'sec19',
        existing.refNo,
        existing.title,
        existing.bodyHtml,
        validParcels,
        publishDate
      );

      // Update notification
      await workflowService.transitionNotificationState(notificationId, 'published', userId);
      const updated = await storage.updateLandNotification(notificationId, {
        status: 'published',
        publishDate,
      });

      // If Sec 11, open objection window
      if (existing.type === 'sec11') {
        await workflowService.transitionNotificationState(notificationId, 'objection_window_open', userId);
        await storage.updateLandNotification(notificationId, {
          status: 'objection_window_open',
        });

        // Set objection deadline (30 days from publish date)
        const objectionDeadline = new Date(publishDate);
        objectionDeadline.setDate(objectionDeadline.getDate() + 30);
        // Note: Add objectionDeadline field to schema if needed
      }

      // Create audit log
      await storage.createAuditLog({
        userId,
        action: 'publish',
        resourceType: 'land_notification',
        resourceId: notificationId,
        details: { refNo: existing.refNo, publishDate, hash },
      });

      if (options?.notifyChannels?.length) {
        await citizenAlertService.sendAlerts({
          notificationId,
          notificationRef: existing.refNo,
          title: existing.title,
          bodyPreview: existing.bodyHtml.replace(/<[^>]+>/g, "").slice(0, 120),
          channels: options.notifyChannels as ("email" | "sms" | "whatsapp")[],
        });
      }

      return { ...updated, pdfPath: filePath, hash, qrCode };
    } catch (error) {
      console.error('Error publishing notification:', error);
      throw error;
    }
  }

  /**
   * Preview notification PDF without changing status
   */
  async previewNotification(notificationId: number, publishDate: Date): Promise<{ pdfPath: string; hash: string; qrCode?: string }> {
    const notification = await storage.getLandNotification(notificationId);
    if (!notification) {
      throw new Error('Notification not found');
    }

    const notificationParcels = await storage.getNotificationParcels(notificationId);
    const parcels = await Promise.all(
      notificationParcels.map(np => storage.getParcel(np.parcelId))
    );
    const validParcels = parcels.filter(p => p !== undefined).map(p => ({
      parcelNo: p!.parcelNo,
      village: p!.village,
      area: Number(p!.areaSqM),
    }));

    return await pdfService.generateNotificationPdf(
      notificationId,
      notification.type as 'sec11' | 'sec19',
      notification.refNo,
      notification.title,
      notification.bodyHtml,
      validParcels,
      publishDate
    );
  }

  /**
   * Get notification with related data
   */
  async getNotificationWithDetails(notificationId: number): Promise<any> {
    try {
      const notification = await storage.getLandNotification(notificationId);
      if (!notification) {
        throw new Error('Notification not found');
      }

      const notificationParcels = await storage.getNotificationParcels(notificationId);
      const parcels = await Promise.all(
        notificationParcels.map(np => storage.getParcel(np.parcelId))
      );
      const objections = await storage.getObjections({ notificationId });

      return {
        ...notification,
        parcels: parcels.filter(p => p !== undefined),
        objections,
        objectionCount: objections.length,
        unresolvedObjectionCount: objections.filter(o => !['resolved', 'rejected'].includes(o.status)).length,
      };
    } catch (error) {
      console.error('Error getting notification details:', error);
      throw error;
    }
  }

  /**
   * Get all notifications with filters
   */
  async getNotifications(filters?: { type?: string; status?: string }): Promise<any[]> {
    return await storage.getLandNotifications(filters);
  }

  /**
   * Check if all objections are resolved (for Sec 19 publishing)
   */
  async canPublishSec19(notificationId: number): Promise<boolean> {
    const unresolved = await storage.getUnresolvedObjections(notificationId);
    return unresolved.length === 0;
  }

}

export const landNotificationService = new LandNotificationService();
