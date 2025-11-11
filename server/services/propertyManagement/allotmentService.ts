/**
 * Allotment Service
 * Handles allotment letter generation with QR codes and integrity hashes
 */

import { storage } from "../../storage";
import { pdfService } from "../pdfService";
import { InsertAllotment, Allotment, Property, Party, Application, sequences } from "@shared/schema";
import { db } from "../../db";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

export class AllotmentService {
  /**
   * Generate allotment letter number
   */
  private async generateLetterNumber(): Promise<string> {
    const currentYear = new Date().getFullYear();
    const sequenceName = `ALLOT-${currentYear}`;

    // Get or create sequence
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
      // Create new sequence
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

    // Increment and get next value
    const nextValue = (sequence[0].currentValue || 0) + 1;
    await db
      .update(sequences)
      .set({ currentValue: nextValue })
      .where(eq(sequences.id, sequence[0].id));

    return `${sequenceName}-${String(nextValue).padStart(6, "0")}`;
  }

  /**
   * Create allotment
   */
  async createAllotment(
    allotmentData: Omit<InsertAllotment, "letterNo" | "createdBy">,
    userId: number
  ): Promise<Allotment> {
    try {
      // Validate property exists
      const property = await storage.getProperty(allotmentData.propertyId);
      if (!property) {
        throw new Error("Property not found");
      }

      // Validate property is available
      if (property.status !== "available") {
        throw new Error(
          `Property is not available for allotment. Current status: ${property.status}`
        );
      }

      // Validate party exists
      const party = await storage.getParty(allotmentData.partyId);
      if (!party) {
        throw new Error("Party not found");
      }

      // Validate application if provided
      if (allotmentData.applicationId) {
        const application = await storage.getApplication(
          allotmentData.applicationId
        );
        if (!application) {
          throw new Error("Application not found");
        }
        if (application.status !== "selected") {
          throw new Error(
            "Application must be in 'selected' status to create allotment"
          );
        }
      }

      // Generate letter number
      const letterNo = await this.generateLetterNumber();

      const allotment = await storage.createAllotment({
        ...allotmentData,
        letterNo,
        createdBy: userId,
        status: "draft",
      });

      return allotment;
    } catch (error) {
      console.error("Error creating allotment:", error);
      throw error;
    }
  }

  /**
   * Generate and issue allotment letter
   */
  async issueAllotmentLetter(
    allotmentId: number,
    userId: number
  ): Promise<Allotment> {
    try {
      const allotment = await storage.getAllotment(allotmentId);
      if (!allotment) {
        throw new Error("Allotment not found");
      }

      if (allotment.status !== "draft") {
        throw new Error(
          `Allotment must be in 'draft' status. Current status: ${allotment.status}`
        );
      }

      // Get related data
      const property = await storage.getProperty(allotment.propertyId);
      const party = await storage.getParty(allotment.partyId);
      if (!property || !party) {
        throw new Error("Property or party not found");
      }

      // Generate PDF
      const { filePath, hash } = await this.generateAllotmentLetterPDF(
        allotment,
        property,
        party
      );

      // Generate verification URL for QR code
      const verifyUrl = `${process.env.APP_URL || "http://localhost:5000"}/api/public/property-management/allotments/verify/${hash}`;

      // Update allotment
      const updated = await storage.updateAllotment(allotmentId, {
        status: "issued",
        pdfPath: filePath,
        hashSha256: hash,
        qrCode: verifyUrl,
      });

      // Update property status
      await storage.updateProperty(property.id, {
        status: "allotted",
      });

      // Update application status if linked
      if (allotment.applicationId) {
        await storage.updateApplication(allotment.applicationId, {
          status: "allotted",
        });
      }

      // Create ownership record
      const existingOwnership = await storage.getPropertyOwners(property.id);
      if (existingOwnership.length === 0) {
        await storage.createOwnership({
          propertyId: property.id,
          partyId: party.id,
          sharePct: "100.00",
        });
      }

      return updated;
    } catch (error) {
      console.error("Error issuing allotment letter:", error);
      throw error;
    }
  }

  /**
   * Generate allotment letter PDF
   */
  private async generateAllotmentLetterPDF(
    allotment: Allotment,
    property: Property,
    party: Party
  ): Promise<{ filePath: string; hash: string }> {
    // Use existing PDF service pattern
    const { jsPDF } = await import("jspdf");
    const fs = await import("fs");
    const path = await import("path");
    const crypto = await import("crypto");

    const doc = new jsPDF();

    // Header
    doc.setFontSize(20);
    doc.text("ALLOTMENT LETTER", 105, 20, { align: "center" });

    // Letter Number
    doc.setFontSize(14);
    doc.text(`Letter No: ${allotment.letterNo}`, 105, 35, { align: "center" });

    // Date
    doc.setFontSize(12);
    const issueDate = new Date(allotment.issueDate);
    doc.text(
      `Date: ${issueDate.toLocaleDateString()}`,
      105,
      45,
      { align: "center" }
    );

    // Content
    let yPos = 65;
    doc.setFontSize(12);

    // Party Details
    doc.setFont("helvetica", "bold");
    doc.text("Allottee Details:", 15, yPos);
    yPos += 10;
    doc.setFont("helvetica", "normal");
    doc.text(`Name: ${party.name}`, 15, yPos);
    yPos += 8;
    doc.text(`Address: ${party.address}`, 15, yPos);
    yPos += 8;
    if (party.phone) {
      doc.text(`Phone: ${party.phone}`, 15, yPos);
      yPos += 8;
    }
    if (party.aadhaar) {
      doc.text(`Aadhaar: ${party.aadhaar}`, 15, yPos);
      yPos += 8;
    }

    // Property Details
    yPos += 10;
    doc.setFont("helvetica", "bold");
    doc.text("Property Details:", 15, yPos);
    yPos += 10;
    doc.setFont("helvetica", "normal");
    doc.text(`Parcel No: ${property.parcelNo}`, 15, yPos);
    yPos += 8;
    doc.text(`Address: ${property.address}`, 15, yPos);
    yPos += 8;
    doc.text(`Area: ${property.area} sq. units`, 15, yPos);
    yPos += 8;
    doc.text(`Land Use: ${property.landUse || "N/A"}`, 15, yPos);

    // Allotment Terms
    yPos += 15;
    doc.setFont("helvetica", "bold");
    doc.text("Terms and Conditions:", 15, yPos);
    yPos += 10;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const terms = [
      "1. This allotment is subject to payment of all dues as per schedule.",
      "2. The allottee must accept this allotment within 30 days.",
      "3. Failure to accept may result in cancellation of allotment.",
      "4. All terms and conditions of the scheme apply.",
    ];
    terms.forEach((term) => {
      const lines = doc.splitTextToSize(term, 180);
      doc.text(lines, 15, yPos);
      yPos += lines.length * 6;
    });

    // Generate hash
    const pdfBuffer = doc.output("arraybuffer");
    const hash = crypto.createHash("sha256").update(Buffer.from(pdfBuffer)).digest("hex");

    // Add hash to footer
    doc.setFontSize(8);
    doc.text(`Document Hash: ${hash}`, 105, 280, { align: "center" });
    const verifyUrl = `${process.env.APP_URL || "http://localhost:5000"}/api/public/property-management/allotments/verify/${hash}`;
    doc.text(`Verify: ${verifyUrl}`, 105, 285, { align: "center" });

    // Save PDF
    const outputDir = path.join(process.cwd(), "uploads", "allotments");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    const filePath = path.join(
      outputDir,
      `allotment-${allotment.id}-${Date.now()}.pdf`
    );
    fs.writeFileSync(filePath, Buffer.from(pdfBuffer));

    return { filePath, hash };
  }

  /**
   * Accept allotment
   */
  async acceptAllotment(allotmentId: number): Promise<Allotment> {
    try {
      const allotment = await storage.getAllotment(allotmentId);
      if (!allotment) {
        throw new Error("Allotment not found");
      }

      if (allotment.status !== "issued") {
        throw new Error(
          `Allotment must be in 'issued' status. Current status: ${allotment.status}`
        );
      }

      const updated = await storage.updateAllotment(allotmentId, {
        status: "accepted",
      });

      return updated;
    } catch (error) {
      console.error("Error accepting allotment:", error);
      throw error;
    }
  }

  /**
   * Cancel allotment
   */
  async cancelAllotment(
    allotmentId: number,
    reason: string,
    userId: number
  ): Promise<Allotment> {
    try {
      const allotment = await storage.getAllotment(allotmentId);
      if (!allotment) {
        throw new Error("Allotment not found");
      }

      if (!["issued", "accepted"].includes(allotment.status)) {
        throw new Error(
          `Allotment cannot be cancelled. Current status: ${allotment.status}`
        );
      }

      const updated = await storage.updateAllotment(allotmentId, {
        status: "cancelled",
      });

      // Update property status back to available
      await storage.updateProperty(allotment.propertyId, {
        status: "available",
      });

      return updated;
    } catch (error) {
      console.error("Error cancelling allotment:", error);
      throw error;
    }
  }

  /**
   * Get allotment with details
   */
  async getAllotmentWithDetails(allotmentId: number): Promise<any> {
    try {
      const allotment = await storage.getAllotment(allotmentId);
      if (!allotment) {
        throw new Error("Allotment not found");
      }

      const property = await storage.getProperty(allotment.propertyId);
      const party = await storage.getParty(allotment.partyId);
      const application = allotment.applicationId
        ? await storage.getApplication(allotment.applicationId)
        : null;

      return {
        ...allotment,
        property,
        party,
        application,
      };
    } catch (error) {
      console.error("Error getting allotment details:", error);
      throw error;
    }
  }
}

export const allotmentService = new AllotmentService();

