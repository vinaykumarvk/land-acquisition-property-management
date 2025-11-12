/**
 * Encumbrance Service
 * Handles encumbrance certificate generation and checks
 */

import { storage } from "../../storage";
import { InsertEncumbrance, Encumbrance, Property } from "@shared/schema";
import { pdfService } from "../pdfService";
import * as crypto from "crypto";
import * as QRCode from "qrcode";

export class EncumbranceService {
  /**
   * Check for encumbrances on a property
   */
  async checkEncumbrances(propertyId: number): Promise<{
    hasEncumbrances: boolean;
    mortgages: any[];
    charges: any[];
    otherEncumbrances: any[];
  }> {
    // Get all mortgages for the property
    const mortgages = await storage.getMortgages({ propertyId, status: "active" });

    // Get any other charges or encumbrances
    // TODO: In production, check for:
    // - Court orders/attachments
    // - Tax liens
    // - Other charges

    const hasEncumbrances = mortgages.length > 0;

    return {
      hasEncumbrances,
      mortgages: mortgages.map(m => ({
        id: m.id,
        mortgageeName: m.mortgageeName,
        mortgageAmount: m.mortgageAmount,
        mortgageDate: m.mortgageDate,
      })),
      charges: [],
      otherEncumbrances: [],
    };
  }

  /**
   * Generate encumbrance certificate
   */
  async generateEncumbranceCertificate(
    propertyId: number,
    registrationCaseId: number | null,
    userId: number
  ): Promise<Encumbrance> {
    try {
      // Get property details
      const property = await storage.getProperty(propertyId);
      if (!property) {
        throw new Error("Property not found");
      }

      // Check for encumbrances
      const encumbranceCheck = await this.checkEncumbrances(propertyId);

      // Generate certificate number
      const certNo = await this.generateCertificateNumber();

      // Prepare certificate data
      const detailsJson = {
        propertyId: property.id,
        parcelNo: property.parcelNo,
        address: property.address,
        area: property.area,
        encumbrances: encumbranceCheck,
        checkedAt: new Date().toISOString(),
      };

      // Generate PDF
      const pdfPath = await this.generateCertificatePDF(
        certNo,
        property,
        encumbranceCheck,
        detailsJson
      );

      // Generate QR code and hash
      const verifyUrl = `${process.env.APP_URL || "http://localhost:5000"}/verify?type=encumbrance&id=${certNo}`;
      const qrCode = await QRCode.toDataURL(verifyUrl);
      
      // Read PDF and calculate hash
      const fs = await import("fs/promises");
      const pdfBuffer = await fs.readFile(pdfPath);
      const hashSha256 = crypto.createHash("sha256").update(pdfBuffer).digest("hex");

      // Create encumbrance record
      const encumbrance = await storage.createEncumbrance({
        propertyId,
        registrationCaseId: registrationCaseId || null,
        certNo,
        detailsJson: detailsJson as any,
        certPdf: pdfPath,
        qrCode,
        hashSha256,
        issuedAt: new Date(),
        issuedBy: userId,
      });

      return encumbrance;
    } catch (error) {
      console.error("Error generating encumbrance certificate:", error);
      throw error;
    }
  }

  /**
   * Generate certificate number (ENC-YYYY-XXX)
   */
  private async generateCertificateNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const sequenceName = `ENC`;
    
    // Use getNextSequenceValue which handles sequence creation/updates automatically
    const newValue = await storage.getNextSequenceValue(sequenceName);

    return `${sequenceName}-${year}-${String(newValue).padStart(3, "0")}`;
  }

  /**
   * Generate encumbrance certificate PDF
   */
  private async generateCertificatePDF(
    certNo: string,
    property: Property,
    encumbranceCheck: any,
    detailsJson: any
  ): Promise<string> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; }
          .header { text-align: center; margin-bottom: 30px; }
          .title { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
          .cert-no { font-size: 16px; color: #666; }
          .section { margin: 20px 0; }
          .label { font-weight: bold; margin-right: 10px; }
          .encumbrance-status { padding: 10px; margin: 10px 0; border-radius: 5px; }
          .no-encumbrance { background-color: #d4edda; color: #155724; }
          .has-encumbrance { background-color: #f8d7da; color: #721c24; }
          .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; }
          .qr-code { text-align: center; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">ENCUMBRANCE CERTIFICATE</div>
          <div class="cert-no">Certificate No: ${certNo}</div>
        </div>

        <div class="section">
          <div><span class="label">Property Parcel No:</span> ${property.parcelNo}</div>
          <div><span class="label">Address:</span> ${property.address}</div>
          <div><span class="label">Area:</span> ${property.area} sq meters</div>
        </div>

        <div class="section">
          <div class="encumbrance-status ${encumbranceCheck.hasEncumbrances ? "has-encumbrance" : "no-encumbrance"}">
            <strong>Status:</strong> ${encumbranceCheck.hasEncumbrances ? "ENCUMBRANCES FOUND" : "NO ENCUMBRANCES"}
          </div>
        </div>

        ${encumbranceCheck.hasEncumbrances ? `
          <div class="section">
            <strong>Encumbrances Details:</strong>
            ${encumbranceCheck.mortgages.map((m: any) => `
              <div style="margin: 10px 0; padding: 10px; border-left: 3px solid #dc3545;">
                <div><strong>Mortgagee:</strong> ${m.mortgageeName}</div>
                <div><strong>Amount:</strong> ₹${m.mortgageAmount || "N/A"}</div>
                <div><strong>Date:</strong> ${m.mortgageDate ? new Date(m.mortgageDate).toLocaleDateString() : "N/A"}</div>
              </div>
            `).join("")}
          </div>
        ` : ""}

        <div class="section">
          <div><span class="label">Issued On:</span> ${new Date().toLocaleDateString()}</div>
        </div>

        <div class="footer">
          <p>This certificate is generated electronically and can be verified using the QR code.</p>
          <p>Certificate Hash: ${detailsJson.checkedAt}</p>
        </div>
      </body>
      </html>
    `;

    // TODO: Implement PDF generation from HTML
    // For now, save HTML to a file path
    const fs = require('fs');
    const path = require('path');
    const outputDir = process.env.PDF_OUTPUT_DIR || './pdfs';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    const pdfPath = path.join(outputDir, `encumbrance_${certNo}.html`);
    fs.writeFileSync(pdfPath, html);
    return pdfPath;
  }

  /**
   * Get encumbrance certificate by ID
   */
  async getEncumbrance(id: number): Promise<Encumbrance> {
    const encumbrance = await storage.getEncumbrance(id);
    if (!encumbrance) {
      throw new Error("Encumbrance certificate not found");
    }
    return encumbrance;
  }

  /**
   * Get encumbrances for a property
   */
  async getPropertyEncumbrances(propertyId: number): Promise<Encumbrance[]> {
    return await storage.getEncumbrances({ propertyId });
  }
}

export const encumbranceService = new EncumbranceService();

