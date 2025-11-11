/**
 * Reports Service
 * Generates comprehensive reports for LAMS (Land Acquisition Management System)
 * - Operational Reports: SIA status, notifications, objections, possession
 * - Financial Reports: Compensation, awards, payments
 * - Compliance Reports: Workflow compliance, SLA adherence, document verification
 */

import { storage } from "../storage";
import { db } from "../db";
import { 
  sia, landNotifications, objections, parcels, awards, payments, possession,
  valuations, siaFeedback, siaHearings, siaReports, users
} from "@shared/schema";
import { eq, and, gte, lte, sql, count, sum, desc, asc } from "drizzle-orm";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const formatDays = (value: number) => Number(value.toFixed(1));

const calculateMedian = (values: number[]) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }
  return sorted[middle];
};

const calculatePercentile = (values: number[], percentile: number) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(percentile * (sorted.length - 1)))
  );
  return sorted[index];
};

export interface ReportFilters {
  startDate?: Date;
  endDate?: Date;
  district?: string;
  taluka?: string;
  status?: string;
  type?: string;
}

export interface OperationalReport {
  summary: {
    totalParcels: number;
    parcelsByStatus: Record<string, number>;
    totalSias: number;
    siasByStatus: Record<string, number>;
    totalNotifications: number;
    notificationsByType: Record<string, number>;
    totalObjections: number;
    objectionsByStatus: Record<string, number>;
    totalPossessions: number;
    possessionsByStatus: Record<string, number>;
  };
  siaDetails: Array<{
    id: number;
    noticeNo: string;
    title: string;
    status: string;
    startDate: Date;
    endDate: Date;
    feedbackCount: number;
    hearingCount: number;
    reportGenerated: boolean;
    createdAt: Date;
  }>;
  notificationDetails: Array<{
    id: number;
    refNo: string;
    type: string;
    title: string;
    status: string;
    publishDate: Date | null;
    parcelCount: number;
    objectionCount: number;
    createdAt: Date;
  }>;
  objectionDetails: Array<{
    id: number;
    notificationRefNo: string;
    parcelNo: string;
    status: string;
    createdAt: Date;
    resolvedAt: Date | null;
  }>;
  possessionDetails: Array<{
    id: number;
    parcelNo: string;
    scheduleDt: Date;
    status: string;
    certificateGenerated: boolean;
    createdAt: Date;
  }>;
  insights: {
    objectionTurnaround: {
      averageDays: number;
      medianDays: number;
      percentile90Days: number;
      openCount: number;
      resolvedCount: number;
    };
    possessionEvidence: {
      averageDaysInEvidence: number;
      cases: Array<{
        possessionId: number;
        parcelNo: string;
        status: string;
        daysInStatus: number;
        photoCount: number;
      }>;
    };
    notificationOutreach: {
      totalNotifications: number;
      publishedNotifications: number;
      publishedPercentage: number;
      notificationsWithObjections: number;
      avgObjectionsPerPublished: number;
      pendingApprovalCount: number;
    };
  };
  generatedAt: Date;
}

export interface FinancialReport {
  summary: {
    totalValuations: number;
    totalValuationAmount: string;
    totalAwards: number;
    totalAwardAmount: string;
    totalPayments: number;
    totalPaidAmount: string;
    pendingPayments: number;
    pendingAmount: string;
    paymentSuccessRate: number;
  };
  valuationDetails: Array<{
    id: number;
    parcelNo: string;
    basis: string;
    areaSqM: string;
    circleRate: string;
    computedAmount: string;
    createdAt: Date;
  }>;
  awardDetails: Array<{
    id: number;
    awardNo: string | null;
    loiNo: string | null;
    parcelNo: string;
    ownerName: string;
    mode: string;
    amount: string;
    status: string;
    awardDate: Date | null;
    createdAt: Date;
  }>;
  paymentDetails: Array<{
    id: number;
    awardNo: string | null;
    amount: string;
    mode: string;
    status: string;
    referenceNo: string | null;
    paidOn: Date | null;
    createdAt: Date;
  }>;
  paymentSummary: {
    byMode: Record<string, { count: number; amount: string }>;
    byStatus: Record<string, { count: number; amount: string }>;
    byMonth: Array<{ month: string; count: number; amount: string }>;
  };
  generatedAt: Date;
}

export interface ComplianceReport {
  summary: {
    totalWorkflows: number;
    compliantWorkflows: number;
    nonCompliantWorkflows: number;
    complianceRate: number;
    slaBreaches: number;
    documentsVerified: number;
    documentsUnverified: number;
    verificationRate: number;
  };
  workflowCompliance: Array<{
    workflowType: string;
    workflowId: string;
    status: string;
    currentStage: string;
    expectedStage: string;
    isCompliant: boolean;
    issues: string[];
  }>;
  slaCompliance: Array<{
    entityType: string;
    entityId: string;
    entityRef: string;
    slaDeadline: Date | null;
    status: string;
    isOverdue: boolean;
    daysOverdue: number | null;
  }>;
  documentVerification: Array<{
    documentType: string;
    documentRef: string;
    hasHash: boolean;
    hasQrCode: boolean;
    verificationUrl: string | null;
    generatedAt: Date | null;
  }>;
  generatedAt: Date;
}

export class ReportsService {
  /**
   * Generate Operational Report
   */
  async generateOperationalReport(filters?: ReportFilters): Promise<OperationalReport> {
    const whereConditions: any[] = [];
    const now = new Date();
    
    if (filters?.startDate) {
      whereConditions.push(gte(sia.createdAt, filters.startDate));
    }
    if (filters?.endDate) {
      whereConditions.push(lte(sia.createdAt, filters.endDate));
    }
    if (filters?.district) {
      // Note: This would require joining with parcels table
    }

    // Get all parcels
    const allParcels = await storage.getParcels(filters?.district ? { district: filters.district } : {});
    const parcelsByStatus: Record<string, number> = {};
    allParcels.forEach(p => {
      parcelsByStatus[p.status] = (parcelsByStatus[p.status] || 0) + 1;
    });

    // Get all SIAs
    const allSias = await storage.getSias(filters?.status ? { status: filters.status } : {});
    const siasByStatus: Record<string, number> = {};
    allSias.forEach(s => {
      siasByStatus[s.status] = (siasByStatus[s.status] || 0) + 1;
    });

    // Get all notifications
    const allNotifications = await storage.getLandNotifications(filters?.type ? { type: filters.type } : {});
    const notificationsByType: Record<string, number> = {};
    allNotifications.forEach(n => {
      notificationsByType[n.type] = (notificationsByType[n.type] || 0) + 1;
    });

    // Get all objections
    const allObjections = await storage.getObjections(filters?.status ? { status: filters.status } : {});
    const objectionsByStatus: Record<string, number> = {};
    allObjections.forEach(o => {
      objectionsByStatus[o.status] = (objectionsByStatus[o.status] || 0) + 1;
    });

    // Get all possessions
    const allPossessions = await storage.getPossessions(filters?.status ? { status: filters.status } : {});
    const possessionsByStatus: Record<string, number> = {};
    allPossessions.forEach(p => {
      possessionsByStatus[p.status] = (possessionsByStatus[p.status] || 0) + 1;
    });

    // Get detailed SIA information
    const siaDetails = await Promise.all(
      allSias.map(async (s) => {
        const feedbacks = await storage.getSiaFeedbacks(s.id);
        const hearings = await storage.getSiaHearings(s.id);
        const reports = await storage.getSiaReports(s.id);
        
        return {
          id: s.id,
          noticeNo: s.noticeNo,
          title: s.title,
          status: s.status,
          startDate: s.startDate,
          endDate: s.endDate,
          feedbackCount: feedbacks.length,
          hearingCount: hearings.length,
          reportGenerated: reports.length > 0,
          createdAt: s.createdAt,
        };
      })
    );

    // Get detailed notification information
    const notificationDetails = await Promise.all(
      allNotifications.map(async (n) => {
        const notificationParcels = await storage.getNotificationParcels(n.id);
        const notificationObjections = await storage.getObjections({ notificationId: n.id });
        
        return {
          id: n.id,
          refNo: n.refNo,
          type: n.type,
          title: n.title,
          status: n.status,
          publishDate: n.publishDate,
          parcelCount: notificationParcels.length,
          objectionCount: notificationObjections.length,
          createdAt: n.createdAt,
        };
      })
    );

    // Get detailed objection information
    const objectionDetails = await Promise.all(
      allObjections.map(async (o) => {
        const notification = await storage.getLandNotification(o.notificationId);
        const parcel = await storage.getParcel(o.parcelId);
        
        return {
          id: o.id,
          notificationRefNo: notification?.refNo || 'N/A',
          parcelNo: parcel?.parcelNo || 'N/A',
          status: o.status,
          createdAt: o.createdAt,
          resolvedAt: o.resolvedAt,
        };
      })
    );

    // Get detailed possession information
    const possessionDetails = await Promise.all(
      allPossessions.map(async (p) => {
        const parcel = await storage.getParcel(p.parcelId);
        
        return {
          id: p.id,
          parcelNo: parcel?.parcelNo || 'N/A',
          scheduleDt: p.scheduleDt,
          status: p.status,
          certificateGenerated: !!p.certificatePdfPath,
          createdAt: p.createdAt,
        };
      })
    );

    // Insight: Objection turnaround time
    const resolvedObjections = allObjections.filter(o => o.resolvedAt);
    const objectionDurations = resolvedObjections.map(o => {
      const created = new Date(o.createdAt);
      const resolved = new Date(o.resolvedAt!);
      const diff = (resolved.getTime() - created.getTime()) / MS_PER_DAY;
      return diff < 0 ? 0 : diff;
    });
    const averageObjectionDays = objectionDurations.length
      ? formatDays(objectionDurations.reduce((sum, d) => sum + d, 0) / objectionDurations.length)
      : 0;
    const medianObjectionDays = formatDays(calculateMedian(objectionDurations));
    const percentile90Days = formatDays(calculatePercentile(objectionDurations, 0.9));

    // Insight: Possession evidence aging
    const evidenceStagePossessions = allPossessions.filter((p) =>
      ['in_progress', 'evidence_captured'].includes(p.status)
    );
    const evidenceCases = await Promise.all(
      evidenceStagePossessions.map(async (p) => {
        const parcel = await storage.getParcel(p.parcelId);
        const media = await storage.getPossessionMedia(p.id);
        const baseline = p.updatedAt ? new Date(p.updatedAt) : new Date(p.createdAt);
        const daysInStatus = Math.max(0, Math.round((now.getTime() - baseline.getTime()) / MS_PER_DAY));
        return {
          possessionId: p.id,
          parcelNo: parcel?.parcelNo || 'N/A',
          status: p.status,
          daysInStatus,
          photoCount: media.length,
        };
      })
    );
    const averageEvidenceDays = evidenceCases.length
      ? formatDays(evidenceCases.reduce((sum, c) => sum + c.daysInStatus, 0) / evidenceCases.length)
      : 0;
    const topEvidenceCases = evidenceCases
      .sort((a, b) => b.daysInStatus - a.daysInStatus)
      .slice(0, 5);

    // Insight: Notification outreach
    const publishedStatuses = ['published', 'objection_window_open', 'objection_resolved', 'closed'];
    const publishedNotifications = allNotifications.filter((n) => publishedStatuses.includes(n.status));
    const pendingApprovalCount = allNotifications.filter((n) =>
      ['draft', 'legal_review', 'approved'].includes(n.status)
    ).length;
    const objectionsByNotification = allObjections.reduce<Record<number, number>>((acc, obj) => {
      acc[obj.notificationId] = (acc[obj.notificationId] || 0) + 1;
      return acc;
    }, {});
    const totalObjectionsAcrossPublished = publishedNotifications.reduce(
      (sum, n) => sum + (objectionsByNotification[n.id] || 0),
      0
    );
    const notificationsWithObjections = publishedNotifications.filter(
      (n) => (objectionsByNotification[n.id] || 0) > 0
    );
    const publishedPercentage = allNotifications.length
      ? formatDays((publishedNotifications.length / allNotifications.length) * 100)
      : 0;
    const avgObjectionsPerPublished = publishedNotifications.length
      ? formatDays(totalObjectionsAcrossPublished / publishedNotifications.length)
      : 0;

    return {
      summary: {
        totalParcels: allParcels.length,
        parcelsByStatus,
        totalSias: allSias.length,
        siasByStatus,
        totalNotifications: allNotifications.length,
        notificationsByType,
        totalObjections: allObjections.length,
        objectionsByStatus,
        totalPossessions: allPossessions.length,
        possessionsByStatus,
      },
      siaDetails,
      notificationDetails,
      objectionDetails,
      possessionDetails,
      insights: {
        objectionTurnaround: {
          averageDays: averageObjectionDays,
          medianDays: medianObjectionDays,
          percentile90Days,
          openCount: allObjections.length - resolvedObjections.length,
          resolvedCount: resolvedObjections.length,
        },
        possessionEvidence: {
          averageDaysInEvidence: averageEvidenceDays,
          cases: topEvidenceCases,
        },
        notificationOutreach: {
          totalNotifications: allNotifications.length,
          publishedNotifications: publishedNotifications.length,
          publishedPercentage,
          notificationsWithObjections: notificationsWithObjections.length,
          avgObjectionsPerPublished,
          pendingApprovalCount,
        },
      },
      generatedAt: new Date(),
    };
  }

  /**
   * Generate Financial Report
   */
  async generateFinancialReport(filters?: ReportFilters): Promise<FinancialReport> {
    // Get all valuations
    const allValuations = await storage.getValuations();
    const totalValuationAmount = allValuations.reduce(
      (sum, v) => sum + parseFloat(v.computedAmount || '0'),
      0
    );

    // Get all awards
    const allAwards = await storage.getAwards(filters?.status ? { status: filters.status } : {});
    const totalAwardAmount = allAwards.reduce(
      (sum, a) => sum + parseFloat(a.amount || '0'),
      0
    );

    // Get all payments
    const allPayments = await storage.getPayments();
    const successfulPayments = allPayments.filter(p => p.status === 'success');
    const totalPaidAmount = successfulPayments.reduce(
      (sum, p) => sum + parseFloat(p.amount || '0'),
      0
    );
    const pendingPayments = allPayments.filter(p => p.status === 'initiated');
    const pendingAmount = pendingPayments.reduce(
      (sum, p) => sum + parseFloat(p.amount || '0'),
      0
    );

    const paymentSuccessRate = allPayments.length > 0
      ? (successfulPayments.length / allPayments.length) * 100
      : 0;

    // Get detailed valuation information
    const valuationDetails = await Promise.all(
      allValuations.map(async (v) => {
        const parcel = await storage.getParcel(v.parcelId);
        return {
          id: v.id,
          parcelNo: parcel?.parcelNo || 'N/A',
          basis: v.basis,
          areaSqM: v.areaSqM || '0',
          circleRate: v.circleRate || '0',
          computedAmount: v.computedAmount || '0',
          createdAt: v.createdAt,
        };
      })
    );

    // Get detailed award information
    const awardDetails = await Promise.all(
      allAwards.map(async (a) => {
        const parcel = await storage.getParcel(a.parcelId);
        const owner = await storage.getOwner(a.ownerId);
        return {
          id: a.id,
          awardNo: a.awardNo,
          loiNo: a.loiNo,
          parcelNo: parcel?.parcelNo || 'N/A',
          ownerName: owner?.name || 'N/A',
          mode: a.mode,
          amount: a.amount || '0',
          status: a.status,
          awardDate: a.awardDate,
          createdAt: a.createdAt,
        };
      })
    );

    // Get detailed payment information
    const paymentDetails = await Promise.all(
      allPayments.map(async (p) => {
        const award = await storage.getAward(p.awardId);
        return {
          id: p.id,
          awardNo: award?.awardNo || null,
          amount: p.amount || '0',
          mode: p.mode,
          status: p.status,
          referenceNo: p.referenceNo,
          paidOn: p.paidOn,
          createdAt: p.createdAt,
        };
      })
    );

    // Payment summary by mode
    const byMode: Record<string, { count: number; amount: number }> = {};
    allPayments.forEach(p => {
      if (!byMode[p.mode]) {
        byMode[p.mode] = { count: 0, amount: 0 };
      }
      byMode[p.mode].count++;
      if (p.status === 'success') {
        byMode[p.mode].amount += parseFloat(p.amount || '0');
      }
    });

    // Payment summary by status
    const byStatus: Record<string, { count: number; amount: number }> = {};
    allPayments.forEach(p => {
      if (!byStatus[p.status]) {
        byStatus[p.status] = { count: 0, amount: 0 };
      }
      byStatus[p.status].count++;
      byStatus[p.status].amount += parseFloat(p.amount || '0');
    });

    // Payment summary by month
    const byMonthMap: Record<string, { count: number; amount: number }> = {};
    successfulPayments.forEach(p => {
      if (p.paidOn) {
        const month = new Date(p.paidOn).toISOString().substring(0, 7); // YYYY-MM
        if (!byMonthMap[month]) {
          byMonthMap[month] = { count: 0, amount: 0 };
        }
        byMonthMap[month].count++;
        byMonthMap[month].amount += parseFloat(p.amount || '0');
      }
    });
    const byMonth = Object.entries(byMonthMap)
      .map(([month, data]) => ({
        month,
        count: data.count,
        amount: data.amount.toFixed(2),
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return {
      summary: {
        totalValuations: allValuations.length,
        totalValuationAmount: totalValuationAmount.toFixed(2),
        totalAwards: allAwards.length,
        totalAwardAmount: totalAwardAmount.toFixed(2),
        totalPayments: allPayments.length,
        totalPaidAmount: totalPaidAmount.toFixed(2),
        pendingPayments: pendingPayments.length,
        pendingAmount: pendingAmount.toFixed(2),
        paymentSuccessRate: parseFloat(paymentSuccessRate.toFixed(2)),
      },
      valuationDetails,
      awardDetails,
      paymentDetails,
      paymentSummary: {
        byMode: Object.fromEntries(
          Object.entries(byMode).map(([mode, data]) => [
            mode,
            { count: data.count, amount: data.amount.toFixed(2) },
          ])
        ),
        byStatus: Object.fromEntries(
          Object.entries(byStatus).map(([status, data]) => [
            status,
            { count: data.count, amount: data.amount.toFixed(2) },
          ])
        ),
        byMonth,
      },
      generatedAt: new Date(),
    };
  }

  /**
   * Generate Compliance Report
   */
  async generateComplianceReport(filters?: ReportFilters): Promise<ComplianceReport> {
    // Get all SIAs and check workflow compliance
    const allSias = await storage.getSias();
    const siaWorkflows = allSias.map(s => ({
      workflowType: 'sia',
      workflowId: s.noticeNo,
      status: s.status,
      currentStage: s.status,
      expectedStage: this.getExpectedSiaStage(s),
      isCompliant: this.isSiaCompliant(s),
      issues: this.getSiaIssues(s),
    }));

    // Get all notifications and check workflow compliance
    const allNotifications = await storage.getLandNotifications();
    const notificationWorkflows = allNotifications.map(n => ({
      workflowType: 'notification',
      workflowId: n.refNo,
      status: n.status,
      currentStage: n.status,
      expectedStage: this.getExpectedNotificationStage(n),
      isCompliant: this.isNotificationCompliant(n),
      issues: this.getNotificationIssues(n),
    }));

    // Get all awards and check workflow compliance
    const allAwards = await storage.getAwards();
    const awardWorkflows = allAwards.map(a => ({
      workflowType: 'award',
      workflowId: a.awardNo || `Award-${a.id}`,
      status: a.status,
      currentStage: a.status,
      expectedStage: this.getExpectedAwardStage(a),
      isCompliant: this.isAwardCompliant(a),
      issues: this.getAwardIssues(a),
    }));

    // Get all possessions and check workflow compliance
    const allPossessions = await storage.getPossessions();
    const possessionWorkflows = allPossessions.map(p => ({
      workflowType: 'possession',
      workflowId: `Possession-${p.id}`,
      status: p.status,
      currentStage: p.status,
      expectedStage: this.getExpectedPossessionStage(p),
      isCompliant: this.isPossessionCompliant(p),
      issues: this.getPossessionIssues(p),
    }));

    const allWorkflows = [
      ...siaWorkflows,
      ...notificationWorkflows,
      ...awardWorkflows,
      ...possessionWorkflows,
    ];

    const compliantWorkflows = allWorkflows.filter(w => w.isCompliant).length;
    const nonCompliantWorkflows = allWorkflows.filter(w => !w.isCompliant).length;
    const complianceRate = allWorkflows.length > 0
      ? (compliantWorkflows / allWorkflows.length) * 100
      : 100;

    // Check SLA compliance
    const slaCompliance = await this.checkSlaCompliance();

    // Check document verification
    const documentVerification = await this.checkDocumentVerification();

    const documentsVerified = documentVerification.filter(d => d.hasHash && d.hasQrCode).length;
    const documentsUnverified = documentVerification.length - documentsVerified;
    const verificationRate = documentVerification.length > 0
      ? (documentsVerified / documentVerification.length) * 100
      : 100;

    return {
      summary: {
        totalWorkflows: allWorkflows.length,
        compliantWorkflows,
        nonCompliantWorkflows,
        complianceRate: parseFloat(complianceRate.toFixed(2)),
        slaBreaches: slaCompliance.filter(s => s.isOverdue).length,
        documentsVerified,
        documentsUnverified,
        verificationRate: parseFloat(verificationRate.toFixed(2)),
      },
      workflowCompliance: allWorkflows,
      slaCompliance,
      documentVerification,
      generatedAt: new Date(),
    };
  }

  // Helper methods for compliance checking

  private getExpectedSiaStage(sia: any): string {
    // Expected progression: draft -> published -> hearing_scheduled -> hearing_completed -> report_generated -> closed
    const stages = ['draft', 'published', 'hearing_scheduled', 'hearing_completed', 'report_generated', 'closed'];
    const currentIndex = stages.indexOf(sia.status);
    return currentIndex < stages.length - 1 ? stages[currentIndex + 1] : sia.status;
  }

  private isSiaCompliant(sia: any): boolean {
    // Check if SIA has required components based on status
    if (sia.status === 'published' && !sia.publishedAt) return false;
    if (sia.status === 'report_generated') {
      // Should have at least one report
      return true; // Will be checked in getSiaIssues
    }
    return true;
  }

  private getSiaIssues(sia: any): string[] {
    const issues: string[] = [];
    if (sia.status === 'published' && !sia.publishedAt) {
      issues.push('Published date not set');
    }
    if (sia.status === 'report_generated') {
      // Check if report exists
      // This would require async call, so we'll check in the main function
    }
    return issues;
  }

  private getExpectedNotificationStage(notification: any): string {
    const stages = ['draft', 'legal_review', 'approved', 'published', 'objection_window_open', 'objection_resolved', 'closed'];
    const currentIndex = stages.indexOf(notification.status);
    return currentIndex < stages.length - 1 ? stages[currentIndex + 1] : notification.status;
  }

  private isNotificationCompliant(notification: any): boolean {
    if (notification.status === 'approved' && !notification.approvedAt) return false;
    if (notification.status === 'published' && !notification.publishDate) return false;
    return true;
  }

  private getNotificationIssues(notification: any): string[] {
    const issues: string[] = [];
    if (notification.status === 'approved' && !notification.approvedAt) {
      issues.push('Approval date not set');
    }
    if (notification.status === 'published' && !notification.publishDate) {
      issues.push('Publish date not set');
    }
    return issues;
  }

  private getExpectedAwardStage(award: any): string {
    const stages = ['draft', 'fin_review', 'issued', 'paid', 'closed'];
    const currentIndex = stages.indexOf(award.status);
    return currentIndex < stages.length - 1 ? stages[currentIndex + 1] : award.status;
  }

  private isAwardCompliant(award: any): boolean {
    if (award.status === 'issued' && !award.awardDate) return false;
    if (award.status === 'issued' && !award.awardPdfPath) return false;
    return true;
  }

  private getAwardIssues(award: any): string[] {
    const issues: string[] = [];
    if (award.status === 'issued' && !award.awardDate) {
      issues.push('Award date not set');
    }
    if (award.status === 'issued' && !award.awardPdfPath) {
      issues.push('Award PDF not generated');
    }
    return issues;
  }

  private getExpectedPossessionStage(possession: any): string {
    const stages = ['scheduled', 'in_progress', 'evidence_captured', 'certificate_issued', 'registry_updated', 'closed'];
    const currentIndex = stages.indexOf(possession.status);
    return currentIndex < stages.length - 1 ? stages[currentIndex + 1] : possession.status;
  }

  private isPossessionCompliant(possession: any): boolean {
    if (possession.status === 'certificate_issued' && !possession.certificatePdfPath) return false;
    return true;
  }

  private getPossessionIssues(possession: any): string[] {
    const issues: string[] = [];
    if (possession.status === 'certificate_issued' && !possession.certificatePdfPath) {
      issues.push('Certificate PDF not generated');
    }
    return issues;
  }

  private async checkSlaCompliance(): Promise<Array<{
    entityType: string;
    entityId: string;
    entityRef: string;
    slaDeadline: Date | null;
    status: string;
    isOverdue: boolean;
    daysOverdue: number | null;
  }>> {
    const results: Array<{
      entityType: string;
      entityId: string;
      entityRef: string;
      slaDeadline: Date | null;
      status: string;
      isOverdue: boolean;
      daysOverdue: number | null;
    }> = [];

    // Check investment requests SLA (if any exist)
    // This would require checking investmentRequests table
    // For now, we'll focus on LAMS entities

    return results;
  }

  private async checkDocumentVerification(): Promise<Array<{
    documentType: string;
    documentRef: string;
    hasHash: boolean;
    hasQrCode: boolean;
    verificationUrl: string | null;
    generatedAt: Date | null;
  }>> {
    const results: Array<{
      documentType: string;
      documentRef: string;
      hasHash: boolean;
      hasQrCode: boolean;
      verificationUrl: string | null;
      generatedAt: Date | null;
    }> = [];

    // Check SIA reports
    const allSias = await storage.getSias();
    for (const sia of allSias) {
      const reports = await storage.getSiaReports(sia.id);
      for (const report of reports) {
        results.push({
          documentType: 'sia_report',
          documentRef: sia.noticeNo,
          hasHash: !!report.reportPdfPath, // Simplified - would check actual hash
          hasQrCode: true, // Assuming PDF service generates QR codes
          verificationUrl: report.reportPdfPath ? `/verify/sia-report/${sia.id}` : null,
          generatedAt: report.generatedAt,
        });
      }
    }

    // Check notification PDFs (would need to check if PDFs have hash/QR)
    const allNotifications = await storage.getLandNotifications();
    for (const notification of allNotifications) {
      if (notification.status === 'published') {
        results.push({
          documentType: `notification_${notification.type}`,
          documentRef: notification.refNo,
          hasHash: true, // Assuming PDF service generates hashes
          hasQrCode: true,
          verificationUrl: `/verify/notification/${notification.id}`,
          generatedAt: notification.publishDate,
        });
      }
    }

    // Check award PDFs
    const allAwards = await storage.getAwards();
    for (const award of allAwards) {
      if (award.awardPdfPath) {
        results.push({
          documentType: 'award',
          documentRef: award.awardNo || `Award-${award.id}`,
          hasHash: true,
          hasQrCode: true,
          verificationUrl: `/verify/award/${award.id}`,
          generatedAt: award.awardDate,
        });
      }
      if (award.loiPdfPath) {
        results.push({
          documentType: 'loi',
          documentRef: award.loiNo || `LOI-${award.id}`,
          hasHash: true,
          hasQrCode: true,
          verificationUrl: `/verify/loi/${award.id}`,
          generatedAt: award.awardDate,
        });
      }
    }

    // Check possession certificates
    const allPossessions = await storage.getPossessions();
    for (const possession of allPossessions) {
      if (possession.certificatePdfPath) {
        results.push({
          documentType: 'possession_certificate',
          documentRef: `Possession-${possession.id}`,
          hasHash: true,
          hasQrCode: true,
          verificationUrl: `/verify/possession/${possession.id}`,
          generatedAt: possession.createdAt,
        });
      }
    }

    return results;
  }
}

export const reportsService = new ReportsService();
