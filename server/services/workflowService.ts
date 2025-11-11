import { storage } from "../storage";
import { notificationService } from "./notificationService";
import { LAMS_ROLES } from "@shared/roles";

export class WorkflowService {
  // Legacy Investment Portal workflows
  private approvalWorkflows = {
    investment: [
      { stage: 0, approverRole: 'admin', slaHours: 24 }, // Admin review for "opportunity" status
      { stage: 1, approverRole: 'manager', slaHours: 48 },
      { stage: 2, approverRole: 'committee_member', slaHours: 72 },
      { stage: 3, approverRole: 'finance', slaHours: 24 },
    ],
    cash_request: [
      { stage: 1, approverRole: 'manager', slaHours: 24 },
      { stage: 2, approverRole: 'finance', slaHours: 12 },
    ],
  };

  // LAMS (Land Acquisition Management System) workflows
  private lamsWorkflows = {
    // SIA workflow: Draft → Published → HearingScheduled → HearingCompleted → ReportGenerated → Closed
    sia: {
      states: ['draft', 'published', 'hearing_scheduled', 'hearing_completed', 'report_generated', 'closed'],
      transitions: {
        draft: ['published'],
        published: ['hearing_scheduled'],
        hearing_scheduled: ['hearing_completed'],
        hearing_completed: ['report_generated'],
        report_generated: ['closed'],
      },
    },
    // Notification workflow: Draft → LegalReview → Approved → Published(§11) → ObjectionWindowOpen → ObjectionResolved → Published(§19) → Closed
    land_notification: {
      states: ['draft', 'legal_review', 'approved', 'published', 'objection_window_open', 'objection_resolved', 'closed'],
      transitions: {
        draft: ['legal_review'],
        legal_review: ['approved', 'draft'], // Can be sent back to draft
        approved: ['published'],
        published: ['objection_window_open'], // For Sec 11
        objection_window_open: ['objection_resolved'],
        objection_resolved: ['published'], // Publish Sec 19
        published: ['closed'], // After Sec 19 published
      },
      approverRoles: {
        legal_review: LAMS_ROLES.LEGAL_OFFICER,
        approved: LAMS_ROLES.LEGAL_OFFICER,
      },
    },
    // Award workflow: EligibilityCheck → ValuationReady → DraftAward → FinanceReview → AwardIssued → PaymentInitiated → Paid → Closed
    award: {
      states: ['draft', 'fin_review', 'issued', 'paid', 'closed'],
      transitions: {
        draft: ['fin_review'],
        fin_review: ['issued', 'draft'], // Can be sent back
        issued: ['paid'],
        paid: ['closed'],
      },
      approverRoles: {
        fin_review: LAMS_ROLES.FINANCE_OFFICER,
      },
    },
    // Possession workflow: Scheduled → InProgress → EvidenceCaptured → CertificateIssued → RegistryUpdated → Closed
    possession: {
      states: ['scheduled', 'in_progress', 'evidence_captured', 'certificate_issued', 'registry_updated', 'closed'],
      transitions: {
        scheduled: ['in_progress'],
        in_progress: ['evidence_captured'],
        evidence_captured: ['certificate_issued'],
        certificate_issued: ['registry_updated'],
        registry_updated: ['closed'],
      },
    },
  };

  async startApprovalWorkflow(requestType: 'investment' | 'cash_request', requestId: number) {
    const workflow = this.approvalWorkflows[requestType];
    const firstStage = workflow[0];

    // Get current approval cycle
    let currentCycle = 1;
    if (requestType === 'investment') {
      const investment = await storage.getInvestmentRequest(requestId);
      currentCycle = investment?.currentApprovalCycle || 1;
    }

    // Create approval record for first stage with current cycle
    await storage.createApproval({
      requestType,
      requestId,
      stage: firstStage.stage,
      approverId: null, // Will be assigned when someone claims it
      status: 'pending',
      approvalCycle: currentCycle,
      isCurrentCycle: true,
    });

    // Create task for first stage
    await this.createApprovalTask(requestType, requestId, firstStage.stage);
  }

  // New method for starting Admin review for "opportunity" status
  async startAdminReview(requestId: number) {
    // Get current approval cycle
    const investment = await storage.getInvestmentRequest(requestId);
    const currentCycle = investment?.currentApprovalCycle || 1;

    // Create approval record for admin review (stage 0) with cycle tracking
    await storage.createApproval({
      requestType: 'investment',
      requestId,
      stage: 0,
      approverId: null,
      status: 'pending',
      approvalCycle: currentCycle,
      isCurrentCycle: true,
    });

    // Create task for admin review
    await this.createApprovalTask('investment', requestId, 0);
  }

  async processApproval(
    requestType: string,
    requestId: number,
    approverId: number,
    action: 'approve' | 'reject' | 'changes_requested',
    comments?: string
  ) {
    try {
      // Get current cycle approval records only
      const approvals = await storage.getCurrentCycleApprovalsByRequest(requestType, requestId);
      const currentApproval = approvals.find(a => a.status === 'pending');

      if (!currentApproval) {
        throw new Error('No pending approval found');
      }

      // Get approver details to determine status text
      const approver = await storage.getUser(approverId);
      let statusText = action;
      
      if (action === 'approve') {
        switch (approver?.role) {
          case 'admin':
            statusText = 'Admin approved';
            break;
          case 'manager':
            statusText = 'Manager approved';
            break;
          case 'committee_member':
            statusText = 'Committee approved';
            break;
          case 'finance':
            statusText = 'Finance approved';
            break;
          default:
            statusText = 'approved';
        }
      } else if (action === 'reject') {
        switch (approver?.role) {
          case 'admin':
            statusText = 'admin_rejected'; // Special status for admin rejection
            break;
          case 'manager':
            statusText = 'Manager rejected';
            break;
          case 'committee_member':
            statusText = 'Committee rejected';
            break;
          case 'finance':
            statusText = 'Finance rejected';
            break;
          default:
            statusText = 'rejected';
        }
      }

      // Update approval record
      await storage.updateApproval(currentApproval.id, {
        approverId,
        status: statusText,
        comments,
        approvedAt: new Date(),
      });

      // Update task status
      const tasks = await storage.getTasksByUser(approverId);
      const currentTask = tasks.find(t => 
        t.requestType === requestType && 
        t.requestId === requestId && 
        t.status === 'pending'
      );

      if (currentTask) {
        await storage.updateTask(currentTask.id, {
          status: 'completed',
          completedAt: new Date(),
        });
      }

      if (action === 'approve') {
        // Special handling for Admin approval (stage 0)
        if (approver?.role === 'admin' && currentApproval.stage === 0) {
          // Admin approved - set status to "new" and move to stage 1 (manager)
          if (requestType === 'investment') {
            await storage.updateInvestmentRequest(requestId, { status: 'new' });
          }
          // Move directly to next stage (manager - stage 1) instead of restarting workflow
          await this.moveToNextStage(requestType, requestId, currentApproval.stage);
        } else {
          // Regular approval flow
          if (requestType === 'investment') {
            await storage.updateInvestmentRequest(requestId, { status: statusText });
          } else if (requestType === 'cash_request') {
            await storage.updateCashRequest(requestId, { status: statusText });
          }
          await this.moveToNextStage(requestType, requestId, currentApproval.stage);
        }
      } else if (action === 'reject') {
        // Notify previous approvers before rejecting
        if (currentApproval.stage > 0) { // Only notify if not the first stage
          await notificationService.notifyPreviousApprovers(
            requestType, 
            requestId, 
            'rejected', 
            approver?.role || 'unknown',
            comments
          );
        }
        await this.rejectRequest(requestType, requestId, approver?.role);
      } else if (action === 'changes_requested') {
        // Notify previous approvers before requesting changes
        if (currentApproval.stage > 0) { // Only notify if not the first stage
          await notificationService.notifyPreviousApprovers(
            requestType, 
            requestId, 
            'changes_requested', 
            approver?.role || 'unknown',
            comments
          );
        }
        await this.requestChanges(requestType, requestId);
      }

      return { success: true, message: 'Approval processed successfully' };
    } catch (error) {
      console.error('Error processing approval:', error);
      throw error;
    }
  }

  private async moveToNextStage(requestType: string, requestId: number, currentStage: number) {
    const workflow = this.approvalWorkflows[requestType as keyof typeof this.approvalWorkflows];
    const nextStage = workflow.find(w => w.stage === currentStage + 1);

    if (nextStage) {
      // Get current approval cycle
      let currentCycle = 1;
      if (requestType === 'investment') {
        const investment = await storage.getInvestmentRequest(requestId);
        currentCycle = investment?.currentApprovalCycle || 1;
      }

      // Create next approval record with cycle tracking
      await storage.createApproval({
        requestType,
        requestId,
        stage: nextStage.stage,
        approverId: null,
        status: 'pending',
        approvalCycle: currentCycle,
        isCurrentCycle: true,
      });

      // Create next task
      await this.createApprovalTask(requestType, requestId, nextStage.stage);
    } else {
      // Final approval - mark request as approved
      if (requestType === 'investment') {
        await storage.updateInvestmentRequest(requestId, { status: 'approved' });
      } else {
        await storage.updateCashRequest(requestId, { status: 'approved' });
      }

      // Notify requester
      await notificationService.notifyRequestApproved(requestType, requestId);
    }
  }

  private async rejectRequest(requestType: string, requestId: number, approverRole?: string) {
    // Update request status to rejected with specific role information
    let rejectionStatus = 'rejected';
    if (approverRole) {
      switch (approverRole) {
        case 'admin':
          rejectionStatus = 'admin_rejected';
          break;
        case 'manager':
          rejectionStatus = 'Manager rejected';
          break;
        case 'committee_member':
          rejectionStatus = 'Committee rejected';
          break;
        case 'finance':
          rejectionStatus = 'Finance rejected';
          break;
      }
    }

    if (requestType === 'investment') {
      await storage.updateInvestmentRequest(requestId, { 
        status: rejectionStatus, 
        currentApprovalStage: 0 // Reset to analyst level
      });
    } else if (requestType === 'cash_request') {
      await storage.updateCashRequest(requestId, { 
        status: rejectionStatus, 
        currentApprovalStage: 0 // Reset to analyst level
      });
    }

    // Get current approval cycle
    let currentCycle = 1;
    if (requestType === 'investment') {
      const investment = await storage.getInvestmentRequest(requestId);
      currentCycle = investment?.currentApprovalCycle || 1;
    }

    // Create a new approval record at stage 0 for the analyst to modify
    await storage.createApproval({
      requestType,
      requestId,
      stage: 0,
      approverId: null,
      status: 'pending',
      approvalCycle: currentCycle,
      isCurrentCycle: true,
    });

    // Send notification
    await notificationService.notifyRequestRejected(requestType, requestId);
  }

  private async requestChanges(requestType: string, requestId: number) {
    if (requestType === 'investment') {
      await storage.updateInvestmentRequest(requestId, { status: 'changes_requested' });
    } else {
      await storage.updateCashRequest(requestId, { status: 'changes_requested' });
    }

    // Create task for the initiator to address the requested changes
    await this.createChangesRequestedTask(requestType, requestId);

    // Notify requester
    await notificationService.notifyChangesRequested(requestType, requestId);
  }

  private async createApprovalTask(requestType: string, requestId: number, stage: number) {
    const workflow = this.approvalWorkflows[requestType as keyof typeof this.approvalWorkflows];
    const stageConfig = workflow.find(w => w.stage === stage);

    if (!stageConfig) return;

    // Get request details to create better task description
    let requestDetails = null;
    if (requestType === 'investment') {
      requestDetails = await storage.getInvestmentRequest(requestId);
    } else {
      requestDetails = await storage.getCashRequest(requestId);
    }

    // Find users with the required role for this stage
    const requiredRole = stageConfig.approverRole;
    console.log(`Looking for users with role: ${requiredRole}`);
    
    // Get all users and find those with the required role
    const allUsers = await storage.getAllUsers();
    const roleUsers = allUsers.filter(user => user.role === requiredRole);
    
    console.log(`Found ${roleUsers.length} users with role ${requiredRole}`);
    
    // Create descriptive task description
    let taskDescription = `Please review and approve the ${requestType.replace('_', ' ')} request.`;
    if (requestDetails && requestType === 'investment') {
      taskDescription = `${requestDetails.requestId} - ${requestDetails.investmentType} - ${requestDetails.targetCompany} - $${requestDetails.amount} - ${requestDetails.status}`;
    } else if (requestDetails && requestType === 'cash_request') {
      taskDescription = `${requestDetails.requestId} - Cash Request - $${requestDetails.amount} - ${requestDetails.status}`;
    }
    
    // Create tasks for all users with the required role
    const dueDate = new Date();
    dueDate.setHours(dueDate.getHours() + stageConfig.slaHours);

    for (const user of roleUsers) {
      await storage.createTask({
        assigneeId: user.id,
        requestType,
        requestId,
        taskType: 'approval',
        title: `Stage ${stage} Approval Required - ${requestType.replace('_', ' ')}`,
        description: taskDescription,
        dueDate,
      });
    }
    
    console.log(`Created approval tasks for ${requestType} request ${requestId}, stage ${stage}`);
  }

  private async createChangesRequestedTask(requestType: string, requestId: number) {
    // Get request details to find the initiator and create descriptive task
    let request = null;
    if (requestType === 'investment') {
      request = await storage.getInvestmentRequest(requestId);
    } else {
      request = await storage.getCashRequest(requestId);
    }

    if (!request) return;

    // Create descriptive task description
    let taskDescription = `Please address the requested changes and resubmit your ${requestType.replace('_', ' ')} request.`;
    if (requestType === 'investment') {
      taskDescription = `${request.requestId} - ${request.investmentType} - ${request.targetCompany} - $${request.amount} - Changes Required`;
    } else {
      taskDescription = `${request.requestId} - Cash Request - $${request.amount} - Changes Required`;
    }

    // Set due date (48 hours to address changes)
    const dueDate = new Date();
    dueDate.setHours(dueDate.getHours() + 48);

    // Create task for the initiator
    await storage.createTask({
      assigneeId: request.requesterId!,
      requestType,
      requestId,
      taskType: 'changes_requested',
      title: `Address Requested Changes - ${requestType.replace('_', ' ')}`,
      description: taskDescription,
      dueDate,
    });

    console.log(`Created changes requested task for ${requestType} request ${requestId} assigned to user ${request.requesterId}`);
  }

  // ============================================================================
  // LAMS Workflow Methods
  // ============================================================================

  /**
   * Transition SIA to next state
   */
  async transitionSiaState(siaId: number, newState: string, userId: number): Promise<void> {
    const workflow = this.lamsWorkflows.sia;
    
    // Get current SIA
    const sia = await storage.getSia(siaId);
    if (!sia) {
      throw new Error('SIA not found');
    }
    
    // Validate transition
    const currentState = sia.status;
    const validTransitions = workflow.transitions[currentState as keyof typeof workflow.transitions];
    
    if (!validTransitions || !validTransitions.includes(newState)) {
      throw new Error(`Invalid transition from ${currentState} to ${newState}`);
    }

    // Update SIA status (will be done by the calling service)
    // await storage.updateSia(siaId, { status: newState });

    // Create tasks if needed
    if (newState === 'hearing_scheduled') {
      // Create task for case officer to conduct hearing
      // await this.createSiaHearingTask(siaId);
    }

    // Log audit trail
    // await storage.createAuditLog(...);
  }

  /**
   * Transition Land Notification to next state
   */
  async transitionNotificationState(notificationId: number, newState: string, userId: number, comments?: string): Promise<void> {
    const workflow = this.lamsWorkflows.land_notification;
    
    // Get current notification
    const notification = await storage.getLandNotification(notificationId);
    if (!notification) {
      throw new Error('Notification not found');
    }
    
    // Validate transition
    const currentState = notification.status;
    const validTransitions = workflow.transitions[currentState as keyof typeof workflow.transitions];
    
    if (!validTransitions || !validTransitions.includes(newState)) {
      throw new Error(`Invalid transition from ${currentState} to ${newState}`);
    }
    
    // Validate transition and check permissions
    const approverRole = workflow.approverRoles[newState as keyof typeof workflow.approverRoles];
    if (approverRole) {
      // Check if user has required role
      const user = await storage.getUser(userId);
      if (user?.role !== approverRole && user?.role !== LAMS_ROLES.ADMIN) {
        throw new Error(`User does not have permission to transition to ${newState}`);
      }
    }

    // Update notification status (will be done by the calling service)
    // await storage.updateLandNotification(notificationId, { status: newState });

    // If publishing Sec 11, open objection window
    if (newState === 'published') {
      // Set objection window deadline (30 days default)
      // await storage.updateLandNotification(notificationId, { objectionDeadline: ... });
    }

    // If all objections resolved, can publish Sec 19
    if (newState === 'objection_resolved') {
      // Check if all objections are resolved
      // const unresolved = await storage.getUnresolvedObjections(notificationId);
      // if (unresolved.length === 0) {
      //   // Can publish Sec 19
      // }
    }
  }

  /**
   * Transition Award to next state
   */
  async transitionAwardState(awardId: number, newState: string, userId: number): Promise<void> {
    const workflow = this.lamsWorkflows.award;
    
    // Check permissions for finance review
    if (newState === 'fin_review' || newState === 'issued') {
      const user = await storage.getUser(userId);
      if (user?.role !== LAMS_ROLES.FINANCE_OFFICER && user?.role !== LAMS_ROLES.ADMIN) {
        throw new Error('Only finance officers can approve awards');
      }
    }

    // Update award status
    // await storage.updateAward(awardId, { status: newState });

    // If issued, generate PDFs
    if (newState === 'issued') {
      // await pdfService.generateAwardPdf(awardId);
      // await pdfService.generateLoiPdf(awardId);
    }
  }

  /**
   * Transition Possession to next state
   */
  async transitionPossessionState(possessionId: number, newState: string, userId: number): Promise<void> {
    const workflow = this.lamsWorkflows.possession;
    
    // Update possession status
    // await storage.updatePossession(possessionId, { status: newState });

    // If certificate issued, generate PDF
    if (newState === 'certificate_issued') {
      // await pdfService.generatePossessionCertificate(possessionId);
    }
  }

  /**
   * Get valid next states for a workflow
   */
  getValidNextStates(workflowType: 'sia' | 'land_notification' | 'award' | 'possession', currentState: string): string[] {
    const workflow = this.lamsWorkflows[workflowType];
    const transitions = workflow.transitions[currentState as keyof typeof workflow.transitions];
    return transitions || [];
  }
}

export const workflowService = new WorkflowService();
