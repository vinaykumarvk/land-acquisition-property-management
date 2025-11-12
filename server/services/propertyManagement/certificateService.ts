/**
 * Certificate Service
 * Handles Occupancy Certificate (OC) and Completion Certificate (CC) issuance
 */

import { storage } from "../../storage";
import {
  InsertOccupancyCertificate,
  OccupancyCertificate,
  InsertCompletionCertificate,
  CompletionCertificate,
  InsertInspection,
} from "@shared/schema";
import crypto from "crypto";
import { jsPDF } from "jspdf";
import fs from "fs";
import path from "path";

export class CertificateService {
  // ========== Occupancy Certificate Methods ==========

  /**
   * Create Occupancy Certificate request
   */
  async createOccupancyCertificateRequest(
    requestData: Omit<InsertOccupancyCertificate, "createdBy" | "requestNo" | "status">,
    userId: number
  ): Promise<OccupancyCertificate> {
    try {
      // Validate property exists
      const property = await storage.getProperty(requestData.propertyId);
      if (!property) {
        throw new Error("Property not found");
      }

      // Validate party exists
      const party = await storage.getParty(requestData.partyId);
      if (!party) {
        throw new Error("Party not found");
      }

      // Generate request number
      const requestNo = await this.generateOCRequestNumber();

      const request = await storage.createOccupancyCertificate({
        ...requestData,
        requestNo,
        createdBy: userId,
        status: "draft",
      });

      return request;
    } catch (error) {
      console.error("Error creating OC request:", error);
      throw error;
    }
  }

  /**
   * Get Occupancy Certificate by ID
   */
  async getOccupancyCertificate(id: number): Promise<OccupancyCertificate> {
    try {
      const certificate = await storage.getOccupancyCertificate(id);
      if (!certificate) {
        throw new Error("Occupancy Certificate not found");
      }
      return certificate;
    } catch (error) {
      console.error("Error getting OC:", error);
      throw error;
    }
  }

  /**
   * Get Occupancy Certificates with filters
   */
  async getOccupancyCertificates(filters?: {
    propertyId?: number;
    status?: string;
  }): Promise<OccupancyCertificate[]> {
    return await storage.getOccupancyCertificates(filters);
  }

  /**
   * Update OC checklist
   */
  async updateOCChecklist(
    certificateId: number,
    checklistJson: any,
    userId: number
  ): Promise<OccupancyCertificate> {
    try {
      const certificate = await storage.getOccupancyCertificate(certificateId);
      if (!certificate) {
        throw new Error("Occupancy Certificate not found");
      }

      if (!["draft", "checklist_pending"].includes(certificate.status)) {
        throw new Error(
          `Certificate must be in 'draft' or 'checklist_pending' status. Current: ${certificate.status}`
        );
      }

      const updated = await storage.updateOccupancyCertificate(certificateId, {
        checklistJson,
        status: "checklist_pending",
      });

      return updated;
    } catch (error) {
      console.error("Error updating OC checklist:", error);
      throw error;
    }
  }

  /**
   * Schedule inspection for OC
   */
  async scheduleOCInspection(
    certificateId: number,
    scheduledAt: Date,
    inspectedBy: number,
    userId: number
  ): Promise<OccupancyCertificate> {
    try {
      const certificate = await storage.getOccupancyCertificate(certificateId);
      if (!certificate) {
        throw new Error("Occupancy Certificate not found");
      }

      if (!["checklist_pending", "draft"].includes(certificate.status)) {
        throw new Error(
          `Certificate must be in 'checklist_pending' or 'draft' status. Current: ${certificate.status}`
        );
      }

      // Validate checklist if provided
      if (certificate.checklistJson) {
        const checklist = certificate.checklistJson as any;
        const incompleteItems = Object.entries(checklist).filter(
          ([_, value]) => !value
        );
        if (incompleteItems.length > 0) {
          throw new Error(
            `Checklist incomplete. Missing: ${incompleteItems.map(([key]) => key).join(", ")}`
          );
        }
      }

      // Create inspection record
      const inspection = await storage.createInspection({
        propertyId: certificate.propertyId,
        type: "occupancy",
        scheduledAt,
        inspectedBy,
        status: "scheduled",
      });

      const updated = await storage.updateOccupancyCertificate(certificateId, {
        status: "inspection_scheduled",
        inspectionId: inspection.id,
      });

      return updated;
    } catch (error) {
      console.error("Error scheduling OC inspection:", error);
      throw error;
    }
  }

  /**
   * Complete OC inspection
   */
  async completeOCInspection(
    certificateId: number,
    inspectionResult: {
      resultJson: any;
      photos?: Array<{ path: string; lat?: number; lng?: number }>;
      remarks?: string;
    },
    userId: number
  ): Promise<OccupancyCertificate> {
    try {
      const certificate = await storage.getOccupancyCertificate(certificateId);
      if (!certificate) {
        throw new Error("Occupancy Certificate not found");
      }

      if (!certificate.inspectionId) {
        throw new Error("Inspection not scheduled for this certificate");
      }

      if (certificate.status !== "inspection_scheduled") {
        throw new Error(
          `Certificate must be in 'inspection_scheduled' status. Current: ${certificate.status}`
        );
      }

      // Update inspection
      await storage.updateInspection(certificate.inspectionId, {
        status: "completed",
        inspectedAt: new Date(),
        resultJson: inspectionResult.resultJson,
        photos: inspectionResult.photos as any,
        remarks: inspectionResult.remarks,
      } as Partial<InsertInspection>);

      const updated = await storage.updateOccupancyCertificate(certificateId, {
        status: "inspection_completed",
      });

      return updated;
    } catch (error) {
      console.error("Error completing OC inspection:", error);
      throw error;
    }
  }

  /**
   * Issue Occupancy Certificate
   */
  async issueOccupancyCertificate(
    certificateId: number,
    userId: number
  ): Promise<OccupancyCertificate> {
    try {
      const certificate = await storage.getOccupancyCertificate(certificateId);
      if (!certificate) {
        throw new Error("Occupancy Certificate not found");
      }

      if (certificate.status !== "inspection_completed") {
        throw new Error(
          `Certificate must have completed inspection. Current: ${certificate.status}`
        );
      }

      // Generate certificate number
      const certificateNo = await this.generateOCCertificateNumber();

      // Generate PDF
      const { filePath, hash } = await this.generateOCPDF(certificate, certificateNo);

      // Generate verification URL
      const verifyUrl = `${process.env.APP_URL || "http://localhost:5000"}/api/public/property-management/occupancy-certificate/verify/${hash}`;

      const updated = await storage.updateOccupancyCertificate(certificateId, {
        status: "certificate_issued",
        certificateNo,
        pdfPath: filePath,
        hashSha256: hash,
        qrCode: verifyUrl,
        issuedAt: new Date(),
        issuedBy: userId,
      } as Partial<InsertOccupancyCertificate>);

      return updated;
    } catch (error) {
      console.error("Error issuing OC:", error);
      throw error;
    }
  }

  // ========== Completion Certificate Methods ==========

  /**
   * Create Completion Certificate request
   */
  async createCompletionCertificateRequest(
    requestData: Omit<InsertCompletionCertificate, "createdBy" | "requestNo" | "status">,
    userId: number
  ): Promise<CompletionCertificate> {
    try {
      // Validate property exists
      const property = await storage.getProperty(requestData.propertyId);
      if (!property) {
        throw new Error("Property not found");
      }

      // Validate party exists
      const party = await storage.getParty(requestData.partyId);
      if (!party) {
        throw new Error("Party not found");
      }

      // Generate request number
      const requestNo = await this.generateCCRequestNumber();

      const request = await storage.createCompletionCertificate({
        ...requestData,
        requestNo,
        createdBy: userId,
        status: "draft",
      });

      return request;
    } catch (error) {
      console.error("Error creating CC request:", error);
      throw error;
    }
  }

  /**
   * Get Completion Certificate by ID
   */
  async getCompletionCertificate(id: number): Promise<CompletionCertificate> {
    try {
      const certificate = await storage.getCompletionCertificate(id);
      if (!certificate) {
        throw new Error("Completion Certificate not found");
      }
      return certificate;
    } catch (error) {
      console.error("Error getting CC:", error);
      throw error;
    }
  }

  /**
   * Get Completion Certificates with filters
   */
  async getCompletionCertificates(filters?: {
    propertyId?: number;
    status?: string;
  }): Promise<CompletionCertificate[]> {
    return await storage.getCompletionCertificates(filters);
  }

  /**
   * Update CC checklist
   */
  async updateCCChecklist(
    certificateId: number,
    checklistJson: any,
    userId: number
  ): Promise<CompletionCertificate> {
    try {
      const certificate = await storage.getCompletionCertificate(certificateId);
      if (!certificate) {
        throw new Error("Completion Certificate not found");
      }

      if (!["draft", "checklist_pending"].includes(certificate.status)) {
        throw new Error(
          `Certificate must be in 'draft' or 'checklist_pending' status. Current: ${certificate.status}`
        );
      }

      const updated = await storage.updateCompletionCertificate(certificateId, {
        checklistJson,
        status: "checklist_pending",
      });

      return updated;
    } catch (error) {
      console.error("Error updating CC checklist:", error);
      throw error;
    }
  }

  /**
   * Schedule inspection for CC
   */
  async scheduleCCInspection(
    certificateId: number,
    scheduledAt: Date,
    inspectedBy: number,
    userId: number
  ): Promise<CompletionCertificate> {
    try {
      const certificate = await storage.getCompletionCertificate(certificateId);
      if (!certificate) {
        throw new Error("Completion Certificate not found");
      }

      if (!["checklist_pending", "draft"].includes(certificate.status)) {
        throw new Error(
          `Certificate must be in 'checklist_pending' or 'draft' status. Current: ${certificate.status}`
        );
      }

      // Validate checklist if provided
      if (certificate.checklistJson) {
        const checklist = certificate.checklistJson as any;
        const incompleteItems = Object.entries(checklist).filter(
          ([_, value]) => !value
        );
        if (incompleteItems.length > 0) {
          throw new Error(
            `Checklist incomplete. Missing: ${incompleteItems.map(([key]) => key).join(", ")}`
          );
        }
      }

      // Create inspection record
      const inspection = await storage.createInspection({
        propertyId: certificate.propertyId,
        type: "completion",
        scheduledAt,
        inspectedBy,
        status: "scheduled",
      });

      const updated = await storage.updateCompletionCertificate(certificateId, {
        status: "inspection_scheduled",
        inspectionId: inspection.id,
      });

      return updated;
    } catch (error) {
      console.error("Error scheduling CC inspection:", error);
      throw error;
    }
  }

  /**
   * Complete CC inspection
   */
  async completeCCInspection(
    certificateId: number,
    inspectionResult: {
      resultJson: any;
      photos?: Array<{ path: string; lat?: number; lng?: number }>;
      remarks?: string;
    },
    userId: number
  ): Promise<CompletionCertificate> {
    try {
      const certificate = await storage.getCompletionCertificate(certificateId);
      if (!certificate) {
        throw new Error("Completion Certificate not found");
      }

      if (!certificate.inspectionId) {
        throw new Error("Inspection not scheduled for this certificate");
      }

      if (certificate.status !== "inspection_scheduled") {
        throw new Error(
          `Certificate must be in 'inspection_scheduled' status. Current: ${certificate.status}`
        );
      }

      // Update inspection
      await storage.updateInspection(certificate.inspectionId, {
        status: "completed",
        inspectedAt: new Date(),
        resultJson: inspectionResult.resultJson,
        photos: inspectionResult.photos as any,
        remarks: inspectionResult.remarks,
      } as Partial<InsertInspection>);

      const updated = await storage.updateCompletionCertificate(certificateId, {
        status: "inspection_completed",
      });

      return updated;
    } catch (error) {
      console.error("Error completing CC inspection:", error);
      throw error;
    }
  }

  /**
   * Issue Completion Certificate
   */
  async issueCompletionCertificate(
    certificateId: number,
    userId: number
  ): Promise<CompletionCertificate> {
    try {
      const certificate = await storage.getCompletionCertificate(certificateId);
      if (!certificate) {
        throw new Error("Completion Certificate not found");
      }

      if (certificate.status !== "inspection_completed") {
        throw new Error(
          `Certificate must have completed inspection. Current: ${certificate.status}`
        );
      }

      // Generate certificate number
      const certificateNo = await this.generateCCCertificateNumber();

      // Generate PDF
      const { filePath, hash } = await this.generateCCPDF(certificate, certificateNo);

      // Generate verification URL
      const verifyUrl = `${process.env.APP_URL || "http://localhost:5000"}/api/public/property-management/completion-certificate/verify/${hash}`;

      const updated = await storage.updateCompletionCertificate(certificateId, {
        status: "certificate_issued",
        certificateNo,
        pdfPath: filePath,
        hashSha256: hash,
        qrCode: verifyUrl,
        issuedAt: new Date(),
        issuedBy: userId,
      } as Partial<InsertCompletionCertificate>);

      return updated;
    } catch (error) {
      console.error("Error issuing CC:", error);
      throw error;
    }
  }

  // ========== Helper Methods ==========

  /**
   * Generate OC request number
   */
  private async generateOCRequestNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.getOCRequestCount(year);
    return `OC-${year}-${String(count + 1).padStart(6, "0")}`;
  }

  /**
   * Generate OC certificate number
   */
  private async generateOCCertificateNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.getOCCertificateCount(year);
    return `OC-CERT-${year}-${String(count + 1).padStart(6, "0")}`;
  }

  /**
   * Generate CC request number
   */
  private async generateCCRequestNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.getCCRequestCount(year);
    return `CC-${year}-${String(count + 1).padStart(6, "0")}`;
  }

  /**
   * Generate CC certificate number
   */
  private async generateCCCertificateNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.getCCCertificateCount(year);
    return `CC-CERT-${year}-${String(count + 1).padStart(6, "0")}`;
  }

  /**
   * Get OC request count for year
   */
  private async getOCRequestCount(year: number): Promise<number> {
    const requests = await storage.getOccupancyCertificates();
    return requests.filter(
      (r) => r.requestNo?.startsWith(`OC-${year}-`)
    ).length;
  }

  /**
   * Get OC certificate count for year
   */
  private async getOCCertificateCount(year: number): Promise<number> {
    const requests = await storage.getOccupancyCertificates();
    return requests.filter(
      (r) => r.certificateNo?.startsWith(`OC-CERT-${year}-`)
    ).length;
  }

  /**
   * Get CC request count for year
   */
  private async getCCRequestCount(year: number): Promise<number> {
    const requests = await storage.getCompletionCertificates();
    return requests.filter(
      (r) => r.requestNo?.startsWith(`CC-${year}-`)
    ).length;
  }

  /**
   * Get CC certificate count for year
   */
  private async getCCCertificateCount(year: number): Promise<number> {
    const requests = await storage.getCompletionCertificates();
    return requests.filter(
      (r) => r.certificateNo?.startsWith(`CC-CERT-${year}-`)
    ).length;
  }

  /**
   * Generate Occupancy Certificate PDF
   */
  private async generateOCPDF(
    certificate: OccupancyCertificate,
    certificateNo: string
  ): Promise<{ filePath: string; hash: string }> {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(20);
    doc.text("OCCUPANCY CERTIFICATE", 105, 20, { align: "center" });

    // Certificate Number
    doc.setFontSize(12);
    doc.text(`Certificate No: ${certificateNo}`, 105, 35, { align: "center" });

    // Property Details
    const property = await storage.getProperty(certificate.propertyId);
    const party = await storage.getParty(certificate.partyId);
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

    // Owner Details
    yPos += 5;
    doc.setFont("helvetica", "bold");
    doc.text("Owner Details:", 15, yPos);
    yPos += 10;
    doc.setFont("helvetica", "normal");
    if (party) {
      doc.text(`Name: ${party.name}`, 15, yPos);
      yPos += 8;
    }

    // Request Details
    yPos += 5;
    doc.setFont("helvetica", "bold");
    doc.text("Request Details:", 15, yPos);
    yPos += 10;
    doc.setFont("helvetica", "normal");
    doc.text(`Request No: ${certificate.requestNo}`, 15, yPos);
    yPos += 8;

    // Checklist (if provided)
    if (certificate.checklistJson) {
      yPos += 5;
      doc.setFont("helvetica", "bold");
      doc.text("Checklist Items:", 15, yPos);
      yPos += 10;
      doc.setFont("helvetica", "normal");
      const checklist = certificate.checklistJson as any;
      Object.entries(checklist).forEach(([key, value]) => {
        const status = value ? "✓" : "✗";
        doc.text(`${status} ${key}`, 15, yPos);
        yPos += 8;
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }
      });
    }

    // Issue Date
    yPos += 10;
    doc.setFont("helvetica", "bold");
    doc.text(`Issued on: ${new Date().toLocaleDateString()}`, 15, yPos);

    // Footer
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(10);
    doc.text("This certificate can be verified using the QR code below", 105, pageHeight - 30, { align: "center" });

    // Save PDF
    const pdfsDir = path.join(process.cwd(), "pdfs");
    if (!fs.existsSync(pdfsDir)) {
      fs.mkdirSync(pdfsDir, { recursive: true });
    }
    const fileName = `oc_${certificate.id}_${Date.now()}.pdf`;
    const filePath = path.join(pdfsDir, fileName);
    doc.save(filePath);

    // Generate hash
    const pdfBuffer = fs.readFileSync(filePath);
    const hash = crypto.createHash("sha256").update(pdfBuffer).digest("hex");

    return { filePath, hash };
  }

  /**
   * Generate Completion Certificate PDF
   */
  private async generateCCPDF(
    certificate: CompletionCertificate,
    certificateNo: string
  ): Promise<{ filePath: string; hash: string }> {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(20);
    doc.text("COMPLETION CERTIFICATE", 105, 20, { align: "center" });

    // Certificate Number
    doc.setFontSize(12);
    doc.text(`Certificate No: ${certificateNo}`, 105, 35, { align: "center" });

    // Property Details
    const property = await storage.getProperty(certificate.propertyId);
    const party = await storage.getParty(certificate.partyId);
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

    // Owner Details
    yPos += 5;
    doc.setFont("helvetica", "bold");
    doc.text("Owner Details:", 15, yPos);
    yPos += 10;
    doc.setFont("helvetica", "normal");
    if (party) {
      doc.text(`Name: ${party.name}`, 15, yPos);
      yPos += 8;
    }

    // Request Details
    yPos += 5;
    doc.setFont("helvetica", "bold");
    doc.text("Request Details:", 15, yPos);
    yPos += 10;
    doc.setFont("helvetica", "normal");
    doc.text(`Request No: ${certificate.requestNo}`, 15, yPos);
    yPos += 8;

    // Checklist (if provided)
    if (certificate.checklistJson) {
      yPos += 5;
      doc.setFont("helvetica", "bold");
      doc.text("Checklist Items:", 15, yPos);
      yPos += 10;
      doc.setFont("helvetica", "normal");
      const checklist = certificate.checklistJson as any;
      Object.entries(checklist).forEach(([key, value]) => {
        const status = value ? "✓" : "✗";
        doc.text(`${status} ${key}`, 15, yPos);
        yPos += 8;
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }
      });
    }

    // Issue Date
    yPos += 10;
    doc.setFont("helvetica", "bold");
    doc.text(`Issued on: ${new Date().toLocaleDateString()}`, 15, yPos);

    // Footer
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(10);
    doc.text("This certificate can be verified using the QR code below", 105, pageHeight - 30, { align: "center" });

    // Save PDF
    const pdfsDir = path.join(process.cwd(), "pdfs");
    if (!fs.existsSync(pdfsDir)) {
      fs.mkdirSync(pdfsDir, { recursive: true });
    }
    const fileName = `cc_${certificate.id}_${Date.now()}.pdf`;
    const filePath = path.join(pdfsDir, fileName);
    doc.save(filePath);

    // Generate hash
    const pdfBuffer = fs.readFileSync(filePath);
    const hash = crypto.createHash("sha256").update(pdfBuffer).digest("hex");

    return { filePath, hash };
  }
}

export const certificateService = new CertificateService();

