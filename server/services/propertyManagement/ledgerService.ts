/**
 * Ledger Service
 * Handles property account ledger management and reconciliation
 */

import { storage } from "../../storage";
import { Ledger } from "@shared/schema";

export class LedgerService {
  /**
   * Get property ledger (passbook)
   */
  async getPropertyLedger(
    propertyId: number,
    partyId: number
  ): Promise<Ledger[]> {
    try {
      const ledgers = await storage.getLedgers({ propertyId, partyId });
      return ledgers;
    } catch (error) {
      console.error("Error getting property ledger:", error);
      throw error;
    }
  }

  /**
   * Get current balance
   */
  async getCurrentBalance(
    propertyId: number,
    partyId: number
  ): Promise<string> {
    try {
      const balance = await storage.getLatestLedgerBalance(propertyId, partyId);
      return balance;
    } catch (error) {
      console.error("Error getting current balance:", error);
      throw error;
    }
  }

  /**
   * Get ledger summary
   */
  async getLedgerSummary(
    propertyId: number,
    partyId: number
  ): Promise<{
    currentBalance: string;
    totalDebits: number;
    totalCredits: number;
    transactionCount: number;
  }> {
    try {
      const ledgers = await storage.getLedgers({ propertyId, partyId });
      const currentBalance = await storage.getLatestLedgerBalance(propertyId, partyId);

      const totalDebits = ledgers.reduce(
        (sum, entry) => sum + (Number(entry.debit) || 0),
        0
      );
      const totalCredits = ledgers.reduce(
        (sum, entry) => sum + (Number(entry.credit) || 0),
        0
      );

      return {
        currentBalance,
        totalDebits,
        totalCredits,
        transactionCount: ledgers.length,
      };
    } catch (error) {
      console.error("Error getting ledger summary:", error);
      throw error;
    }
  }

  /**
   * Export ledger to CSV
   */
  async exportLedgerToCSV(
    propertyId: number,
    partyId: number
  ): Promise<string> {
    try {
      const ledgers = await storage.getLedgers({ propertyId, partyId });

      const headers = [
        "Date",
        "Type",
        "Description",
        "Debit",
        "Credit",
        "Balance",
      ];

      const rows = ledgers.map((entry) => [
        entry.createdAt ? new Date(entry.createdAt).toLocaleDateString() : '',
        entry.transactionType,
        entry.description || "",
        entry.debit || "0.00",
        entry.credit || "0.00",
        entry.balance,
      ]);

      const csv = [
        headers.join(","),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
      ].join("\n");

      return csv;
    } catch (error) {
      console.error("Error exporting ledger to CSV:", error);
      throw error;
    }
  }

  /**
   * Reconcile ledger (3-way reconciliation with Accounts)
   */
  async reconcileLedger(
    propertyId: number,
    partyId: number,
    accountsData: Array<{
      date: Date;
      amount: number;
      refNo: string;
    }>
  ): Promise<{
    matched: number;
    unmatched: number;
    discrepancies: Array<{
      type: "missing" | "extra" | "mismatch";
      description: string;
    }>;
  }> {
    try {
      const ledgers = await storage.getLedgers({ propertyId, partyId });
      const payments = await storage.getPmsPayments({ propertyId, partyId, status: "success" });

      // Simple reconciliation logic
      // In production, this would be more sophisticated
      const matched: any[] = [];
      const unmatched: any[] = [];
      const discrepancies: any[] = [];

      // Match payments with accounts data
      for (const payment of payments) {
        const match = accountsData.find(
          (acc) =>
            Math.abs(Number(acc.amount) - Number(payment.amount)) < 0.01 &&
            Math.abs(
              new Date(acc.date).getTime() - (payment.paidOn ? new Date(payment.paidOn).getTime() : 0)
            ) < 86400000 // Within 24 hours
        );

        if (match) {
          matched.push({ payment, account: match });
        } else {
          unmatched.push(payment);
          discrepancies.push({
            type: "missing" as const,
            description: `Payment ${payment.referenceNo || payment.id} not found in accounts`,
          });
        }
      }

      // Find extra entries in accounts
      for (const account of accountsData) {
        const match = payments.find(
          (p) =>
            Math.abs(Number(account.amount) - Number(p.amount)) < 0.01 &&
            Math.abs(
              new Date(account.date).getTime() - (p.paidOn ? new Date(p.paidOn).getTime() : 0)
            ) < 86400000
        );

        if (!match) {
          discrepancies.push({
            type: "extra" as const,
            description: `Account entry ${account.refNo} not found in payments`,
          });
        }
      }

      return {
        matched: matched.length,
        unmatched: unmatched.length,
        discrepancies,
      };
    } catch (error) {
      console.error("Error reconciling ledger:", error);
      throw error;
    }
  }
}

export const ledgerService = new LedgerService();

