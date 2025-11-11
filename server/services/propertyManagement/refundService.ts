/**
 * Refund Service
 * Handles refunds, amnesty, and adjustments with maker-checker workflow
 */

import { storage } from "../../storage";
import { InsertRefund, Refund } from "@shared/schema";

export class RefundService {
  /**
   * Create refund request
   */
  async createRefund(
    refundData: Omit<InsertRefund, "createdBy">,
    userId: number
  ): Promise<Refund> {
    try {
      // Validate party exists
      const party = await storage.getParty(refundData.partyId);
      if (!party) {
        throw new Error("Party not found");
      }

      // Validate payment if provided
      if (refundData.paymentId) {
        const payment = await storage.getPmsPayment(refundData.paymentId);
        if (!payment) {
          throw new Error("Payment not found");
        }
        if (payment.status !== "success") {
          throw new Error("Can only refund successful payments");
        }
      }

      // Validate reason
      const validReasons = ["refund", "amnesty", "adjustment", "waiver"];
      if (!validReasons.includes(refundData.reason)) {
        throw new Error(
          `Invalid reason. Must be one of: ${validReasons.join(", ")}`
        );
      }

      const refund = await storage.createRefund({
        ...refundData,
        createdBy: userId,
        status: "draft",
      });

      return refund;
    } catch (error) {
      console.error("Error creating refund:", error);
      throw error;
    }
  }

  /**
   * Approve refund
   */
  async approveRefund(
    refundId: number,
    userId: number
  ): Promise<Refund> {
    try {
      const refund = await storage.getRefund(refundId);
      if (!refund) {
        throw new Error("Refund not found");
      }

      if (refund.status !== "draft") {
        throw new Error(
          `Refund must be in 'draft' status. Current: ${refund.status}`
        );
      }

      const updated = await storage.updateRefund(refundId, {
        status: "approved",
        approvedBy: userId,
        approvedAt: new Date(),
      });

      return updated;
    } catch (error) {
      console.error("Error approving refund:", error);
      throw error;
    }
  }

  /**
   * Process refund
   */
  async processRefund(refundId: number): Promise<Refund> {
    try {
      const refund = await storage.getRefund(refundId);
      if (!refund) {
        throw new Error("Refund not found");
      }

      if (refund.status !== "approved") {
        throw new Error(
          `Refund must be approved before processing. Current: ${refund.status}`
        );
      }

      // Update payment status if linked
      if (refund.paymentId) {
        await storage.updatePmsPayment(refund.paymentId, {
          status: "refunded",
        });
      }

      // Create ledger entry
      if (refund.propertyId) {
        await this.createLedgerEntry(
          refund.propertyId,
          refund.partyId,
          "refund",
          refundId,
          0,
          Number(refund.amount),
          `Refund ${refund.reason} - ${refund.reasonDetails || ""}`
        );
      }

      const updated = await storage.updateRefund(refundId, {
        status: "processed",
        processedAt: new Date(),
      });

      return updated;
    } catch (error) {
      console.error("Error processing refund:", error);
      throw error;
    }
  }

  /**
   * Create ledger entry
   */
  private async createLedgerEntry(
    propertyId: number,
    partyId: number,
    transactionType: string,
    transactionId: number,
    debit: number,
    credit: number,
    description: string
  ): Promise<void> {
    const currentBalance = await storage.getLatestLedgerBalance(propertyId, partyId);
    const balance = Number(currentBalance) + debit - credit;

    await storage.createLedger({
      propertyId,
      partyId,
      transactionType,
      transactionId,
      debit: debit > 0 ? debit.toString() : null,
      credit: credit > 0 ? credit.toString() : null,
      balance: balance.toString(),
      description,
    });
  }

  /**
   * Reject refund
   */
  async rejectRefund(
    refundId: number,
    reason: string,
    userId: number
  ): Promise<Refund> {
    try {
      const refund = await storage.getRefund(refundId);
      if (!refund) {
        throw new Error("Refund not found");
      }

      if (!["draft", "approved"].includes(refund.status)) {
        throw new Error(
          `Refund cannot be rejected. Current status: ${refund.status}`
        );
      }

      const updated = await storage.updateRefund(refundId, {
        status: "rejected",
      });

      return updated;
    } catch (error) {
      console.error("Error rejecting refund:", error);
      throw error;
    }
  }

  /**
   * Get refund by ID
   */
  async getRefund(id: number): Promise<Refund> {
    try {
      const refund = await storage.getRefund(id);
      if (!refund) {
        throw new Error("Refund not found");
      }
      return refund;
    } catch (error) {
      console.error("Error getting refund:", error);
      throw error;
    }
  }

  /**
   * Get refunds with filters
   */
  async getRefunds(filters?: {
    propertyId?: number;
    partyId?: number;
    paymentId?: number;
    status?: string;
  }): Promise<Refund[]> {
    return await storage.getRefunds(filters);
  }
}

export const refundService = new RefundService();

