/**
 * Payment Service
 * Handles payment processing with gateway integration hooks
 */

import { storage } from "../../storage";
import { InsertPmsPayment, PmsPayment, DemandNote } from "@shared/schema";

export class PaymentService {
  /**
   * Process payment
   */
  async processPayment(
    paymentData: InsertPmsPayment
  ): Promise<PmsPayment> {
    try {
      // Validate party exists
      const party = await storage.getParty(paymentData.partyId);
      if (!party) {
        throw new Error("Party not found");
      }

      // Validate demand note if provided
      if (paymentData.demandNoteId) {
        const demandNote = await storage.getDemandNote(paymentData.demandNoteId);
        if (!demandNote) {
          throw new Error("Demand note not found");
        }
        if (demandNote.status === "paid") {
          throw new Error("Demand note is already fully paid");
        }
      }

      // Create payment record
      const payment = await storage.createPmsPayment({
        ...paymentData,
        status: "pending",
      });

      // In production, this would integrate with payment gateway
      // For now, simulate successful payment
      await this.confirmPayment(payment.id, {
        transactionId: (paymentData as any).refNo || `TXN-${Date.now()}`,
        gateway: "mock",
      });

      return payment;
    } catch (error) {
      console.error("Error processing payment:", error);
      throw error;
    }
  }

  /**
   * Confirm payment (called by payment gateway callback)
   */
  async confirmPayment(
    paymentId: number,
    gatewayResponse: any
  ): Promise<PmsPayment> {
    try {
      const payment = await storage.getPmsPayment(paymentId);
      if (!payment) {
        throw new Error("Payment not found");
      }

      // Update payment status
      const updated = await storage.updatePmsPayment(paymentId, {
        status: "success",
        gatewayResponse,
      } as Partial<InsertPmsPayment>);

      // Update demand note if linked
      if (payment.demandNoteId) {
        await this.updateDemandNoteStatus(payment.demandNoteId, Number(payment.amount));
      }

      // Create ledger entry
      await this.createLedgerEntry(
        payment.propertyId,
        payment.partyId,
        "payment",
        paymentId,
        0,
        Number(payment.amount),
        `Payment ${payment.refNo || paymentId.toString()}`
      );

      return updated;
    } catch (error) {
      console.error("Error confirming payment:", error);
      throw error;
    }
  }

  /**
   * Update demand note status based on payment
   */
  private async updateDemandNoteStatus(
    demandNoteId: number,
    paymentAmount: number
  ): Promise<void> {
    const demandNote = await storage.getDemandNote(demandNoteId);
    if (!demandNote) return;

    const demandAmount = Number(demandNote.amount);
    const existingPayments = await storage.getPmsPayments({
      demandNoteId,
      status: "success",
    });
    const totalPaid = existingPayments.reduce(
      (sum, p) => sum + Number(p.amount),
      0
    );

    if (totalPaid >= demandAmount) {
      await storage.updateDemandNote(demandNoteId, {
        status: "paid",
      });
    } else if (totalPaid > 0) {
      await storage.updateDemandNote(demandNoteId, {
        status: "part_paid",
      });
    }
  }

  /**
   * Create ledger entry
   */
  private async createLedgerEntry(
    propertyId: number | null,
    partyId: number,
    transactionType: string,
    transactionId: number,
    debit: number,
    credit: number,
    description: string
  ): Promise<void> {
    if (!propertyId) return;

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
   * Get payment by ID
   */
  async getPayment(id: number): Promise<PmsPayment> {
    try {
      const payment = await storage.getPmsPayment(id);
      if (!payment) {
        throw new Error("Payment not found");
      }
      return payment;
    } catch (error) {
      console.error("Error getting payment:", error);
      throw error;
    }
  }

  /**
   * Get payments with filters
   */
  async getPayments(filters?: {
    propertyId?: number;
    partyId?: number;
    demandNoteId?: number;
    status?: string;
  }): Promise<PmsPayment[]> {
    return await storage.getPmsPayments(filters);
  }

  /**
   * Refund payment
   */
  async refundPayment(
    paymentId: number,
    reason: string
  ): Promise<PmsPayment> {
    try {
      const payment = await storage.getPmsPayment(paymentId);
      if (!payment) {
        throw new Error("Payment not found");
      }

      if (payment.status !== "success") {
        throw new Error("Only successful payments can be refunded");
      }

      const updated = await storage.updatePmsPayment(paymentId, {
        status: "refunded",
      });

      return updated;
    } catch (error) {
      console.error("Error refunding payment:", error);
      throw error;
    }
  }
}

export const paymentService = new PaymentService();

