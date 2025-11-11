/**
 * Conveyance Service
 * Handles conveyance deed generation from templates
 */

import { storage } from "../../storage";
import { InsertConveyanceDeed, ConveyanceDeed, Transfer } from "@shared/schema";
import { sequences } from "@shared/schema";
import { db } from "../../db";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";
import { jsPDF } from "jspdf";
import fs from "fs";
import path from "path";

export class ConveyanceService {
  /**
   * Generate deed number
   */
  private async generateDeedNumber(): Promise<string> {
    const currentYear = new Date().getFullYear();
    const sequenceName = `DEED-${currentYear}`;

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
   * Create conveyance deed
   */
  async createConveyanceDeed(
    deedData: Omit<InsertConveyanceDeed, "deedNo" | "createdBy">,
    userId: number
  ): Promise<ConveyanceDeed> {
    try {
      // Validate property exists
      const property = await storage.getProperty(deedData.propertyId);
      if (!property) {
        throw new Error("Property not found");
      }

      // Validate parties exist
      const fromParty = await storage.getParty(deedData.fromPartyId);
      const toParty = await storage.getParty(deedData.toPartyId);
      if (!fromParty || !toParty) {
        throw new Error("Party not found");
      }

      // Validate transfer if provided
      if (deedData.transferId) {
        const transfer = await storage.getTransfer(deedData.transferId);
        if (!transfer) {
          throw new Error("Transfer not found");
        }
        if (transfer.status !== "approved") {
          throw new Error("Transfer must be approved before creating deed");
        }
      }

      // Generate deed number
      const deedNo = await this.generateDeedNumber();

      const deed = await storage.createConveyanceDeed({
        ...deedData,
        deedNo,
        createdBy: userId,
        status: "draft",
      });

      return deed;
    } catch (error) {
      console.error("Error creating conveyance deed:", error);
      throw error;
    }
  }

  /**
   * Generate conveyance deed PDF
   */
  async generateDeedPDF(deedId: number, userId: number): Promise<ConveyanceDeed> {
    try {
      const deed = await storage.getConveyanceDeed(deedId);
      if (!deed) {
        throw new Error("Conveyance deed not found");
      }

      if (deed.status !== "draft") {
        throw new Error(
          `Deed must be in 'draft' status. Current: ${deed.status}`
        );
      }

      // Get related data
      const property = await storage.getProperty(deed.propertyId);
      const fromParty = await storage.getParty(deed.fromPartyId);
      const toParty = await storage.getParty(deed.toPartyId);
      if (!property || !fromParty || !toParty) {
        throw new Error("Property or party not found");
      }

      // Generate PDF
      const { filePath, hash } = await this.generateDeedPDFContent(
        deed,
        property,
        fromParty,
        toParty
      );

      // Generate verification URL
      const verifyUrl = `${process.env.APP_URL || "http://localhost:5000"}/api/public/property-management/conveyance-deeds/verify/${hash}`;

      const updated = await storage.updateConveyanceDeed(deedId, {
        status: "issued",
        pdfPath: filePath,
        hashSha256: hash,
        qrCode: verifyUrl,
      });

      return updated;
    } catch (error) {
      console.error("Error generating deed PDF:", error);
      throw error;
    }
  }

  /**
   * Generate deed PDF content
   */
  private async generateDeedPDFContent(
    deed: ConveyanceDeed,
    property: any,
    fromParty: any,
    toParty: any
  ): Promise<{ filePath: string; hash: string }> {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(20);
    doc.text("CONVEYANCE DEED", 105, 20, { align: "center" });

    // Deed Number
    doc.setFontSize(14);
    doc.text(`Deed No: ${deed.deedNo}`, 105, 35, { align: "center" });

    // Date
    doc.setFontSize(12);
    const deedDate = new Date(deed.deedDate);
    doc.text(
      `Date: ${deedDate.toLocaleDateString()}`,
      105,
      45,
      { align: "center" }
    );

    // Content
    let yPos = 65;
    doc.setFontSize(12);

    // Parties
    doc.setFont("helvetica", "bold");
    doc.text("Transferor (From):", 15, yPos);
    yPos += 10;
    doc.setFont("helvetica", "normal");
    doc.text(`Name: ${fromParty.name}`, 15, yPos);
    yPos += 8;
    doc.text(`Address: ${fromParty.address}`, 15, yPos);
    if (fromParty.aadhaar) {
      yPos += 8;
      doc.text(`Aadhaar: ${fromParty.aadhaar}`, 15, yPos);
    }

    yPos += 15;
    doc.setFont("helvetica", "bold");
    doc.text("Transferee (To):", 15, yPos);
    yPos += 10;
    doc.setFont("helvetica", "normal");
    doc.text(`Name: ${toParty.name}`, 15, yPos);
    yPos += 8;
    doc.text(`Address: ${toParty.address}`, 15, yPos);
    if (toParty.aadhaar) {
      yPos += 8;
      doc.text(`Aadhaar: ${toParty.aadhaar}`, 15, yPos);
    }

    // Property Details
    yPos += 15;
    doc.setFont("helvetica", "bold");
    doc.text("Property Details:", 15, yPos);
    yPos += 10;
    doc.setFont("helvetica", "normal");
    doc.text(`Parcel No: ${property.parcelNo}`, 15, yPos);
    yPos += 8;
    doc.text(`Address: ${property.address}`, 15, yPos);
    yPos += 8;
    doc.text(`Area: ${property.area} sq. units`, 15, yPos);

    // Deed Terms
    yPos += 15;
    doc.setFont("helvetica", "bold");
    doc.text("Terms and Conditions:", 15, yPos);
    yPos += 10;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const terms = [
      "1. The transferor hereby conveys the property to the transferee.",
      "2. All rights, title, and interest in the property are transferred.",
      "3. The transferee accepts the property as-is.",
      "4. All dues and charges are the responsibility of the transferee.",
    ];
    terms.forEach((term) => {
      const lines = doc.splitTextToSize(term, 180);
      doc.text(lines, 15, yPos);
      yPos += lines.length * 6;
    });

    // Generate hash
    const pdfBuffer = doc.output("arraybuffer");
    const hash = crypto
      .createHash("sha256")
      .update(Buffer.from(pdfBuffer))
      .digest("hex");

    // Add hash to footer
    doc.setFontSize(8);
    doc.text(`Document Hash: ${hash}`, 105, 280, { align: "center" });
    const verifyUrl = `${process.env.APP_URL || "http://localhost:5000"}/api/public/property-management/conveyance-deeds/verify/${hash}`;
    doc.text(`Verify: ${verifyUrl}`, 105, 285, { align: "center" });

    // Save PDF
    const outputDir = path.join(process.cwd(), "uploads", "conveyance-deeds");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    const filePath = path.join(
      outputDir,
      `deed-${deed.id}-${Date.now()}.pdf`
    );
    fs.writeFileSync(filePath, Buffer.from(pdfBuffer));

    return { filePath, hash };
  }

  /**
   * Get conveyance deed by ID
   */
  async getConveyanceDeed(id: number): Promise<ConveyanceDeed> {
    try {
      const deed = await storage.getConveyanceDeed(id);
      if (!deed) {
        throw new Error("Conveyance deed not found");
      }
      return deed;
    } catch (error) {
      console.error("Error getting conveyance deed:", error);
      throw error;
    }
  }

  /**
   * Get conveyance deeds with filters
   */
  async getConveyanceDeeds(filters?: {
    propertyId?: number;
    transferId?: number;
    status?: string;
  }): Promise<ConveyanceDeed[]> {
    return await storage.getConveyanceDeeds(filters);
  }
}

export const conveyanceService = new ConveyanceService();

