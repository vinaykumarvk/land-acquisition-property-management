/**
 * Receipt Service
 * Handles receipt generation for payments
 */

import { storage } from "../../storage";
import { InsertReceipt, Receipt, Payment, sequences } from "@shared/schema";
import { db } from "../../db";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";
import { jsPDF } from "jspdf";
import fs from "fs";
import path from "path";

export class ReceiptService {
  /**
   * Generate receipt number
   */
  private async generateReceiptNumber(): Promise<string> {
    const currentYear = new Date().getFullYear();
    const sequenceName = `RECEIPT-${currentYear}`;

    let sequence = await db
      .select()
      .from(sequences)
      .where(
        and(
          eq(sequences.sequenceName, sequenceName),
          eq(sequences.year, currentYear)
        )
      )
      .limit(1);

    if (sequence.length === 0) {
      await db.insert(sequences).values({
        sequenceName,
        year: currentYear,
        currentValue: 0,
      });
      sequence = await db
        .select()
        .from(sequences)
        .where(
          and(
            eq(sequences.sequenceName, sequenceName),
            eq(sequences.year, currentYear)
          )
        )
        .limit(1);
    }

    const nextValue = (sequence[0].currentValue || 0) + 1;
    await db
      .update(sequences)
      .set({ currentValue: nextValue })
      .where(eq(sequences.id, sequence[0].id));

    return `${sequenceName}-${String(nextValue).padStart(6, "0")}`;
  }

  /**
   * Generate receipt for payment
   */
  async generateReceipt(
    paymentId: number,
    userId: number
  ): Promise<Receipt> {
    try {
      const payment = await storage.getPmsPayment(paymentId);
      if (!payment) {
        throw new Error("Payment not found");
      }

      if (payment.status !== "success") {
        throw new Error("Receipt can only be generated for successful payments");
      }

      // Check if receipt already exists
      const existingReceipts = await storage.getReceipts({ paymentId });
      if (existingReceipts.length > 0) {
        return existingReceipts[0];
      }

      // Generate receipt number
      const receiptNo = await this.generateReceiptNumber();

      // Generate PDF
      const { filePath, hash } = await this.generateReceiptPDF(
        payment,
        receiptNo
      );

      // Generate verification URL
      const verifyUrl = `${process.env.APP_URL || "http://localhost:5000"}/api/public/property-management/receipts/verify/${hash}`;

      // Create receipt
      const receipt = await storage.createReceipt({
        paymentId,
        receiptNo,
        pdfPath: filePath,
        hashSha256: hash,
        qrCode: verifyUrl,
        issuedAt: new Date(),
        issuedBy: userId,
      });

      // Update payment with receipt path
      await storage.updatePmsPayment(paymentId, {
        receiptPdf: filePath,
      });

      return receipt;
    } catch (error) {
      console.error("Error generating receipt:", error);
      throw error;
    }
  }

  /**
   * Generate receipt PDF
   */
  private async generateReceiptPDF(
    payment: Payment,
    receiptNo: string
  ): Promise<{ filePath: string; hash: string }> {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(20);
    doc.text("PAYMENT RECEIPT", 105, 20, { align: "center" });

    // Receipt Number
    doc.setFontSize(14);
    doc.text(`Receipt No: ${receiptNo}`, 105, 35, { align: "center" });

    // Date
    doc.setFontSize(12);
    const paidDate = payment.paidOn ? new Date(payment.paidOn) : new Date();
    doc.text(
      `Date: ${paidDate.toLocaleDateString()}`,
      105,
      45,
      { align: "center" }
    );

    // Content
    let yPos = 65;
    doc.setFontSize(12);

    // Payment Details
    doc.setFont("helvetica", "bold");
    doc.text("Payment Details:", 15, yPos);
    yPos += 10;
    doc.setFont("helvetica", "normal");
    doc.text(`Amount: ₹${payment.amount}`, 15, yPos);
    yPos += 8;
    doc.text(`Mode: ${payment.mode.toUpperCase()}`, 15, yPos);
    yPos += 8;
    if (payment.refNo) {
      doc.text(`Reference: ${payment.refNo}`, 15, yPos);
      yPos += 8;
    }

    // Party Details
    const party = await storage.getParty(payment.partyId);
    if (party) {
      yPos += 10;
      doc.setFont("helvetica", "bold");
      doc.text("Party Details:", 15, yPos);
      yPos += 10;
      doc.setFont("helvetica", "normal");
      doc.text(`Name: ${party.name}`, 15, yPos);
      yPos += 8;
      doc.text(`Address: ${party.address}`, 15, yPos);
    }

    // Property Details (if available)
    if (payment.propertyId) {
      const property = await storage.getProperty(payment.propertyId);
      if (property) {
        yPos += 10;
        doc.setFont("helvetica", "bold");
        doc.text("Property Details:", 15, yPos);
        yPos += 10;
        doc.setFont("helvetica", "normal");
        doc.text(`Parcel No: ${property.parcelNo}`, 15, yPos);
        yPos += 8;
        doc.text(`Address: ${property.address}`, 15, yPos);
      }
    }

    // Generate hash
    const pdfBuffer = doc.output("arraybuffer");
    const hash = crypto
      .createHash("sha256")
      .update(Buffer.from(pdfBuffer))
      .digest("hex");

    // Add hash to footer
    doc.setFontSize(8);
    doc.text(`Document Hash: ${hash}`, 105, 280, { align: "center" });
    const verifyUrl = `${process.env.APP_URL || "http://localhost:5000"}/api/public/property-management/receipts/verify/${hash}`;
    doc.text(`Verify: ${verifyUrl}`, 105, 285, { align: "center" });

    // Save PDF
    const outputDir = path.join(process.cwd(), "uploads", "receipts");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    const filePath = path.join(
      outputDir,
      `receipt-${payment.id}-${Date.now()}.pdf`
    );
    fs.writeFileSync(filePath, Buffer.from(pdfBuffer));

    return { filePath, hash };
  }

  /**
   * Get receipt by ID
   */
  async getReceipt(id: number): Promise<Receipt> {
    try {
      const receipt = await storage.getReceipt(id);
      if (!receipt) {
        throw new Error("Receipt not found");
      }
      return receipt;
    } catch (error) {
      console.error("Error getting receipt:", error);
      throw error;
    }
  }

  /**
   * Get receipts with filters
   */
  async getReceipts(filters?: { paymentId?: number }): Promise<Receipt[]> {
    return await storage.getReceipts(filters);
  }
}

export const receiptService = new ReceiptService();

