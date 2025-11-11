/**
 * Notification Service
 * Handles user notifications for workflow events
 */

import { storage } from "../storage";
import { InsertNotification } from "@shared/schema";

export class NotificationService {
  /**
   * Create a notification
   */
  async createNotification(notification: InsertNotification): Promise<any> {
    return await storage.createNotification(notification);
  }

  /**
   * Notify previous approvers about higher stage actions
   */
  async notifyPreviousApprovers(
    requestType: string,
    requestId: number,
    action: 'rejected' | 'changes_requested',
    higherStageRole: string,
    comments?: string
  ): Promise<void> {
    try {
      // Get all approvals for this request
      const approvals = await storage.getCurrentCycleApprovalsByRequest(requestType, requestId);
      
      // Get request details
      let requestDetails: any = null;
      if (requestType === 'investment') {
        requestDetails = await storage.getInvestmentRequest(requestId);
      } else if (requestType === 'cash_request') {
        requestDetails = await storage.getCashRequest(requestId);
      }

      // Notify each previous approver
      for (const approval of approvals) {
        if (approval.approverId && approval.status === 'approved') {
          const actionText = action === 'rejected' ? 'rejected' : 'requested changes to';
          
          await storage.createNotification({
            userId: approval.approverId,
            title: `Request ${actionText.charAt(0).toUpperCase() + actionText.slice(1)}`,
            message: `A ${higherStageRole} has ${actionText} the ${requestType.replace('_', ' ')} request you previously approved.`,
            type: 'higher_stage_action',
            relatedType: requestType,
            relatedId: requestId,
            previousApproverStage: approval.stage,
            higherStageAction: action,
            higherStageRole,
            higherStageComments: comments,
            investmentSummary: requestDetails ? {
              requestId: requestDetails.requestId,
              amount: requestDetails.amount,
              status: requestDetails.status,
            } : undefined,
          });
        }
      }
    } catch (error) {
      console.error('Error notifying previous approvers:', error);
      // Don't throw - notification failures shouldn't break the workflow
    }
  }

  /**
   * Notify requester that request was approved
   */
  async notifyRequestApproved(requestType: string, requestId: number): Promise<void> {
    try {
      let request: any = null;
      let requesterId: number | null = null;

      if (requestType === 'investment') {
        request = await storage.getInvestmentRequest(requestId);
        requesterId = request?.requesterId || null;
      } else if (requestType === 'cash_request') {
        request = await storage.getCashRequest(requestId);
        requesterId = request?.requesterId || null;
      }

      if (requesterId) {
        await storage.createNotification({
          userId: requesterId,
          title: 'Request Approved',
          message: `Your ${requestType.replace('_', ' ')} request has been approved.`,
          type: 'status_update',
          relatedType: requestType,
          relatedId: requestId,
        });
      }
    } catch (error) {
      console.error('Error notifying request approved:', error);
    }
  }

  /**
   * Notify requester that request was rejected
   */
  async notifyRequestRejected(requestType: string, requestId: number): Promise<void> {
    try {
      let request: any = null;
      let requesterId: number | null = null;

      if (requestType === 'investment') {
        request = await storage.getInvestmentRequest(requestId);
        requesterId = request?.requesterId || null;
      } else if (requestType === 'cash_request') {
        request = await storage.getCashRequest(requestId);
        requesterId = request?.requesterId || null;
      }

      if (requesterId) {
        await storage.createNotification({
          userId: requesterId,
          title: 'Request Rejected',
          message: `Your ${requestType.replace('_', ' ')} request has been rejected. Please review and resubmit.`,
          type: 'status_update',
          relatedType: requestType,
          relatedId: requestId,
        });
      }
    } catch (error) {
      console.error('Error notifying request rejected:', error);
    }
  }

  /**
   * Notify requester that changes are requested
   */
  async notifyChangesRequested(requestType: string, requestId: number): Promise<void> {
    try {
      let request: any = null;
      let requesterId: number | null = null;

      if (requestType === 'investment') {
        request = await storage.getInvestmentRequest(requestId);
        requesterId = request?.requesterId || null;
      } else if (requestType === 'cash_request') {
        request = await storage.getCashRequest(requestId);
        requesterId = request?.requesterId || null;
      }

      if (requesterId) {
        await storage.createNotification({
          userId: requesterId,
          title: 'Changes Requested',
          message: `Changes have been requested for your ${requestType.replace('_', ' ')} request. Please review and update.`,
          type: 'status_update',
          relatedType: requestType,
          relatedId: requestId,
        });
      }
    } catch (error) {
      console.error('Error notifying changes requested:', error);
    }
  }
}

export const notificationService = new NotificationService();
