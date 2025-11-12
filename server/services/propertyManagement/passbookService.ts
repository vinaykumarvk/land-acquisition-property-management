/**
 * Passbook Service
 * Generates downloadable passbook PDF for property accounts
 */

import { storage } from "../../storage";
import { Property, Ledger } from "@shared/schema";
import { jsPDF } from "jspdf";
import fs from "fs";
import path from "path";
import crypto from "crypto";

export class PassbookService {
  /**
   * Generate passbook PDF
   */
  async generatePassbook(
    propertyId: number,
    partyId: number
  ): Promise<{ filePath: string; hash: string }> {
    try {
      const property = await storage.getProperty(propertyId);
      const party = await storage.getParty(partyId);
      if (!property || !party) {
        throw new Error("Property or party not found");
      }

      // Get ledger entries
      const ledgers = await storage.getLedgers({ propertyId, partyId });

      // Generate PDF
      const doc = new jsPDF();

      // Header
      doc.setFontSize(20);
      doc.text("PROPERTY ACCOUNT PASSBOOK", 105, 20, { align: "center" });

      // Property Details
      let yPos = 40;
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Property Details:", 15, yPos);
      yPos += 10;
      doc.setFont("helvetica", "normal");
      doc.text(`Parcel No: ${property.parcelNo}`, 15, yPos);
      yPos += 8;
      doc.text(`Address: ${property.address}`, 15, yPos);
      yPos += 8;
      doc.text(`Area: ${property.area} sq. units`, 15, yPos);

      // Party Details
      yPos += 10;
      doc.setFont("helvetica", "bold");
      doc.text("Account Holder:", 15, yPos);
      yPos += 10;
      doc.setFont("helvetica", "normal");
      doc.text(`Name: ${party.name}`, 15, yPos);
      yPos += 8;
      doc.text(`Address: ${party.address}`, 15, yPos);
      if (party.phone) {
        yPos += 8;
        doc.text(`Phone: ${party.phone}`, 15, yPos);
      }

      // Current Balance
      const currentBalance =
        ledgers.length > 0 ? Number(ledgers[ledgers.length - 1].balance) : 0;
      yPos += 15;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text(`Current Balance: ₹${currentBalance.toFixed(2)}`, 15, yPos);

      // Transaction History
      yPos += 20;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("Transaction History:", 15, yPos);
      yPos += 10;

      // Table header
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Date", 15, yPos);
      doc.text("Type", 50, yPos);
      doc.text("Description", 80, yPos);
      doc.text("Debit", 140, yPos);
      doc.text("Credit", 165, yPos);
      doc.text("Balance", 190, yPos);
      yPos += 8;

      // Table rows
      doc.setFont("helvetica", "normal");
      const rowsPerPage = 20;
      let rowCount = 0;

      for (const entry of ledgers.slice().reverse()) {
        if (rowCount > 0 && rowCount % rowsPerPage === 0) {
          doc.addPage();
          yPos = 20;
          // Redraw header
          doc.setFont("helvetica", "bold");
          doc.text("Date", 15, yPos);
          doc.text("Type", 50, yPos);
          doc.text("Description", 80, yPos);
          doc.text("Debit", 140, yPos);
          doc.text("Credit", 165, yPos);
          doc.text("Balance", 190, yPos);
          yPos += 8;
          doc.setFont("helvetica", "normal");
        }

        const date = entry.createdAt ? new Date(entry.createdAt).toLocaleDateString() : '';
        const debit = entry.debit ? `₹${Number(entry.debit).toFixed(2)}` : "-";
        const credit = entry.credit ? `₹${Number(entry.credit).toFixed(2)}` : "-";
        const balance = `₹${Number(entry.balance).toFixed(2)}`;
        const description = entry.description || entry.transactionType;

        doc.text(date, 15, yPos);
        doc.text(entry.transactionType, 50, yPos);
        const descLines = doc.splitTextToSize(description, 50);
        doc.text(descLines, 80, yPos);
        doc.text(debit, 140, yPos);
        doc.text(credit, 165, yPos);
        doc.text(balance, 190, yPos);
        yPos += Math.max(descLines.length * 4, 8);
        rowCount++;
      }

      // Summary
      const totalDebits = ledgers.reduce(
        (sum, e) => sum + (Number(e.debit) || 0),
        0
      );
      const totalCredits = ledgers.reduce(
        (sum, e) => sum + (Number(e.credit) || 0),
        0
      );

      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      yPos += 10;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("Summary:", 15, yPos);
      yPos += 10;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Total Debits: ₹${totalDebits.toFixed(2)}`, 15, yPos);
      yPos += 8;
      doc.text(`Total Credits: ₹${totalCredits.toFixed(2)}`, 15, yPos);
      yPos += 8;
      doc.setFont("helvetica", "bold");
      doc.text(`Current Balance: ₹${currentBalance.toFixed(2)}`, 15, yPos);

      // Footer
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(
        `Generated on: ${new Date().toLocaleString()}`,
        105,
        280,
        { align: "center" }
      );

      // Generate hash
      const pdfBuffer = doc.output("arraybuffer");
      const hash = crypto
        .createHash("sha256")
        .update(Buffer.from(pdfBuffer))
        .digest("hex");

      // Add hash to footer
      doc.text(`Document Hash: ${hash}`, 105, 285, { align: "center" });

      // Save PDF
      const outputDir = path.join(process.cwd(), "uploads", "passbooks");
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      const filePath = path.join(
        outputDir,
        `passbook-${propertyId}-${partyId}-${Date.now()}.pdf`
      );
      fs.writeFileSync(filePath, Buffer.from(pdfBuffer));

      return { filePath, hash };
    } catch (error) {
      console.error("Error generating passbook:", error);
      throw error;
    }
  }
}

export const passbookService = new PassbookService();

