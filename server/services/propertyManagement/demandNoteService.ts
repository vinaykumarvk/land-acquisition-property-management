/**
 * Demand Note Service
 * Handles demand note generation with payment schedules
 */

import { storage } from "../../storage";
import { InsertDemandNote, DemandNote, sequences } from "@shared/schema";
import { db } from "../../db";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";
import { jsPDF } from "jspdf";
import fs from "fs";
import path from "path";

export class DemandNoteService {
  /**
   * Generate demand note number
   */
  private async generateNoteNumber(): Promise<string> {
    const currentYear = new Date().getFullYear();
    const sequenceName = `DEMAND-${currentYear}`;

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
   * Create demand note
   */
  async createDemandNote(
    demandNoteData: Omit<InsertDemandNote, "noteNo" | "createdBy">,
    userId: number
  ): Promise<DemandNote> {
    try {
      // Validate property exists
      const property = await storage.getProperty(demandNoteData.propertyId);
      if (!property) {
        throw new Error("Property not found");
      }

      // Validate party exists
      const party = await storage.getParty(demandNoteData.partyId);
      if (!party) {
        throw new Error("Party not found");
      }

      // Generate note number
      const noteNo = await this.generateNoteNumber();

      const demandNote = await storage.createDemandNote({
        ...demandNoteData,
        noteNo,
        createdBy: userId,
        status: "draft",
      });

      return demandNote;
    } catch (error) {
      console.error("Error creating demand note:", error);
      throw error;
    }
  }

  /**
   * Issue demand note (generate PDF)
   */
  async issueDemandNote(
    demandNoteId: number,
    userId: number
  ): Promise<DemandNote> {
    try {
      const demandNote = await storage.getDemandNote(demandNoteId);
      if (!demandNote) {
        throw new Error("Demand note not found");
      }

      if (demandNote.status !== "draft") {
        throw new Error(
          `Demand note must be in 'draft' status. Current: ${demandNote.status}`
        );
      }

      // Get related data
      const property = await storage.getProperty(demandNote.propertyId);
      const party = await storage.getParty(demandNote.partyId);
      if (!property || !party) {
        throw new Error("Property or party not found");
      }

      // Generate PDF
      const { filePath, hash } = await this.generateDemandNotePDF(
        demandNote,
        property,
        party
      );

      // Generate verification URL
      const verifyUrl = `${process.env.APP_URL || "http://localhost:5000"}/api/public/property-management/demand-notes/verify/${hash}`;

      // Update demand note
      const updated = await storage.updateDemandNote(demandNoteId, {
        status: "issued",
        pdfPath: filePath,
        hashSha256: hash,
        qrCode: verifyUrl,
      });

      // Create ledger entry
      await this.createLedgerEntry(
        demandNote.propertyId,
        demandNote.partyId,
        "demand",
        demandNoteId,
        Number(demandNote.amount),
        0,
        `Demand Note ${demandNote.noteNo}`
      );

      return updated;
    } catch (error) {
      console.error("Error issuing demand note:", error);
      throw error;
    }
  }

  /**
   * Generate demand note PDF
   */
  private async generateDemandNotePDF(
    demandNote: DemandNote,
    property: any,
    party: any
  ): Promise<{ filePath: string; hash: string }> {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(20);
    doc.text("DEMAND NOTE", 105, 20, { align: "center" });

    // Note Number
    doc.setFontSize(14);
    doc.text(`Note No: ${demandNote.noteNo}`, 105, 35, { align: "center" });

    // Date
    doc.setFontSize(12);
    const dueDate = new Date(demandNote.dueDate);
    doc.text(
      `Due Date: ${dueDate.toLocaleDateString()}`,
      105,
      45,
      { align: "center" }
    );

    // Content
    let yPos = 65;
    doc.setFontSize(12);

    // Party Details
    doc.setFont("helvetica", "bold");
    doc.text("Party Details:", 15, yPos);
    yPos += 10;
    doc.setFont("helvetica", "normal");
    doc.text(`Name: ${party.name}`, 15, yPos);
    yPos += 8;
    doc.text(`Address: ${party.address}`, 15, yPos);

    // Property Details
    yPos += 15;
    doc.setFont("helvetica", "bold");
    doc.text("Property Details:", 15, yPos);
    yPos += 10;
    doc.setFont("helvetica", "normal");
    doc.text(`Parcel No: ${property.parcelNo}`, 15, yPos);
    yPos += 8;
    doc.text(`Address: ${property.address}`, 15, yPos);

    // Payment Schedule
    if (demandNote.scheduleJson) {
      yPos += 15;
      doc.setFont("helvetica", "bold");
      doc.text("Payment Schedule:", 15, yPos);
      yPos += 10;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const schedule = demandNote.scheduleJson as any;
      if (schedule.principal) {
        doc.text(`Principal: ₹${schedule.principal}`, 15, yPos);
        yPos += 7;
      }
      if (schedule.interest) {
        doc.text(`Interest: ₹${schedule.interest}`, 15, yPos);
        yPos += 7;
      }
      if (schedule.penalties) {
        doc.text(`Penalties: ₹${schedule.penalties}`, 15, yPos);
        yPos += 7;
      }
      if (schedule.waivers) {
        doc.text(`Waivers: -₹${schedule.waivers}`, 15, yPos);
        yPos += 7;
      }
    }

    // Total Amount
    yPos += 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(`Total Amount Due: ₹${demandNote.amount}`, 15, yPos);

    // Generate hash
    const pdfBuffer = doc.output("arraybuffer");
    const hash = crypto
      .createHash("sha256")
      .update(Buffer.from(pdfBuffer))
      .digest("hex");

    // Add hash to footer
    doc.setFontSize(8);
    doc.text(`Document Hash: ${hash}`, 105, 280, { align: "center" });
    const verifyUrl = `${process.env.APP_URL || "http://localhost:5000"}/api/public/property-management/demand-notes/verify/${hash}`;
    doc.text(`Verify: ${verifyUrl}`, 105, 285, { align: "center" });

    // Save PDF
    const outputDir = path.join(process.cwd(), "uploads", "demand-notes");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    const filePath = path.join(
      outputDir,
      `demand-note-${demandNote.id}-${Date.now()}.pdf`
    );
    fs.writeFileSync(filePath, Buffer.from(pdfBuffer));

    return { filePath, hash };
  }

  /**
   * Create ledger entry
   */
  private async createLedgerEntry(
    propertyId: number,
    partyId: number,
    transactionType: string,
    transactionId: number | null,
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
   * Mark demand note as overdue
   */
  async markOverdue(demandNoteId: number): Promise<DemandNote> {
    try {
      const demandNote = await storage.getDemandNote(demandNoteId);
      if (!demandNote) {
        throw new Error("Demand note not found");
      }

      if (!["issued", "part_paid"].includes(demandNote.status)) {
        throw new Error("Only issued or part_paid demand notes can be marked overdue");
      }

      const dueDate = new Date(demandNote.dueDate);
      if (dueDate >= new Date()) {
        throw new Error("Demand note is not yet overdue");
      }

      const updated = await storage.updateDemandNote(demandNoteId, {
        status: "overdue",
      });

      return updated;
    } catch (error) {
      console.error("Error marking demand note as overdue:", error);
      throw error;
    }
  }

  /**
   * Get demand note by ID
   */
  async getDemandNote(id: number): Promise<DemandNote> {
    try {
      const demandNote = await storage.getDemandNote(id);
      if (!demandNote) {
        throw new Error("Demand note not found");
      }
      return demandNote;
    } catch (error) {
      console.error("Error getting demand note:", error);
      throw error;
    }
  }

  /**
   * Get demand notes with filters
   */
  async getDemandNotes(filters?: {
    propertyId?: number;
    partyId?: number;
    status?: string;
  }): Promise<DemandNote[]> {
    return await storage.getDemandNotes(filters);
  }
}

export const demandNoteService = new DemandNoteService();

