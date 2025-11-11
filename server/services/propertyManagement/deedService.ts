/**
 * Deed Service
 * Handles deed preparation and management
 */

import { storage } from "../../storage";
import { InsertDeed, Deed, RegistrationCase, Property, Party } from "@shared/schema";
import { pdfService } from "../pdfService";
import * as crypto from "crypto";
import * as QRCode from "qrcode";

export class DeedService {
  /**
   * Prepare a deed for a registration case
   */
  async prepareDeed(
    registrationCaseId: number,
    userId: number
  ): Promise<Deed> {
    try {
      const registrationCase = await storage.getRegistrationCase(registrationCaseId);
      if (!registrationCase) {
        throw new Error("Registration case not found");
      }

      const property = await storage.getProperty(registrationCase.propertyId);
      if (!property) {
        throw new Error("Property not found");
      }

      const toParty = await storage.getParty(registrationCase.toPartyId);
      if (!toParty) {
        throw new Error("Transferee party not found");
      }

      const fromParty = registrationCase.fromPartyId
        ? await storage.getParty(registrationCase.fromPartyId)
        : null;

      // Generate deed number
      const deedNo = await this.generateDeedNumber(registrationCase.deedType);

      // Generate deed PDF
      const pdfPath = await this.generateDeedPDF(
        registrationCase,
        property,
        fromParty,
        toParty,
        deedNo
      );

      // Generate QR code and hash
      const verifyUrl = `${process.env.APP_URL || "http://localhost:5000"}/verify?type=deed&id=${deedNo}`;
      const qrCode = await QRCode.toDataURL(verifyUrl);
      
      // Read PDF and calculate hash
      const fs = await import("fs/promises");
      const pdfBuffer = await fs.readFile(pdfPath);
      const hashSha256 = crypto.createHash("sha256").update(pdfBuffer).digest("hex");

      // Create deed record
      const deed = await storage.createDeed({
        registrationCaseId,
        deedType: registrationCase.deedType,
        deedNo,
        deedDate: new Date(),
        pdfPath,
        qrCode,
        hashSha256,
        status: "prepared",
        createdBy: userId,
      });

      // Update registration case with deed path
      await storage.updateRegistrationCase(registrationCaseId, {
        deedPdfPath: pdfPath,
      });

      return deed;
    } catch (error) {
      console.error("Error preparing deed:", error);
      throw error;
    }
  }

  /**
   * Generate deed number (DEED-TYPE-YYYY-XXX)
   */
  private async generateDeedNumber(deedType: string): Promise<string> {
    const year = new Date().getFullYear();
    const sequenceName = `DEED-${deedType.toUpperCase()}`;
    
    // Get or create sequence
    let sequence = await storage.getSequence(sequenceName);
    if (!sequence || sequence.year !== year) {
      if (sequence) {
        await storage.updateSequence(sequence.id, { currentValue: 0, year });
      } else {
        sequence = await storage.createSequence({
          sequenceName,
          currentValue: 0,
          year,
        });
      }
    }

    // Increment sequence
    const newValue = sequence.currentValue + 1;
    await storage.updateSequence(sequence.id, { currentValue: newValue });

    return `${sequenceName}-${year}-${String(newValue).padStart(3, "0")}`;
  }

  /**
   * Generate deed PDF
   */
  private async generateDeedPDF(
    registrationCase: RegistrationCase,
    property: Property,
    fromParty: Party | null,
    toParty: Party,
    deedNo: string
  ): Promise<string> {
    const deedTypeLabels: Record<string, string> = {
      sale: "Sale Deed",
      gift: "Gift Deed",
      mortgage: "Mortgage Deed",
      lease: "Lease Deed",
      partition: "Partition Deed",
      exchange: "Exchange Deed",
      poa: "Power of Attorney",
      will: "Will",
    };

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; line-height: 1.6; }
          .header { text-align: center; margin-bottom: 30px; }
          .title { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
          .deed-no { font-size: 16px; color: #666; }
          .section { margin: 20px 0; }
          .label { font-weight: bold; margin-right: 10px; }
          .party-details { margin: 15px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
          .property-details { margin: 15px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
          .consideration { margin: 15px 0; padding: 15px; background-color: #f8f9fa; border-radius: 5px; }
          .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; }
          .signature-section { margin-top: 40px; }
          .signature-line { border-top: 1px solid #000; width: 200px; margin: 40px 20px 0 20px; display: inline-block; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">${deedTypeLabels[registrationCase.deedType] || registrationCase.deedType.toUpperCase()}</div>
          <div class="deed-no">Deed No: ${deedNo}</div>
        </div>

        <div class="section">
          <p>This deed is executed on ${new Date().toLocaleDateString()} between the parties mentioned below:</p>
        </div>

        ${fromParty ? `
          <div class="section">
            <div class="party-details">
              <strong>Transferor/First Party:</strong>
              <div>Name: ${fromParty.name}</div>
              <div>Address: ${fromParty.address}</div>
              ${fromParty.pan ? `<div>PAN: ${fromParty.pan}</div>` : ""}
              ${fromParty.aadhaar ? `<div>Aadhaar: ${fromParty.aadhaar}</div>` : ""}
            </div>
          </div>
        ` : ""}

        <div class="section">
          <div class="party-details">
            <strong>Transferee/Second Party:</strong>
            <div>Name: ${toParty.name}</div>
            <div>Address: ${toParty.address}</div>
            ${toParty.pan ? `<div>PAN: ${toParty.pan}</div>` : ""}
            ${toParty.aadhaar ? `<div>Aadhaar: ${toParty.aadhaar}</div>` : ""}
          </div>
        </div>

        <div class="section">
          <div class="property-details">
            <strong>Property Details:</strong>
            <div>Parcel No: ${property.parcelNo}</div>
            <div>Address: ${property.address}</div>
            <div>Area: ${property.area} sq meters</div>
            <div>Land Use: ${property.landUse || "N/A"}</div>
          </div>
        </div>

        ${registrationCase.considerationAmount ? `
          <div class="section">
            <div class="consideration">
              <strong>Consideration Amount:</strong> ₹${registrationCase.considerationAmount}
            </div>
          </div>
        ` : ""}

        <div class="section">
          <p><strong>Terms and Conditions:</strong></p>
          <p>The parties hereby agree to the terms and conditions as per the registration requirements and applicable laws.</p>
        </div>

        <div class="signature-section">
          ${fromParty ? `
            <div class="signature-line">
              <div style="text-align: center; margin-top: 5px;">Transferor</div>
            </div>
          ` : ""}
          <div class="signature-line">
            <div style="text-align: center; margin-top: 5px;">Transferee</div>
          </div>
        </div>

        <div class="footer">
          <p>This deed is prepared electronically and can be verified using the QR code.</p>
          <p>Generated on: ${new Date().toLocaleString()}</p>
        </div>
      </body>
      </html>
    `;

    const pdfPath = await pdfService.generatePDF(html, `deed_${deedNo}.pdf`);
    return pdfPath;
  }

  /**
   * Get deed by ID
   */
  async getDeed(id: number): Promise<Deed> {
    const deed = await storage.getDeed(id);
    if (!deed) {
      throw new Error("Deed not found");
    }
    return deed;
  }

  /**
   * Get deeds for a registration case
   */
  async getCaseDeeds(registrationCaseId: number): Promise<Deed[]> {
    return await storage.getDeeds({ registrationCaseId });
  }

  /**
   * Mark deed as registered
   */
  async markAsRegistered(deedId: number, registeredDeedPdfPath: string): Promise<Deed> {
    const deed = await storage.getDeed(deedId);
    if (!deed) {
      throw new Error("Deed not found");
    }

    return await storage.updateDeed(deedId, {
      status: "registered",
    });
  }
}

export const deedService = new DeedService();

