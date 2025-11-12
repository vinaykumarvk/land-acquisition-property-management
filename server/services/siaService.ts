/**
 * SIA (Social Impact Assessment) Service
 * Handles SIA creation, publishing, feedback, hearings, and report generation
 */

import { storage } from "../storage";
import { workflowService } from "./workflowService";
import { pdfService } from "./pdfService";
import { notificationService } from "./notificationService";
import { InsertSia, InsertSiaFeedback, InsertSiaHearing, InsertSiaReport } from "@shared/schema";

export class SiaService {
  /**
   * Generate SIA notice number (SIA-YYYY-XXX)
   */
  private async generateNoticeNo(): Promise<string> {
    const year = new Date().getFullYear();
    const sequence = await storage.getNextSequenceValue('SIA');
    return `SIA-${year}-${sequence.toString().padStart(3, '0')}`;
  }

  /**
   * Create a new SIA
   */
  async createSia(siaData: Omit<InsertSia, 'noticeNo'>, createdBy: number): Promise<any> {
    try {
      // Convert dates to Date objects if they're strings
      const startDate = siaData.startDate instanceof Date ? siaData.startDate : new Date(siaData.startDate);
      const endDate = siaData.endDate instanceof Date ? siaData.endDate : new Date(siaData.endDate);
      
      // Validate dates
      if (endDate < startDate) {
        throw new Error('End date must be after start date');
      }

      // Generate notice number
      const noticeNo = await this.generateNoticeNo();

      // Create SIA with properly formatted dates (use Date objects, drizzle will handle conversion)
      const sia = await storage.createSia({
        ...siaData,
        startDate: startDate,
        endDate: endDate,
        noticeNo,
        createdBy,
        status: 'draft',
      });

      // Create audit log
      await storage.createAuditLog({
        userId: createdBy,
        action: 'create',
        resourceType: 'sia',
        resourceId: sia.id,
        details: { noticeNo, title: sia.title },
      });

      return sia;
    } catch (error) {
      console.error('Error creating SIA:', error);
      throw error;
    }
  }

  /**
   * Update SIA
   */
  async updateSia(siaId: number, siaData: Partial<InsertSia>, userId: number): Promise<any> {
    try {
      const existingSia = await storage.getSia(siaId);
      if (!existingSia) {
        throw new Error('SIA not found');
      }

      // Only allow updates if in draft status
      if (existingSia.status !== 'draft') {
        throw new Error('SIA can only be updated when in draft status');
      }

      // Validate dates if provided
      if (siaData.endDate || siaData.startDate) {
        const startDate = siaData.startDate ? new Date(siaData.startDate) : new Date(existingSia.startDate);
        const endDate = siaData.endDate ? new Date(siaData.endDate) : new Date(existingSia.endDate);
        
        if (endDate < startDate) {
          throw new Error('End date must be after start date');
        }
      }

      const updated = await storage.updateSia(siaId, siaData);

      // Create audit log
      await storage.createAuditLog({
        userId,
        action: 'update',
        resourceType: 'sia',
        resourceId: siaId,
        details: { changes: siaData },
      });

      return updated;
    } catch (error) {
      console.error('Error updating SIA:', error);
      throw error;
    }
  }

  /**
   * Publish SIA (make it public for citizen feedback)
   */
  async publishSia(siaId: number, userId: number): Promise<any> {
    try {
      const existingSia = await storage.getSia(siaId);
      if (!existingSia) {
        throw new Error('SIA not found');
      }

      if (existingSia.status !== 'draft') {
        throw new Error('Only draft SIAs can be published');
      }

      // Transition to published state
      await workflowService.transitionSiaState(siaId, 'published', userId);

      const updated = await storage.updateSia(siaId, {
        status: 'published',
        publishedAt: new Date(),
      });

      // Create audit log
      await storage.createAuditLog({
        userId,
        action: 'publish',
        resourceType: 'sia',
        resourceId: siaId,
        details: { noticeNo: existingSia.noticeNo },
      });

      // Notify citizens (if notification system supports public notifications)
      // This would typically send emails/SMS to registered citizens

      return updated;
    } catch (error) {
      console.error('Error publishing SIA:', error);
      throw error;
    }
  }

  /**
   * Submit citizen feedback
   */
  async submitFeedback(
    siaId: number,
    feedbackData: Omit<InsertSiaFeedback, 'siaId' | 'status'>
  ): Promise<any> {
    try {
      const existingSia = await storage.getSia(siaId);
      if (!existingSia) {
        throw new Error('SIA not found');
      }

      if (existingSia.status !== 'published') {
        throw new Error('Feedback can only be submitted for published SIAs');
      }

      // Validate feedback window
      const now = new Date();
      const startDate = new Date(existingSia.startDate);
      const endDate = new Date(existingSia.endDate);
      
      // Set endDate to end of day (23:59:59.999) to allow submissions throughout the entire day
      endDate.setHours(23, 59, 59, 999);
      
      // Set startDate to start of day (00:00:00.000) to allow submissions from the beginning of the day
      startDate.setHours(0, 0, 0, 0);
      
      if (now < startDate || now > endDate) {
        const startDateStr = startDate.toLocaleDateString('en-IN');
        const endDateStr = endDate.toLocaleDateString('en-IN');
        throw new Error(`Feedback submission is outside the allowed time window. Feedback window: ${startDateStr} to ${endDateStr}`);
      }

      // Create feedback
      const feedback = await storage.createSiaFeedback({
        ...feedbackData,
        siaId,
        status: 'received',
      });

      // Notify case officers about new feedback
      const caseOfficers = await storage.getAllUsers();
      const officers = caseOfficers.filter(u => u.role === 'case_officer' || u.role === 'admin');
      
      for (const officer of officers) {
        await notificationService.createNotification({
          userId: officer.id,
          title: 'New SIA Feedback Received',
          message: `New feedback received for SIA ${existingSia.noticeNo}: ${existingSia.title}`,
          type: 'status_update',
          relatedType: 'sia',
          relatedId: siaId,
        });
      }

      return feedback;
    } catch (error) {
      console.error('Error submitting feedback:', error);
      throw error;
    }
  }

  /**
   * Schedule a hearing
   */
  async scheduleHearing(
    siaId: number,
    hearingData: Omit<InsertSiaHearing, 'siaId'>,
    userId: number
  ): Promise<any> {
    try {
      const existingSia = await storage.getSia(siaId);
      if (!existingSia) {
        throw new Error('SIA not found');
      }

      // Convert date to Date object if it's a string
      const hearingDate = hearingData.date instanceof Date 
        ? hearingData.date 
        : new Date(hearingData.date);

      // Create hearing
      const hearing = await storage.createSiaHearing({
        ...hearingData,
        date: hearingDate,
        siaId,
      });

      // Update SIA status to hearing_scheduled
      await workflowService.transitionSiaState(siaId, 'hearing_scheduled', userId);
      await storage.updateSia(siaId, { status: 'hearing_scheduled' });

      // Create task for case officer
      await storage.createTask({
        assigneeId: userId,
        requestType: 'sia',
        requestId: siaId,
        taskType: 'approval',
        title: `Conduct SIA Hearing - ${existingSia.noticeNo}`,
        description: `Hearing scheduled for ${new Date(hearingData.date).toLocaleDateString()} at ${hearingData.venue}`,
        dueDate: new Date(hearingData.date),
      });

      // Create audit log
      await storage.createAuditLog({
        userId,
        action: 'schedule_hearing',
        resourceType: 'sia',
        resourceId: siaId,
        details: { hearingDate: hearingData.date, venue: hearingData.venue },
      });

      return hearing;
    } catch (error) {
      console.error('Error scheduling hearing:', error);
      throw error;
    }
  }

  /**
   * Complete a hearing (upload minutes)
   */
  async completeHearing(
    hearingId: number,
    minutesPath: string,
    attendees: string[],
    userId: number
  ): Promise<any> {
    try {
      const hearing = await storage.getSiaHearing(hearingId);
      if (!hearing) {
        throw new Error('Hearing not found');
      }
      const updated = await storage.updateSiaHearing(hearingId, {
        minutesPath,
        attendeesJson: attendees as any,
      });

      // Get SIA ID from original hearing (more reliable)
      const siaId = hearing.siaId;

      // Update SIA status to hearing_completed
      await workflowService.transitionSiaState(siaId, 'hearing_completed', userId);
      await storage.updateSia(siaId, { status: 'hearing_completed' });

      // Create audit log
      await storage.createAuditLog({
        userId,
        action: 'complete_hearing',
        resourceType: 'sia_hearing',
        resourceId: hearingId,
        details: { attendeesCount: attendees.length },
      });

      return updated;
    } catch (error) {
      console.error('Error completing hearing:', error);
      throw error;
    }
  }

  /**
   * Generate SIA report
   */
  async generateReport(siaId: number, userId: number): Promise<any> {
    try {
      const existingSia = await storage.getSia(siaId);
      if (!existingSia) {
        throw new Error('SIA not found');
      }

      if (existingSia.status !== 'hearing_completed') {
        throw new Error('Report can only be generated after hearing is completed');
      }

      // Get all feedback
      const feedbacks = await storage.getSiaFeedbacks(siaId);
      
      // Get all hearings
      const hearings = await storage.getSiaHearings(siaId);

      // Generate summary
      const summary = {
        totalFeedback: feedbacks.length,
        feedbackByStatus: {
          received: feedbacks.filter(f => f.status === 'received').length,
          under_review: feedbacks.filter(f => f.status === 'under_review').length,
          accepted: feedbacks.filter(f => f.status === 'accepted').length,
          rejected: feedbacks.filter(f => f.status === 'rejected').length,
        },
        hearingsCount: hearings.length,
        lastHearingDate: hearings.length > 0 ? hearings[0].date : null,
      };

      // Generate PDF report
      const { filePath, hash } = await pdfService.generateSiaReport(
        siaId,
        existingSia.title,
        existingSia.description,
        feedbacks.length,
        hearings.length > 0 ? new Date(hearings[0].date) : undefined,
        summary
      );

      // Create report record
      const report = await storage.createSiaReport({
        siaId,
        reportPdfPath: filePath,
        summaryJson: summary as any,
        generatedBy: userId,
      });

      // Update SIA status to report_generated
      await workflowService.transitionSiaState(siaId, 'report_generated', userId);
      await storage.updateSia(siaId, { status: 'report_generated' });

      // Create audit log
      await storage.createAuditLog({
        userId,
        action: 'generate_report',
        resourceType: 'sia',
        resourceId: siaId,
        details: { reportId: report.id, hash },
      });

      return report;
    } catch (error) {
      console.error('Error generating SIA report:', error);
      throw error;
    }
  }

  /**
   * Get SIA with related data
   */
  async getSiaWithDetails(siaId: number): Promise<any> {
    try {
      const sia = await storage.getSia(siaId);
      if (!sia) {
        throw new Error('SIA not found');
      }

      const feedbacks = await storage.getSiaFeedbacks(siaId);
      const hearings = await storage.getSiaHearings(siaId);
      const reports = await storage.getSiaReports(siaId);

      return {
        ...sia,
        feedbacks,
        hearings,
        reports,
        feedbackCount: feedbacks.length,
        hearingCount: hearings.length,
        reportCount: reports.length,
      };
    } catch (error) {
      console.error('Error getting SIA details:', error);
      throw error;
    }
  }

  /**
   * Get all SIAs with filters
   */
  async getSias(filters?: { status?: string; createdBy?: number }): Promise<any[]> {
    return await storage.getSias(filters);
  }

  /**
   * Close SIA
   */
  async closeSia(siaId: number, userId: number): Promise<any> {
    try {
      const existingSia = await storage.getSia(siaId);
      if (!existingSia) {
        throw new Error('SIA not found');
      }

      if (existingSia.status !== 'report_generated') {
        throw new Error('SIA can only be closed after report is generated');
      }

      await workflowService.transitionSiaState(siaId, 'closed', userId);
      const updated = await storage.updateSia(siaId, { status: 'closed' });

      // Create audit log
      await storage.createAuditLog({
        userId,
        action: 'close',
        resourceType: 'sia',
        resourceId: siaId,
        details: { noticeNo: existingSia.noticeNo },
      });

      return updated;
    } catch (error) {
      console.error('Error closing SIA:', error);
      throw error;
    }
  }
}

export const siaService = new SiaService();

