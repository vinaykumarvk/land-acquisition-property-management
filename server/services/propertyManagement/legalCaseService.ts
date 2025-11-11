/**
 * Legal Case Service
 * Handles legal case tracking with hearings and order compliance
 */

import { storage } from "../../storage";
import { InsertLegalCase, LegalCase, InsertCaseHearing, CaseHearing, InsertCourtOrder, CourtOrder } from "@shared/schema";
import { notificationService } from "../notificationService";

export class LegalCaseService {
  /**
   * Create a new legal case
   */
  async createLegalCase(
    caseData: InsertLegalCase,
    userId?: number
  ): Promise<LegalCase> {
    try {
      // Validate case number uniqueness
      if (caseData.caseNo) {
        const existing = await storage.getLegalCaseByCaseNo(caseData.caseNo);
        if (existing) {
          throw new Error("Case number already exists");
        }
      }

      const legalCase = await storage.createLegalCase(caseData);

      // Notify assigned officer if assigned
      if (legalCase.assignedTo) {
        await notificationService.createNotification({
          userId: legalCase.assignedTo,
          title: "New Legal Case Assigned",
          message: `Legal case ${legalCase.caseNo} has been assigned to you`,
          type: "task_assigned",
          relatedType: "legal_case",
          relatedId: legalCase.id,
        });
      }

      return legalCase;
    } catch (error) {
      console.error("Error creating legal case:", error);
      throw error;
    }
  }

  /**
   * Get legal case by ID
   */
  async getLegalCase(id: number): Promise<LegalCase> {
    try {
      const legalCase = await storage.getLegalCase(id);
      if (!legalCase) {
        throw new Error("Legal case not found");
      }
      return legalCase;
    } catch (error) {
      console.error("Error getting legal case:", error);
      throw error;
    }
  }

  /**
   * Get legal case by case number
   */
  async getLegalCaseByCaseNo(caseNo: string): Promise<LegalCase> {
    try {
      const legalCase = await storage.getLegalCaseByCaseNo(caseNo);
      if (!legalCase) {
        throw new Error("Legal case not found");
      }
      return legalCase;
    } catch (error) {
      console.error("Error getting legal case:", error);
      throw error;
    }
  }

  /**
   * Get legal cases with filters
   */
  async getLegalCases(filters?: {
    propertyId?: number;
    partyId?: number;
    grievanceId?: number;
    status?: string;
    assignedTo?: number;
  }): Promise<LegalCase[]> {
    return await storage.getLegalCases(filters);
  }

  /**
   * Update legal case
   */
  async updateLegalCase(
    id: number,
    caseData: Partial<InsertLegalCase>
  ): Promise<LegalCase> {
    try {
      const existing = await storage.getLegalCase(id);
      if (!existing) {
        throw new Error("Legal case not found");
      }

      // Validate case number uniqueness if being updated
      if (caseData.caseNo && caseData.caseNo !== existing.caseNo) {
        const duplicate = await storage.getLegalCaseByCaseNo(caseData.caseNo);
        if (duplicate) {
          throw new Error("Case number already exists");
        }
      }

      const updated = await storage.updateLegalCase(id, caseData);

      // Notify if assigned to changed
      if (caseData.assignedTo && caseData.assignedTo !== existing.assignedTo) {
        await notificationService.createNotification({
          userId: caseData.assignedTo,
          title: "Legal Case Assigned",
          message: `Legal case ${existing.caseNo} has been assigned to you`,
          type: "task_assigned",
          relatedType: "legal_case",
          relatedId: id,
        });
      }

      return updated;
    } catch (error) {
      console.error("Error updating legal case:", error);
      throw error;
    }
  }

  /**
   * Schedule a hearing
   */
  async scheduleHearing(
    legalCaseId: number,
    hearingData: Omit<InsertCaseHearing, "legalCaseId" | "status">
  ): Promise<CaseHearing> {
    try {
      const legalCase = await storage.getLegalCase(legalCaseId);
      if (!legalCase) {
        throw new Error("Legal case not found");
      }

      const hearing = await storage.createCaseHearing({
        ...hearingData,
        legalCaseId,
        status: "scheduled",
      });

      // Update legal case with next hearing date
      await storage.updateLegalCase(legalCaseId, {
        nextHearingDate: hearing.hearingDate,
      });

      // Notify assigned officer
      if (legalCase.assignedTo) {
        await notificationService.createNotification({
          userId: legalCase.assignedTo,
          title: "Hearing Scheduled",
          message: `Hearing scheduled for case ${legalCase.caseNo} on ${new Date(hearing.hearingDate).toLocaleDateString()}`,
          type: "task_assigned",
          relatedType: "legal_case",
          relatedId: legalCaseId,
        });
      }

      return hearing;
    } catch (error) {
      console.error("Error scheduling hearing:", error);
      throw error;
    }
  }

  /**
   * Get hearings for a legal case
   */
  async getHearings(legalCaseId: number): Promise<CaseHearing[]> {
    try {
      const legalCase = await storage.getLegalCase(legalCaseId);
      if (!legalCase) {
        throw new Error("Legal case not found");
      }
      return await storage.getCaseHearings(legalCaseId);
    } catch (error) {
      console.error("Error getting hearings:", error);
      throw error;
    }
  }

  /**
   * Update hearing
   */
  async updateHearing(
    id: number,
    hearingData: Partial<InsertCaseHearing>
  ): Promise<CaseHearing> {
    try {
      const existing = await storage.getCaseHearing(id);
      if (!existing) {
        throw new Error("Hearing not found");
      }

      const updated = await storage.updateCaseHearing(id, hearingData);

      // If hearing completed, update last hearing date on case
      if (hearingData.status === "completed" && existing.status !== "completed") {
        const legalCase = await storage.getLegalCase(existing.legalCaseId);
        if (legalCase) {
          await storage.updateLegalCase(legalCase.id, {
            lastHearingDate: existing.hearingDate,
          });
        }
      }

      // If adjourned, update next hearing date
      if (hearingData.status === "adjourned" && hearingData.adjournedTo) {
        const legalCase = await storage.getLegalCase(existing.legalCaseId);
        if (legalCase) {
          await storage.updateLegalCase(legalCase.id, {
            nextHearingDate: hearingData.adjournedTo,
          });
        }
      }

      return updated;
    } catch (error) {
      console.error("Error updating hearing:", error);
      throw error;
    }
  }

  /**
   * Record a court order
   */
  async recordOrder(
    legalCaseId: number,
    orderData: Omit<InsertCourtOrder, "legalCaseId">
  ): Promise<CourtOrder> {
    try {
      const legalCase = await storage.getLegalCase(legalCaseId);
      if (!legalCase) {
        throw new Error("Legal case not found");
      }

      const order = await storage.createCourtOrder({
        ...orderData,
        legalCaseId,
      });

      // Update case status if order is final
      if (orderData.orderType === "final") {
        await storage.updateLegalCase(legalCaseId, {
          status: "disposed",
        });
      } else if (orderData.orderType === "stay") {
        await storage.updateLegalCase(legalCaseId, {
          status: "stayed",
        });
      }

      // Notify assigned officer
      if (legalCase.assignedTo) {
        await notificationService.createNotification({
          userId: legalCase.assignedTo,
          title: "Court Order Recorded",
          message: `Court order recorded for case ${legalCase.caseNo}`,
          type: "task_assigned",
          relatedType: "legal_case",
          relatedId: legalCaseId,
        });
      }

      return order;
    } catch (error) {
      console.error("Error recording order:", error);
      throw error;
    }
  }

  /**
   * Get orders for a legal case
   */
  async getOrders(legalCaseId: number): Promise<CourtOrder[]> {
    try {
      const legalCase = await storage.getLegalCase(legalCaseId);
      if (!legalCase) {
        throw new Error("Legal case not found");
      }
      return await storage.getCourtOrders(legalCaseId);
    } catch (error) {
      console.error("Error getting orders:", error);
      throw error;
    }
  }

  /**
   * Update order compliance status
   */
  async updateOrderCompliance(
    orderId: number,
    complianceStatus: string,
    complianceNotes?: string,
    compliedBy?: number
  ): Promise<CourtOrder> {
    try {
      const existing = await storage.getCourtOrder(orderId);
      if (!existing) {
        throw new Error("Court order not found");
      }

      const updateData: Partial<InsertCourtOrder> = {
        complianceStatus,
        complianceNotes,
      };

      if (complianceStatus === "complied") {
        updateData.compliedAt = new Date();
        updateData.compliedBy = compliedBy;
      }

      const updated = await storage.updateCourtOrder(orderId, updateData);

      // Notify assigned officer if compliance completed
      if (complianceStatus === "complied" && existing.legalCaseId) {
        const legalCase = await storage.getLegalCase(existing.legalCaseId);
        if (legalCase?.assignedTo) {
          await notificationService.createNotification({
            userId: legalCase.assignedTo,
            title: "Order Compliance Completed",
            message: `Compliance completed for order in case ${legalCase.caseNo}`,
            type: "task_assigned",
            relatedType: "legal_case",
            relatedId: legalCase.id,
          });
        }
      }

      return updated;
    } catch (error) {
      console.error("Error updating order compliance:", error);
      throw error;
    }
  }

  /**
   * Get cases with upcoming hearings
   */
  async getUpcomingHearings(days: number = 7): Promise<LegalCase[]> {
    const allCases = await storage.getLegalCases({ status: "active" });
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + days);

    return allCases.filter(legalCase => {
      if (!legalCase.nextHearingDate) return false;
      const hearingDate = new Date(legalCase.nextHearingDate);
      return hearingDate <= cutoffDate && hearingDate >= new Date();
    });
  }

  /**
   * Get orders requiring compliance
   */
  async getOrdersRequiringCompliance(): Promise<CourtOrder[]> {
    const allCases = await storage.getLegalCases();
    const ordersRequiringCompliance: CourtOrder[] = [];

    for (const legalCase of allCases) {
      const orders = await storage.getCourtOrders(legalCase.id);
      const pending = orders.filter(
        o => o.complianceRequired && 
        (o.complianceStatus === "pending" || o.complianceStatus === "in_progress")
      );
      ordersRequiringCompliance.push(...pending);
    }

    return ordersRequiringCompliance;
  }
}

export const legalCaseService = new LegalCaseService();

