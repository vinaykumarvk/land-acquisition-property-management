/**
 * PMS Reports Service
 * Generates comprehensive reports for Property Management System
 * - Operational Reports: Schemes, applications, allotments, service requests
 * - Financial Reports: Receivables, payments, refunds, amnesty impact
 * - Spatial Reports: Heatmaps for grievances, dues, bottlenecks
 */

import { storage } from "../../storage";
import { pmsAnalyticsService } from "./pmsAnalyticsService";
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
  grievances,
  legalCases,
} from "@shared/schema";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";

export interface ReportFilters {
  startDate?: Date;
  endDate?: Date;
  schemeId?: number;
  propertyId?: number;
  status?: string;
  category?: string;
}

export interface OperationalReport {
  summary: {
    totalSchemes: number;
    activeSchemes: number;
    totalApplications: number;
    totalAllotments: number;
    totalServiceRequests: number;
    totalWaterConnections: number;
    totalSewerageConnections: number;
    totalRegistrationCases: number;
  };
  schemeDetails: Array<{
    id: number;
    name: string;
    category: string;
    status: string;
    applicationsCount: number;
    allotmentsCount: number;
    createdAt: Date;
  }>;
  applicationDetails: Array<{
    id: number;
    schemeName: string;
    partyName: string;
    status: string;
    score: number | null;
    createdAt: Date;
  }>;
  allotmentDetails: Array<{
    id: number;
    propertyNo: string;
    partyName: string;
    letterNo: string;
    status: string;
    issueDate: Date;
  }>;
  serviceRequestDetails: Array<{
    id: number;
    refNo: string;
    requestType: string;
    status: string;
    createdAt: Date;
    resolvedAt: Date | null;
  }>;
  generatedAt: Date;
}

export interface FinancialReport {
  summary: {
    totalDemandNotes: number;
    totalDemandAmount: string;
    totalPayments: number;
    totalPaidAmount: string;
    totalRefunds: number;
    totalRefundAmount: string;
    netReceivables: string;
    collectionRate: number;
  };
  demandNoteDetails: Array<{
    id: number;
    noteNo: string;
    propertyNo: string;
    amount: string;
    dueDate: Date;
    status: string;
    paidAmount: string;
    pendingAmount: string;
  }>;
  paymentDetails: Array<{
    id: number;
    amount: string;
    mode: string;
    status: string;
    paidOn: Date;
    receiptNo: string | null;
  }>;
  refundDetails: Array<{
    id: number;
    amount: string;
    reason: string;
    status: string;
    approvedAt: Date | null;
    processedAt: Date | null;
  }>;
  agingAnalysis: {
    bucket: string;
    count: number;
    amount: string;
  }[];
  generatedAt: Date;
}

export interface SpatialReport {
  summary: {
    totalProperties: number;
    propertiesWithDues: number;
    propertiesWithGrievances: number;
    propertiesWithPendingServices: number;
  };
  heatmapData: Array<{
    propertyId: number;
    parcelNo: string;
    lat: number | null;
    lng: number | null;
    dues: string;
    grievances: number;
    pendingServices: number;
    severity: "low" | "medium" | "high";
  }>;
  generatedAt: Date;
}

export class PMSReportsService {
  /**
   * Generate operational report
   */
  async generateOperationalReport(
    filters?: ReportFilters
  ): Promise<OperationalReport> {
    try {
      const allSchemes = await storage.getSchemes();
      const allApplications = await storage.getApplications();
      const allAllotments = await storage.getAllotments();
      const allServiceRequests = await storage.getServiceRequests();
      const allWaterConnections = await storage.getWaterConnections();
      const allSewerageConnections = await storage.getSewerageConnections();
      const allRegistrationCases = await storage.getRegistrationCases();

      // Filter by date if provided
      let filteredSchemes = allSchemes;
      let filteredApplications = allApplications;
      let filteredAllotments = allAllotments;
      let filteredServiceRequests = allServiceRequests;

      if (filters?.startDate || filters?.endDate) {
        filteredSchemes = allSchemes.filter((s) => {
          const sDate = new Date(s.createdAt);
          if (filters.startDate && sDate < filters.startDate) return false;
          if (filters.endDate && sDate > filters.endDate) return false;
          return true;
        });

        filteredApplications = allApplications.filter((a) => {
          const aDate = new Date(a.createdAt);
          if (filters.startDate && aDate < filters.startDate) return false;
          if (filters.endDate && aDate > filters.endDate) return false;
          return true;
        });

        filteredAllotments = allAllotments.filter((a) => {
          const aDate = new Date(a.createdAt);
          if (filters.startDate && aDate < filters.startDate) return false;
          if (filters.endDate && aDate > filters.endDate) return false;
          return true;
        });

        filteredServiceRequests = allServiceRequests.filter((sr) => {
          const srDate = new Date(sr.createdAt);
          if (filters.startDate && srDate < filters.startDate) return false;
          if (filters.endDate && srDate > filters.endDate) return false;
          return true;
        });
      }

      // Filter by scheme if provided
      if (filters?.schemeId) {
        filteredApplications = filteredApplications.filter(
          (a) => a.schemeId === filters.schemeId
        );
      }

      // Get scheme details
      const schemeDetails = await Promise.all(
        filteredSchemes.map(async (scheme) => {
          const schemeApplications = filteredApplications.filter(
            (a) => a.schemeId === scheme.id
          );
          const schemeAllotments = filteredAllotments.filter((a) => {
            const property = allAllotments.find(
              (al) => al.propertyId === a.propertyId
            );
            return property && schemeApplications.some((app) => app.id === a.id);
          });

          return {
            id: scheme.id,
            name: scheme.name,
            category: scheme.category,
            status: scheme.status,
            applicationsCount: schemeApplications.length,
            allotmentsCount: schemeAllotments.length,
            createdAt: new Date(scheme.createdAt),
          };
        })
      );

      // Get application details
      const applicationDetails = await Promise.all(
        filteredApplications.slice(0, 100).map(async (app) => {
          const schemes = await storage.getSchemes();
          const scheme = schemes.find(s => s.id === app.schemeId);
          const party = await storage.getParty(app.partyId);
          return {
            id: app.id,
            schemeName: scheme?.name || "Unknown",
            partyName: party?.name || "Unknown",
            status: app.status,
            score: app.score ? Number(app.score) : null,
            createdAt: new Date(app.createdAt),
          };
        })
      );

      // Get allotment details
      const allotmentDetails = await Promise.all(
        filteredAllotments.slice(0, 100).map(async (allotment) => {
          const property = await storage.getProperty(allotment.propertyId);
          const party = await storage.getParty(allotment.partyId);
          return {
            id: allotment.id,
            propertyNo: property?.parcelNo || "Unknown",
            partyName: party?.name || "Unknown",
            letterNo: allotment.letterNo,
            status: allotment.status,
            issueDate: new Date(allotment.issueDate),
          };
        })
      );

      // Get service request details
      const serviceRequestDetails = await Promise.all(
        filteredServiceRequests.slice(0, 100).map(async (sr) => {
          return {
            id: sr.id,
            refNo: sr.refNo || `SR-${sr.id}`,
            requestType: sr.requestType,
            status: sr.status,
            createdAt: new Date(sr.createdAt),
            resolvedAt: sr.resolvedAt ? new Date(sr.resolvedAt) : null,
          };
        })
      );

      return {
        summary: {
          totalSchemes: filteredSchemes.length,
          activeSchemes: filteredSchemes.filter(
            (s) => s.status === "published"
          ).length,
          totalApplications: filteredApplications.length,
          totalAllotments: filteredAllotments.length,
          totalServiceRequests: filteredServiceRequests.length,
          totalWaterConnections: allWaterConnections.length,
          totalSewerageConnections: allSewerageConnections.length,
          totalRegistrationCases: allRegistrationCases.length,
        },
        schemeDetails,
        applicationDetails,
        allotmentDetails,
        serviceRequestDetails,
        generatedAt: new Date(),
      };
    } catch (error) {
      console.error("Error generating operational report:", error);
      throw error;
    }
  }

  /**
   * Generate financial report
   */
  async generateFinancialReport(
    filters?: ReportFilters
  ): Promise<FinancialReport> {
    try {
      const allDemandNotes = await storage.getDemandNotes();
      const allPayments = await storage.getPmsPayments();
      const allRefunds = await storage.getRefunds();

      // Filter by date if provided
      let filteredDemandNotes = allDemandNotes;
      let filteredPayments = allPayments;
      let filteredRefunds = allRefunds;

      if (filters?.startDate || filters?.endDate) {
        filteredDemandNotes = allDemandNotes.filter((dn) => {
          const dnDate = new Date(dn.createdAt);
          if (filters.startDate && dnDate < filters.startDate) return false;
          if (filters.endDate && dnDate > filters.endDate) return false;
          return true;
        });

        filteredPayments = allPayments.filter((p) => {
          const pDate = new Date(p.paidOn);
          if (filters.startDate && pDate < filters.startDate) return false;
          if (filters.endDate && pDate > filters.endDate) return false;
          return true;
        });

        filteredRefunds = allRefunds.filter((r) => {
          const rDate = new Date(r.createdAt);
          if (filters.startDate && rDate < filters.startDate) return false;
          if (filters.endDate && rDate > filters.endDate) return false;
          return true;
        });
      }

      // Calculate totals
      let totalDemandAmount = 0;
      let totalPaidAmount = 0;
      let totalRefundAmount = 0;

      for (const dn of filteredDemandNotes) {
        totalDemandAmount += Number(dn.amount) || 0;
      }

      for (const p of filteredPayments) {
        if (p.status === "success") {
          totalPaidAmount += Number(p.amount) || 0;
        }
      }

      for (const r of filteredRefunds) {
        if (r.status === "processed") {
          totalRefundAmount += Number(r.amount) || 0;
        }
      }

      const netReceivables = totalDemandAmount - totalPaidAmount + totalRefundAmount;
      const collectionRate =
        totalDemandAmount > 0
          ? (totalPaidAmount / totalDemandAmount) * 100
          : 0;

      // Get demand note details
      const demandNoteDetails = await Promise.all(
        filteredDemandNotes.slice(0, 100).map(async (dn) => {
          const property = await storage.getProperty(dn.propertyId);
          const payments = filteredPayments.filter(
            (p) => p.demandNoteId === dn.id && p.status === "success"
          );
          const paidAmount = payments.reduce(
            (sum, p) => sum + (Number(p.amount) || 0),
            0
          );
          const pendingAmount = (Number(dn.amount) || 0) - paidAmount;

          return {
            id: dn.id,
            noteNo: dn.noteNo,
            propertyNo: property?.parcelNo || "Unknown",
            amount: (Number(dn.amount) || 0).toFixed(2),
            dueDate: new Date(dn.dueDate),
            status: dn.status,
            paidAmount: paidAmount.toFixed(2),
            pendingAmount: pendingAmount.toFixed(2),
          };
        })
      );

      // Get payment details
      const paymentDetails = await Promise.all(
        filteredPayments.slice(0, 100).map(async (p) => {
          const receipts = await storage.getReceipts({ paymentId: p.id });
          const receipt = receipts.length > 0 ? receipts[0] : null;

          return {
            id: p.id,
            amount: (Number(p.amount) || 0).toFixed(2),
            mode: p.mode,
            status: p.status,
            paidOn: new Date(p.paidOn),
            receiptNo: receipt?.receiptNo || null,
          };
        })
      );

      // Get refund details
      const refundDetails = await Promise.all(
        filteredRefunds.slice(0, 100).map(async (r) => {
          return {
            id: r.id,
            amount: (Number(r.amount) || 0).toFixed(2),
            reason: r.reason,
            status: r.status,
            approvedAt: r.approvedAt ? new Date(r.approvedAt) : null,
            processedAt: r.processedAt ? new Date(r.processedAt) : null,
          };
        })
      );

      // Get aging analysis
      const receivablesAnalytics = await pmsAnalyticsService.getReceivablesAnalytics(
        filters
      );

      return {
        summary: {
          totalDemandNotes: filteredDemandNotes.length,
          totalDemandAmount: totalDemandAmount.toFixed(2),
          totalPayments: filteredPayments.length,
          totalPaidAmount: totalPaidAmount.toFixed(2),
          totalRefunds: filteredRefunds.length,
          totalRefundAmount: totalRefundAmount.toFixed(2),
          netReceivables: netReceivables.toFixed(2),
          collectionRate: Math.round(collectionRate * 100) / 100,
        },
        demandNoteDetails,
        paymentDetails,
        refundDetails,
        agingAnalysis: receivablesAnalytics.agingAnalysis,
        generatedAt: new Date(),
      };
    } catch (error) {
      console.error("Error generating financial report:", error);
      throw error;
    }
  }

  /**
   * Generate spatial report (heatmap data)
   */
  async generateSpatialReport(
    filters?: ReportFilters
  ): Promise<SpatialReport> {
    try {
      const allProperties = await storage.getProperties();
      const allDemandNotes = await storage.getDemandNotes();
      const allGrievances = await storage.getGrievances() || [];
      const allServiceRequests = await storage.getServiceRequests();

      // Filter properties by date if provided
      let filteredProperties = allProperties;
      if (filters?.startDate || filters?.endDate) {
        filteredProperties = allProperties.filter((p) => {
          const pDate = new Date(p.createdAt);
          if (filters.startDate && pDate < filters.startDate) return false;
          if (filters.endDate && pDate > filters.endDate) return false;
          return true;
        });
      }

      const heatmapData = await Promise.all(
        filteredProperties.map(async (property) => {
          // Calculate dues for this property
          const propertyDemandNotes = allDemandNotes.filter(
            (dn) => dn.propertyId === property.id
          );
          let totalDues = 0;
          for (const dn of propertyDemandNotes) {
            if (dn.status === "issued" || dn.status === "part_paid" || dn.status === "overdue") {
              const amount = Number(dn.amount) || 0;
              // Subtract paid amount
              const payments = await storage.getPmsPayments({
                demandNoteId: dn.id,
                status: "success",
              });
              const paidAmount = payments.reduce(
                (sum, p) => sum + (Number(p.amount) || 0),
                0
              );
              totalDues += amount - paidAmount;
            }
          }

          // Count grievances
          const propertyGrievances = allGrievances.filter(
            (g) => g.propertyId === property.id
          );

          // Count pending service requests
          const pendingServiceRequests = allServiceRequests.filter(
            (sr) =>
              sr.propertyId === property.id &&
              (sr.status === "new" ||
                sr.status === "under_review" ||
                sr.status === "approved")
          );

          // Determine severity
          let severity: "low" | "medium" | "high" = "low";
          if (totalDues > 100000 || propertyGrievances.length > 2 || pendingServiceRequests.length > 3) {
            severity = "high";
          } else if (totalDues > 50000 || propertyGrievances.length > 0 || pendingServiceRequests.length > 1) {
            severity = "medium";
          }

          return {
            propertyId: property.id,
            parcelNo: property.parcelNo,
            lat: property.lat ? Number(property.lat) : null,
            lng: property.lng ? Number(property.lng) : null,
            dues: totalDues.toFixed(2),
            grievances: propertyGrievances.length,
            pendingServices: pendingServiceRequests.length,
            severity,
          };
        })
      );

      const propertiesWithDues = heatmapData.filter((d) => Number(d.dues) > 0).length;
      const propertiesWithGrievances = heatmapData.filter((d) => d.grievances > 0).length;
      const propertiesWithPendingServices = heatmapData.filter((d) => d.pendingServices > 0).length;

      return {
        summary: {
          totalProperties: filteredProperties.length,
          propertiesWithDues,
          propertiesWithGrievances,
          propertiesWithPendingServices,
        },
        heatmapData,
        generatedAt: new Date(),
      };
    } catch (error) {
      console.error("Error generating spatial report:", error);
      throw error;
    }
  }

  /**
   * Export report to CSV
   */
  async exportReportToCSV(
    report: OperationalReport | FinancialReport,
    reportType: "operational" | "financial"
  ): Promise<string> {
    try {
      let csv = "";

      if (reportType === "operational") {
        const opReport = report as OperationalReport;
        // CSV header
        csv += "Operational Report\n";
        csv += `Generated At: ${opReport.generatedAt}\n\n`;

        // Summary
        csv += "Summary\n";
        csv += `Total Schemes,${opReport.summary.totalSchemes}\n`;
        csv += `Active Schemes,${opReport.summary.activeSchemes}\n`;
        csv += `Total Applications,${opReport.summary.totalApplications}\n`;
        csv += `Total Allotments,${opReport.summary.totalAllotments}\n`;
        csv += `Total Service Requests,${opReport.summary.totalServiceRequests}\n\n`;

        // Scheme Details
        csv += "Scheme Details\n";
        csv += "ID,Name,Category,Status,Applications,Allotments,Created At\n";
        for (const scheme of opReport.schemeDetails) {
          csv += `${scheme.id},"${scheme.name}",${scheme.category},${scheme.status},${scheme.applicationsCount},${scheme.allotmentsCount},${scheme.createdAt}\n`;
        }
      } else if (reportType === "financial") {
        const finReport = report as FinancialReport;
        // CSV header
        csv += "Financial Report\n";
        csv += `Generated At: ${finReport.generatedAt}\n\n`;

        // Summary
        csv += "Summary\n";
        csv += `Total Demand Notes,${finReport.summary.totalDemandNotes}\n`;
        csv += `Total Demand Amount,${finReport.summary.totalDemandAmount}\n`;
        csv += `Total Payments,${finReport.summary.totalPayments}\n`;
        csv += `Total Paid Amount,${finReport.summary.totalPaidAmount}\n`;
        csv += `Collection Rate,${finReport.summary.collectionRate}%\n\n`;

        // Demand Note Details
        csv += "Demand Note Details\n";
        csv += "ID,Note No,Property No,Amount,Due Date,Status,Paid Amount,Pending Amount\n";
        for (const dn of finReport.demandNoteDetails) {
          csv += `${dn.id},"${dn.noteNo}","${dn.propertyNo}",${dn.amount},${dn.dueDate},${dn.status},${dn.paidAmount},${dn.pendingAmount}\n`;
        }
      }

      return csv;
    } catch (error) {
      console.error("Error exporting report to CSV:", error);
      throw error;
    }
  }
}

export const pmsReportsService = new PMSReportsService();

