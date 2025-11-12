/**
 * PMS Analytics Service
 * Provides analytics and insights for Property Management System
 * - Scheme funnel analytics
 * - Draw statistics and allotment rates
 * - Receivables and aging analysis
 * - Service request SLA compliance
 * - Registration volumes by deed type
 */

import { storage } from "../../storage";
import { db } from "../../db";
import {
  schemes,
  applications,
  allotments,
  demandNotes,
  pmsPayments,
  receipts,
  refunds,
  serviceRequests,
  waterConnections,
  sewerageConnections,
  registrationCases,
  properties,
} from "@shared/schema";
import { eq, and, gte, lte, sql, count, sum, desc, asc } from "drizzle-orm";

export interface AnalyticsFilters {
  startDate?: Date;
  endDate?: Date;
  schemeId?: number;
  status?: string;
}

export interface SchemeFunnelAnalytics {
  schemeId: number;
  schemeName: string;
  totalApplications: number;
  verifiedApplications: number;
  inDrawApplications: number;
  selectedApplications: number;
  allottedApplications: number;
  conversionRate: number; // selected to allotted
  rejectionRate: number;
  funnel: {
    stage: string;
    count: number;
    percentage: number;
  }[];
}

export interface DrawStatistics {
  schemeId: number;
  schemeName: string;
  totalDraws: number;
  totalApplicationsInDraw: number;
  totalSelected: number;
  selectionRate: number;
  averageScore: number;
  drawDetails: Array<{
    drawDate: Date;
    applicationsCount: number;
    selectedCount: number;
    selectionRate: number;
  }>;
}

export interface ReceivablesAnalytics {
  totalDemandNotes: number;
  totalDemandAmount: string;
  paidDemandNotes: number;
  paidAmount: string;
  pendingDemandNotes: number;
  pendingAmount: string;
  overdueDemandNotes: number;
  overdueAmount: string;
  collectionRate: number; // percentage
  agingAnalysis: {
    bucket: string; // 0-30 days, 31-60 days, 61-90 days, 90+ days
    count: number;
    amount: string;
  }[];
}

export interface SLAAnalytics {
  serviceRequests: {
    total: number;
    onTime: number;
    overdue: number;
    complianceRate: number;
    averageResolutionTime: number; // in hours
    byStatus: Record<string, { count: number; slaCompliance: number }>;
  };
  waterConnections: {
    total: number;
    onTime: number;
    overdue: number;
    complianceRate: number;
  };
  sewerageConnections: {
    total: number;
    onTime: number;
    overdue: number;
    complianceRate: number;
  };
  registrationCases: {
    total: number;
    onTime: number;
    overdue: number;
    complianceRate: number;
  };
}

export interface RegistrationVolumes {
  totalCases: number;
  byDeedType: Record<string, number>;
  byStatus: Record<string, number>;
  averageProcessingTime: number; // in days
  monthlyTrends: Array<{
    month: string;
    count: number;
    byDeedType: Record<string, number>;
  }>;
}

export class PMSAnalyticsService {
  /**
   * Get scheme funnel analytics
   */
  async getSchemeFunnelAnalytics(
    filters?: AnalyticsFilters
  ): Promise<SchemeFunnelAnalytics[]> {
    try {
      const allSchemes = await storage.getSchemes(
        filters?.schemeId ? { status: undefined } : {}
      );
      const results: SchemeFunnelAnalytics[] = [];

      for (const scheme of allSchemes) {
        if (filters?.schemeId && scheme.id !== filters.schemeId) continue;

        const schemeApplications = await storage.getApplications({
          schemeId: scheme.id,
        });

        // Filter by date if provided
        let filteredApplications = schemeApplications;
        if (filters?.startDate || filters?.endDate) {
          filteredApplications = schemeApplications.filter((app) => {
            const appDate = app.createdAt ? new Date(app.createdAt) : new Date();
            if (filters.startDate && appDate < filters.startDate) return false;
            if (filters.endDate && appDate > filters.endDate) return false;
            return true;
          });
        }

        const total = filteredApplications.length;
        const verified = filteredApplications.filter(
          (a) => a.status === "verified"
        ).length;
        const inDraw = filteredApplications.filter(
          (a) => a.status === "in_draw"
        ).length;
        const selected = filteredApplications.filter(
          (a) => a.status === "selected"
        ).length;
        const allotted = filteredApplications.filter(
          (a) => a.status === "allotted"
        ).length;
        const rejected = filteredApplications.filter(
          (a) => a.status === "rejected"
        ).length;

        const conversionRate =
          selected > 0 ? (allotted / selected) * 100 : 0;
        const rejectionRate = total > 0 ? (rejected / total) * 100 : 0;

        const funnel = [
          { stage: "Applied", count: total, percentage: 100 },
          {
            stage: "Verified",
            count: verified,
            percentage: total > 0 ? (verified / total) * 100 : 0,
          },
          {
            stage: "In Draw",
            count: inDraw,
            percentage: total > 0 ? (inDraw / total) * 100 : 0,
          },
          {
            stage: "Selected",
            count: selected,
            percentage: total > 0 ? (selected / total) * 100 : 0,
          },
          {
            stage: "Allotted",
            count: allotted,
            percentage: total > 0 ? (allotted / total) * 100 : 0,
          },
        ];

        results.push({
          schemeId: scheme.id,
          schemeName: scheme.name,
          totalApplications: total,
          verifiedApplications: verified,
          inDrawApplications: inDraw,
          selectedApplications: selected,
          allottedApplications: allotted,
          conversionRate,
          rejectionRate,
          funnel,
        });
      }

      return results;
    } catch (error) {
      console.error("Error getting scheme funnel analytics:", error);
      throw error;
    }
  }

  /**
   * Get draw statistics
   */
  async getDrawStatistics(
    filters?: AnalyticsFilters
  ): Promise<DrawStatistics[]> {
    try {
      const allSchemes = await storage.getSchemes(
        filters?.schemeId ? { status: undefined } : {}
      );
      const results: DrawStatistics[] = [];

      for (const scheme of allSchemes) {
        if (filters?.schemeId && scheme.id !== filters.schemeId) continue;

        const schemeApplications = await storage.getApplications({
          schemeId: scheme.id,
        });

        // Filter by date if provided
        let filteredApplications = schemeApplications;
        if (filters?.startDate || filters?.endDate) {
          filteredApplications = schemeApplications.filter((app) => {
            const appDate = app.createdAt ? new Date(app.createdAt) : new Date();
            if (filters.startDate && appDate < filters.startDate) return false;
            if (filters.endDate && appDate > filters.endDate) return false;
            return true;
          });
        }

        const inDrawApps = filteredApplications.filter(
          (a) => a.status === "in_draw" || a.status === "selected"
        );
        const selectedApps = filteredApplications.filter(
          (a) => a.status === "selected"
        );

        // Calculate average score
        const scores = inDrawApps
          .map((a) => (a.score ? Number(a.score) : 0))
          .filter((s) => s > 0);
        const averageScore =
          scores.length > 0
            ? scores.reduce((sum, s) => sum + s, 0) / scores.length
            : 0;

        // Group by draw (simplified - in production, you'd track actual draw events)
        const drawDetails = [
          {
            drawDate: new Date(),
            applicationsCount: inDrawApps.length,
            selectedCount: selectedApps.length,
            selectionRate:
              inDrawApps.length > 0
                ? (selectedApps.length / inDrawApps.length) * 100
                : 0,
          },
        ];

        results.push({
          schemeId: scheme.id,
          schemeName: scheme.name,
          totalDraws: 1, // Simplified
          totalApplicationsInDraw: inDrawApps.length,
          totalSelected: selectedApps.length,
          selectionRate:
            inDrawApps.length > 0
              ? (selectedApps.length / inDrawApps.length) * 100
              : 0,
          averageScore,
          drawDetails,
        });
      }

      return results;
    } catch (error) {
      console.error("Error getting draw statistics:", error);
      throw error;
    }
  }

  /**
   * Get receivables and aging analysis
   */
  async getReceivablesAnalytics(
    filters?: AnalyticsFilters
  ): Promise<ReceivablesAnalytics> {
    try {
      const allDemandNotes = await storage.getDemandNotes();

      // Filter by date if provided
      let filteredDemandNotes = allDemandNotes;
      if (filters?.startDate || filters?.endDate) {
        filteredDemandNotes = allDemandNotes.filter((dn) => {
          const dnDate = dn.createdAt ? new Date(dn.createdAt) : new Date();
          if (filters.startDate && dnDate < filters.startDate) return false;
          if (filters.endDate && dnDate > filters.endDate) return false;
          return true;
        });
      }

      const totalDemandNotes = filteredDemandNotes.length;
      let totalDemandAmount = 0;
      let paidAmount = 0;
      let pendingAmount = 0;
      let overdueAmount = 0;
      let paidCount = 0;
      let pendingCount = 0;
      let overdueCount = 0;

      const now = new Date();
      const agingBuckets: Record<
        string,
        { count: number; amount: number }
      > = {
        "0-30": { count: 0, amount: 0 },
        "31-60": { count: 0, amount: 0 },
        "61-90": { count: 0, amount: 0 },
        "90+": { count: 0, amount: 0 },
      };

      for (const dn of filteredDemandNotes) {
        const amount = Number(dn.amount) || 0;
        totalDemandAmount += amount;

        if (dn.status === "paid") {
          paidAmount += amount;
          paidCount++;
        } else if (dn.status === "overdue") {
          overdueAmount += amount;
          overdueCount++;

          // Calculate aging
          const dueDate = new Date(dn.dueDate);
          const daysOverdue = Math.floor(
            (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
          );

          if (daysOverdue <= 30) {
            agingBuckets["0-30"].count++;
            agingBuckets["0-30"].amount += amount;
          } else if (daysOverdue <= 60) {
            agingBuckets["31-60"].count++;
            agingBuckets["31-60"].amount += amount;
          } else if (daysOverdue <= 90) {
            agingBuckets["61-90"].count++;
            agingBuckets["61-90"].amount += amount;
          } else {
            agingBuckets["90+"].count++;
            agingBuckets["90+"].amount += amount;
          }
        } else {
          pendingAmount += amount;
          pendingCount++;
        }
      }

      const collectionRate =
        totalDemandAmount > 0 ? (paidAmount / totalDemandAmount) * 100 : 0;

      const agingAnalysis = Object.entries(agingBuckets).map(
        ([bucket, data]) => ({
          bucket,
          count: data.count,
          amount: data.amount.toFixed(2),
        })
      );

      return {
        totalDemandNotes,
        totalDemandAmount: totalDemandAmount.toFixed(2),
        paidDemandNotes: paidCount,
        paidAmount: paidAmount.toFixed(2),
        pendingDemandNotes: pendingCount,
        pendingAmount: pendingAmount.toFixed(2),
        overdueDemandNotes: overdueCount,
        overdueAmount: overdueAmount.toFixed(2),
        collectionRate: Math.round(collectionRate * 100) / 100,
        agingAnalysis,
      };
    } catch (error) {
      console.error("Error getting receivables analytics:", error);
      throw error;
    }
  }

  /**
   * Get SLA compliance analytics
   */
  async getSLAAnalytics(filters?: AnalyticsFilters): Promise<SLAAnalytics> {
    try {
      const now = new Date();

      // Service Requests SLA
      const allServiceRequests = await storage.getServiceRequests();
      let filteredServiceRequests = allServiceRequests;
      if (filters?.startDate || filters?.endDate) {
        filteredServiceRequests = allServiceRequests.filter((sr) => {
          const srDate = sr.createdAt ? new Date(sr.createdAt) : new Date();
          if (filters.startDate && srDate < filters.startDate) return false;
          if (filters.endDate && srDate > filters.endDate) return false;
          return true;
        });
      }

      let serviceRequestOnTime = 0;
      let serviceRequestOverdue = 0;
      let totalResolutionTime = 0;
      let resolvedCount = 0;
      const byStatus: Record<string, { count: number; slaCompliance: number }> =
        {};

      for (const sr of filteredServiceRequests) {
        const status = sr.status || "new";
        if (!byStatus[status]) {
          byStatus[status] = { count: 0, slaCompliance: 0 };
        }
        byStatus[status].count++;

        if (sr.resolvedAt) {
          const resolutionTime =
            (new Date(sr.resolvedAt).getTime() -
              (sr.createdAt ? new Date(sr.createdAt).getTime() : Date.now())) /
            (1000 * 60 * 60);
          totalResolutionTime += resolutionTime;
          resolvedCount++;

          // Assume SLA is 72 hours (3 days) - should come from config
          if (resolutionTime <= 72) {
            serviceRequestOnTime++;
            byStatus[status].slaCompliance++;
          } else {
            serviceRequestOverdue++;
          }
        } else if (sr.status === "closed" || sr.status === "completed") {
          // Consider closed/completed as on-time if no explicit SLA breach
          serviceRequestOnTime++;
          byStatus[status].slaCompliance++;
        }
      }

      const serviceRequestComplianceRate =
        filteredServiceRequests.length > 0
          ? (serviceRequestOnTime /
              (serviceRequestOnTime + serviceRequestOverdue)) *
            100
          : 0;

      // Water Connections SLA
      const allWaterConnections = await storage.getWaterConnections();
      let waterOnTime = 0;
      let waterOverdue = 0;
      for (const wc of allWaterConnections) {
        if (wc.slaDue) {
          if (now <= new Date(wc.slaDue)) {
            waterOnTime++;
          } else {
            waterOverdue++;
          }
        }
      }

      // Sewerage Connections SLA
      const allSewerageConnections = await storage.getSewerageConnections();
      let sewerageOnTime = 0;
      let sewerageOverdue = 0;
      for (const sc of allSewerageConnections) {
        if (sc.slaDue) {
          if (now <= new Date(sc.slaDue)) {
            sewerageOnTime++;
          } else {
            sewerageOverdue++;
          }
        }
      }

      // Registration Cases SLA (simplified)
      const allRegistrationCases = await storage.getRegistrationCases();
      let registrationOnTime = 0;
      let registrationOverdue = 0;
      // Assume registration SLA is tracked via status transitions
      for (const rc of allRegistrationCases) {
        if (rc.status === "registered" || rc.status === "certified") {
          registrationOnTime++;
        } else if (rc.status === "draft" || rc.status === "scheduled") {
          // Check if overdue based on created date
          const daysSinceCreation =
            (now.getTime() - (rc.createdAt ? new Date(rc.createdAt).getTime() : Date.now())) /
            (1000 * 60 * 60 * 24);
          if (daysSinceCreation > 30) {
            // Assume 30 days SLA
            registrationOverdue++;
          } else {
            registrationOnTime++;
          }
        }
      }

      return {
        serviceRequests: {
          total: filteredServiceRequests.length,
          onTime: serviceRequestOnTime,
          overdue: serviceRequestOverdue,
          complianceRate: Math.round(serviceRequestComplianceRate * 100) / 100,
          averageResolutionTime:
            resolvedCount > 0
              ? Math.round((totalResolutionTime / resolvedCount) * 100) / 100
              : 0,
          byStatus,
        },
        waterConnections: {
          total: allWaterConnections.length,
          onTime: waterOnTime,
          overdue: waterOverdue,
          complianceRate:
            allWaterConnections.length > 0
              ? Math.round(
                  (waterOnTime / allWaterConnections.length) * 100 * 100
                ) / 100
              : 0,
        },
        sewerageConnections: {
          total: allSewerageConnections.length,
          onTime: sewerageOnTime,
          overdue: sewerageOverdue,
          complianceRate:
            allSewerageConnections.length > 0
              ? Math.round(
                  (sewerageOnTime / allSewerageConnections.length) * 100 * 100
                ) / 100
              : 0,
        },
        registrationCases: {
          total: allRegistrationCases.length,
          onTime: registrationOnTime,
          overdue: registrationOverdue,
          complianceRate:
            allRegistrationCases.length > 0
              ? Math.round(
                  (registrationOnTime / allRegistrationCases.length) * 100 * 100
                ) / 100
              : 0,
        },
      };
    } catch (error) {
      console.error("Error getting SLA analytics:", error);
      throw error;
    }
  }

  /**
   * Get registration volumes by deed type
   */
  async getRegistrationVolumes(
    filters?: AnalyticsFilters
  ): Promise<RegistrationVolumes> {
    try {
      const allCases = await storage.getRegistrationCases();
      let filteredCases = allCases;
      if (filters?.startDate || filters?.endDate) {
        filteredCases = allCases.filter((rc) => {
          const rcDate = rc.createdAt ? new Date(rc.createdAt) : new Date();
          if (filters.startDate && rcDate < filters.startDate) return false;
          if (filters.endDate && rcDate > filters.endDate) return false;
          return true;
        });
      }

      const byDeedType: Record<string, number> = {};
      const byStatus: Record<string, number> = {};
      let totalProcessingTime = 0;
      let completedCount = 0;

      // Group by month for trends
      const monthlyData: Record<
        string,
        { count: number; byDeedType: Record<string, number> }
      > = {};

      for (const rc of filteredCases) {
        // Count by deed type
        const deedType = rc.deedType || "unknown";
        byDeedType[deedType] = (byDeedType[deedType] || 0) + 1;

        // Count by status
        const status = rc.status || "draft";
        byStatus[status] = (byStatus[status] || 0) + 1;

        // Calculate processing time for completed cases
        if (rc.registeredAt) {
          const processingTime =
            (new Date(rc.registeredAt).getTime() -
              (rc.createdAt ? new Date(rc.createdAt).getTime() : Date.now())) /
            (1000 * 60 * 60 * 24); // days
          totalProcessingTime += processingTime;
          completedCount++;
        }

        // Monthly trends
        const monthKey = rc.createdAt ? new Date(rc.createdAt).toISOString().slice(0, 7) : new Date().toISOString().slice(0, 7); // YYYY-MM
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { count: 0, byDeedType: {} };
        }
        monthlyData[monthKey].count++;
        monthlyData[monthKey].byDeedType[deedType] =
          (monthlyData[monthKey].byDeedType[deedType] || 0) + 1;
      }

      const monthlyTrends = Object.entries(monthlyData)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, data]) => ({
          month,
          count: data.count,
          byDeedType: data.byDeedType,
        }));

      return {
        totalCases: filteredCases.length,
        byDeedType,
        byStatus,
        averageProcessingTime:
          completedCount > 0
            ? Math.round((totalProcessingTime / completedCount) * 100) / 100
            : 0,
        monthlyTrends,
      };
    } catch (error) {
      console.error("Error getting registration volumes:", error);
      throw error;
    }
  }

  /**
   * Get dashboard summary (quick stats for officer dashboard)
   */
  async getDashboardSummary(userId?: number): Promise<{
    schemes: { total: number; active: number; closed: number };
    applications: { total: number; pending: number; selected: number };
    allotments: { total: number; issued: number; accepted: number };
    receivables: {
      total: string;
      pending: string;
      overdue: string;
    };
    serviceRequests: { total: number; pending: number; overdue: number };
    slaBreaches: number;
  }> {
    try {
      const allSchemes = await storage.getSchemes();
      const allApplications = await storage.getApplications();
      const allAllotments = await storage.getAllotments();
      const allDemandNotes = await storage.getDemandNotes();
      const allServiceRequests = await storage.getServiceRequests();

      const schemes = {
        total: allSchemes.length,
        active: allSchemes.filter((s) => s.status === "published").length,
        closed: allSchemes.filter((s) => s.status === "closed").length,
      };

      const applications = {
        total: allApplications.length,
        pending: allApplications.filter(
          (a) => a.status === "submitted" || a.status === "verified"
        ).length,
        selected: allApplications.filter((a) => a.status === "selected").length,
      };

      const allotments = {
        total: allAllotments.length,
        issued: allAllotments.filter((a) => a.status === "issued").length,
        accepted: allAllotments.filter((a) => a.status === "accepted").length,
      };

      let totalReceivables = 0;
      let pendingReceivables = 0;
      let overdueReceivables = 0;

      for (const dn of allDemandNotes) {
        const amount = Number(dn.amount) || 0;
        totalReceivables += amount;
        if (dn.status === "issued" || dn.status === "part_paid") {
          pendingReceivables += amount;
        }
        if (dn.status === "overdue") {
          overdueReceivables += amount;
        }
      }

      const serviceRequests = {
        total: allServiceRequests.length,
        pending: allServiceRequests.filter(
          (sr) => sr.status === "new" || sr.status === "under_review"
        ).length,
        overdue: allServiceRequests.filter((sr) => {
          // Check if SLA breached (simplified - assume 72 hours)
          if (sr.status === "new" || sr.status === "under_review") {
            const hoursSinceCreation =
              (new Date().getTime() - (sr.createdAt ? new Date(sr.createdAt).getTime() : Date.now())) /
              (1000 * 60 * 60);
            return hoursSinceCreation > 72;
          }
          return false;
        }).length,
      };

      // Calculate SLA breaches across all services
      const slaAnalytics = await this.getSLAAnalytics();
      const slaBreaches =
        slaAnalytics.serviceRequests.overdue +
        slaAnalytics.waterConnections.overdue +
        slaAnalytics.sewerageConnections.overdue +
        slaAnalytics.registrationCases.overdue;

      return {
        schemes,
        applications,
        allotments,
        receivables: {
          total: totalReceivables.toFixed(2),
          pending: pendingReceivables.toFixed(2),
          overdue: overdueReceivables.toFixed(2),
        },
        serviceRequests,
        slaBreaches,
      };
    } catch (error) {
      console.error("Error getting dashboard summary:", error);
      throw error;
    }
  }
}

export const pmsAnalyticsService = new PMSAnalyticsService();

