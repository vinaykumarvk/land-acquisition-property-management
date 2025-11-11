/**
 * NOC Service
 * Handles No Objection Certificate issuance with configurable checklists
 */

import { storage } from "../../storage";
import { InsertNOC, NOC } from "@shared/schema";
import crypto from "crypto";
import { jsPDF } from "jspdf";
import fs from "fs";
import path from "path";

export class NOCService {
  /**
   * Create NOC request
   */
  async createNOC(
    nocData: Omit<InsertNOC, "createdBy">,
    userId: number
  ): Promise<NOC> {
    try {
      // Validate property exists
      const property = await storage.getProperty(nocData.propertyId);
      if (!property) {
        throw new Error("Property not found");
      }

      // Validate NOC type
      const validTypes = [
        "sale",
        "mortgage",
        "possession",
        "construction",
        "transfer",
      ];
      if (!validTypes.includes(nocData.type)) {
        throw new Error(
          `Invalid NOC type. Must be one of: ${validTypes.join(", ")}`
        );
      }

      const noc = await storage.createNOC({
        ...nocData,
        createdBy: userId,
        status: "draft",
      });

      return noc;
    } catch (error) {
      console.error("Error creating NOC:", error);
      throw error;
    }
  }

  /**
   * Get NOC by ID
   */
  async getNOC(id: number): Promise<NOC> {
    try {
      const noc = await storage.getNOC(id);
      if (!noc) {
        throw new Error("NOC not found");
      }
      return noc;
    } catch (error) {
      console.error("Error getting NOC:", error);
      throw error;
    }
  }

  /**
   * Get NOCs with filters
   */
  async getNOCs(filters?: {
    propertyId?: number;
    type?: string;
    status?: string;
  }): Promise<NOC[]> {
    return await storage.getNOCs(filters);
  }

  /**
   * Approve NOC (checklist completion)
   */
  async approveNOC(nocId: number, userId: number): Promise<NOC> {
    try {
      const noc = await storage.getNOC(nocId);
      if (!noc) {
        throw new Error("NOC not found");
      }

      if (noc.status !== "under_review") {
        throw new Error(
          `NOC must be in 'under_review' status. Current: ${noc.status}`
        );
      }

      // Validate checklist if provided
      if (noc.checklistJson) {
        const checklist = noc.checklistJson as any;
        const incompleteItems = Object.entries(checklist).filter(
          ([_, value]) => !value
        );
        if (incompleteItems.length > 0) {
          throw new Error(
            `Checklist incomplete. Missing: ${incompleteItems.map(([key]) => key).join(", ")}`
          );
        }
      }

      const updated = await storage.updateNOC(nocId, {
        status: "approved",
      });

      return updated;
    } catch (error) {
      console.error("Error approving NOC:", error);
      throw error;
    }
  }

  /**
   * Issue NOC (generate PDF)
   */
  async issueNOC(nocId: number, userId: number): Promise<NOC> {
    try {
      const noc = await storage.getNOC(nocId);
      if (!noc) {
        throw new Error("NOC not found");
      }

      if (noc.status !== "approved") {
        throw new Error(
          `NOC must be approved before issuance. Current: ${noc.status}`
        );
      }

      // Generate PDF
      const { filePath, hash } = await this.generateNOCPDF(noc);

      // Generate verification URL
      const verifyUrl = `${process.env.APP_URL || "http://localhost:5000"}/api/public/property-management/nocs/verify/${hash}`;

      const updated = await storage.updateNOC(nocId, {
        status: "issued",
        pdfPath: filePath,
        hashSha256: hash,
        qrCode: verifyUrl,
        issuedAt: new Date(),
        issuedBy: userId,
      });

      return updated;
    } catch (error) {
      console.error("Error issuing NOC:", error);
      throw error;
    }
  }

  /**
   * Generate NOC PDF
   */
  private async generateNOCPDF(noc: NOC): Promise<{
    filePath: string;
    hash: string;
  }> {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(20);
    doc.text("NO OBJECTION CERTIFICATE", 105, 20, { align: "center" });

    // NOC Type
    doc.setFontSize(14);
    doc.text(`Type: ${noc.type.toUpperCase()}`, 105, 35, { align: "center" });

    // Property Details
    const property = await storage.getProperty(noc.propertyId);
    let yPos = 55;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Property Details:", 15, yPos);
    yPos += 10;
    doc.setFont("helvetica", "normal");
    if (property) {
      doc.text(`Parcel No: ${property.parcelNo}`, 15, yPos);
      yPos += 8;
      doc.text(`Address: ${property.address}`, 15, yPos);
      yPos += 8;
      doc.text(`Area: ${property.area} sq. units`, 15, yPos);
    }

    // Checklist (if provided)
    if (noc.checklistJson) {
      yPos += 10;
      doc.setFont("helvetica", "bold");
      doc.text("Checklist Items:", 15, yPos);
      yPos += 10;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const checklist = noc.checklistJson as any;
      Object.entries(checklist).forEach(([key, value]) => {
        const status = value ? "✓" : "✗";
        doc.text(`${status} ${key}`, 15, yPos);
        yPos += 7;
      });
    }

    // Issue Date
    yPos += 10;
    doc.setFontSize(12);
    doc.text(
      `Issued on: ${new Date().toLocaleDateString()}`,
      15,
      yPos
    );

    // Generate hash
    const pdfBuffer = doc.output("arraybuffer");
    const hash = crypto
      .createHash("sha256")
      .update(Buffer.from(pdfBuffer))
      .digest("hex");

    // Add hash to footer
    doc.setFontSize(8);
    doc.text(`Document Hash: ${hash}`, 105, 280, { align: "center" });
    const verifyUrl = `${process.env.APP_URL || "http://localhost:5000"}/api/public/property-management/nocs/verify/${hash}`;
    doc.text(`Verify: ${verifyUrl}`, 105, 285, { align: "center" });

    // Save PDF
    const outputDir = path.join(process.cwd(), "uploads", "nocs");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    const filePath = path.join(outputDir, `noc-${noc.id}-${Date.now()}.pdf`);
    fs.writeFileSync(filePath, Buffer.from(pdfBuffer));

    return { filePath, hash };
  }

  /**
   * Submit NOC for review
   */
  async submitForReview(nocId: number, userId: number): Promise<NOC> {
    try {
      const noc = await storage.getNOC(nocId);
      if (!noc) {
        throw new Error("NOC not found");
      }

      if (noc.status !== "draft") {
        throw new Error(
          `NOC must be in 'draft' status. Current: ${noc.status}`
        );
      }

      const updated = await storage.updateNOC(nocId, {
        status: "under_review",
      });

      return updated;
    } catch (error) {
      console.error("Error submitting NOC for review:", error);
      throw error;
    }
  }
}

export const nocService = new NOCService();

