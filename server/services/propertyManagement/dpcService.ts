/**
 * DPC Service (Development Permission Certificate)
 * Handles DPC request workflow with checklists and inspections
 */

import { storage } from "../../storage";
import { InsertDpcRequest, DpcRequest, InsertInspection } from "@shared/schema";
import crypto from "crypto";
import { jsPDF } from "jspdf";
import fs from "fs";
import path from "path";

export class DpcService {
  /**
   * Create DPC request
   */
  async createDpcRequest(
    requestData: Omit<InsertDpcRequest, "createdBy" | "requestNo" | "status">,
    userId: number
  ): Promise<DpcRequest> {
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
      const requestNo = await this.generateRequestNumber();

      const request = await storage.createDpcRequest({
        ...requestData,
        requestNo,
        createdBy: userId,
        status: "draft",
      });

      return request;
    } catch (error) {
      console.error("Error creating DPC request:", error);
      throw error;
    }
  }

  /**
   * Get DPC request by ID
   */
  async getDpcRequest(id: number): Promise<DpcRequest> {
    try {
      const request = await storage.getDpcRequest(id);
      if (!request) {
        throw new Error("DPC request not found");
      }
      return request;
    } catch (error) {
      console.error("Error getting DPC request:", error);
      throw error;
    }
  }

  /**
   * Get DPC requests with filters
   */
  async getDpcRequests(filters?: {
    propertyId?: number;
    status?: string;
  }): Promise<DpcRequest[]> {
    return await storage.getDpcRequests(filters);
  }

  /**
   * Update checklist
   */
  async updateChecklist(
    requestId: number,
    checklistJson: any,
    userId: number
  ): Promise<DpcRequest> {
    try {
      const request = await storage.getDpcRequest(requestId);
      if (!request) {
        throw new Error("DPC request not found");
      }

      if (!["draft", "checklist_pending"].includes(request.status)) {
        throw new Error(
          `Request must be in 'draft' or 'checklist_pending' status. Current: ${request.status}`
        );
      }

      const updated = await storage.updateDpcRequest(requestId, {
        checklistJson,
        status: "checklist_pending",
      });

      return updated;
    } catch (error) {
      console.error("Error updating checklist:", error);
      throw error;
    }
  }

  /**
   * Schedule inspection for DPC request
   */
  async scheduleInspection(
    requestId: number,
    scheduledAt: Date,
    inspectedBy: number,
    userId: number
  ): Promise<DpcRequest> {
    try {
      const request = await storage.getDpcRequest(requestId);
      if (!request) {
        throw new Error("DPC request not found");
      }

      if (!["checklist_pending", "draft"].includes(request.status)) {
        throw new Error(
          `Request must be in 'checklist_pending' or 'draft' status. Current: ${request.status}`
        );
      }

      // Validate checklist if provided
      if (request.checklistJson) {
        const checklist = request.checklistJson as any;
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
        propertyId: request.propertyId,
        type: "dpc",
        scheduledAt,
        inspectedBy,
        status: "scheduled",
      });

      const updated = await storage.updateDpcRequest(requestId, {
        status: "inspection_scheduled",
        inspectionId: inspection.id,
      });

      return updated;
    } catch (error) {
      console.error("Error scheduling inspection:", error);
      throw error;
    }
  }

  /**
   * Complete inspection
   */
  async completeInspection(
    requestId: number,
    inspectionResult: {
      resultJson: any;
      photos?: Array<{ path: string; lat?: number; lng?: number }>;
      remarks?: string;
    },
    userId: number
  ): Promise<DpcRequest> {
    try {
      const request = await storage.getDpcRequest(requestId);
      if (!request) {
        throw new Error("DPC request not found");
      }

      if (!request.inspectionId) {
        throw new Error("Inspection not scheduled for this request");
      }

      if (request.status !== "inspection_scheduled") {
        throw new Error(
          `Request must be in 'inspection_scheduled' status. Current: ${request.status}`
        );
      }

      // Update inspection
      await storage.updateInspection(request.inspectionId, {
        status: "completed",
        inspectedAt: new Date(),
        resultJson: inspectionResult.resultJson,
        photos: inspectionResult.photos as any,
        remarks: inspectionResult.remarks,
      });

      const updated = await storage.updateDpcRequest(requestId, {
        status: "inspection_completed",
      });

      return updated;
    } catch (error) {
      console.error("Error completing inspection:", error);
      throw error;
    }
  }

  /**
   * Issue DPC certificate
   */
  async issueCertificate(
    requestId: number,
    userId: number
  ): Promise<DpcRequest> {
    try {
      const request = await storage.getDpcRequest(requestId);
      if (!request) {
        throw new Error("DPC request not found");
      }

      if (request.status !== "inspection_completed") {
        throw new Error(
          `Request must have completed inspection. Current: ${request.status}`
        );
      }

      // Generate certificate number
      const certificateNo = await this.generateCertificateNumber();

      // Generate PDF
      const { filePath, hash } = await this.generateCertificatePDF(request, certificateNo);

      // Generate verification URL
      const verifyUrl = `${process.env.APP_URL || "http://localhost:5000"}/api/public/property-management/dpc/verify/${hash}`;

      const updated = await storage.updateDpcRequest(requestId, {
        status: "certificate_issued",
        certificateNo,
        pdfPath: filePath,
        hashSha256: hash,
        qrCode: verifyUrl,
        issuedAt: new Date(),
        issuedBy: userId,
      });

      return updated;
    } catch (error) {
      console.error("Error issuing certificate:", error);
      throw error;
    }
  }

  /**
   * Reject DPC request
   */
  async rejectRequest(
    requestId: number,
    reason: string,
    userId: number
  ): Promise<DpcRequest> {
    try {
      const request = await storage.getDpcRequest(requestId);
      if (!request) {
        throw new Error("DPC request not found");
      }

      if (["certificate_issued", "rejected"].includes(request.status)) {
        throw new Error(`Request cannot be rejected. Current status: ${request.status}`);
      }

      const updated = await storage.updateDpcRequest(requestId, {
        status: "rejected",
      });

      return updated;
    } catch (error) {
      console.error("Error rejecting request:", error);
      throw error;
    }
  }

  /**
   * Generate request number
   */
  private async generateRequestNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.getRequestCount(year);
    return `DPC-${year}-${String(count + 1).padStart(6, "0")}`;
  }

  /**
   * Generate certificate number
   */
  private async generateCertificateNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.getCertificateCount(year);
    return `DPC-CERT-${year}-${String(count + 1).padStart(6, "0")}`;
  }

  /**
   * Get request count for year
   */
  private async getRequestCount(year: number): Promise<number> {
    const requests = await storage.getDpcRequests();
    return requests.filter(
      (r) => r.requestNo?.startsWith(`DPC-${year}-`)
    ).length;
  }

  /**
   * Get certificate count for year
   */
  private async getCertificateCount(year: number): Promise<number> {
    const requests = await storage.getDpcRequests();
    return requests.filter(
      (r) => r.certificateNo?.startsWith(`DPC-CERT-${year}-`)
    ).length;
  }

  /**
   * Generate DPC certificate PDF
   */
  private async generateCertificatePDF(
    request: DpcRequest,
    certificateNo: string
  ): Promise<{ filePath: string; hash: string }> {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(20);
    doc.text("DEVELOPMENT PERMISSION CERTIFICATE", 105, 20, { align: "center" });

    // Certificate Number
    doc.setFontSize(12);
    doc.text(`Certificate No: ${certificateNo}`, 105, 35, { align: "center" });

    // Property Details
    const property = await storage.getProperty(request.propertyId);
    const party = await storage.getParty(request.partyId);
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
      yPos += 8;
      doc.text(`Land Use: ${property.landUse || "N/A"}`, 15, yPos);
    }

    // Party Details
    yPos += 5;
    doc.setFont("helvetica", "bold");
    doc.text("Owner Details:", 15, yPos);
    yPos += 10;
    doc.setFont("helvetica", "normal");
    if (party) {
      doc.text(`Name: ${party.name}`, 15, yPos);
      yPos += 8;
      if (party.aadhaar) {
        doc.text(`Aadhaar: ${party.aadhaar}`, 15, yPos);
        yPos += 8;
      }
    }

    // Request Details
    yPos += 5;
    doc.setFont("helvetica", "bold");
    doc.text("Request Details:", 15, yPos);
    yPos += 10;
    doc.setFont("helvetica", "normal");
    doc.text(`Request No: ${request.requestNo}`, 15, yPos);
    yPos += 8;
    if (request.requestDate) {
      doc.text(`Request Date: ${new Date(request.requestDate).toLocaleDateString()}`, 15, yPos);
      yPos += 8;
    }

    // Checklist (if provided)
    if (request.checklistJson) {
      yPos += 5;
      doc.setFont("helvetica", "bold");
      doc.text("Checklist Items:", 15, yPos);
      yPos += 10;
      doc.setFont("helvetica", "normal");
      const checklist = request.checklistJson as any;
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

    // Inspection Details
    if (request.inspectionId) {
      const inspection = await storage.getInspection(request.inspectionId);
      if (inspection && inspection.inspectedAt) {
        yPos += 5;
        doc.setFont("helvetica", "bold");
        doc.text("Inspection Details:", 15, yPos);
        yPos += 10;
        doc.setFont("helvetica", "normal");
        doc.text(`Inspection Date: ${new Date(inspection.inspectedAt).toLocaleDateString()}`, 15, yPos);
        yPos += 8;
        if (inspection.remarks) {
          doc.text(`Remarks: ${inspection.remarks}`, 15, yPos);
          yPos += 8;
        }
      }
    }

    // Issue Date
    yPos += 10;
    doc.setFont("helvetica", "bold");
    doc.text(`Issued on: ${new Date().toLocaleDateString()}`, 15, yPos);

    // Footer with QR code placeholder
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(10);
    doc.text("This certificate can be verified using the QR code below", 105, pageHeight - 30, { align: "center" });

    // Save PDF
    const pdfsDir = path.join(process.cwd(), "pdfs");
    if (!fs.existsSync(pdfsDir)) {
      fs.mkdirSync(pdfsDir, { recursive: true });
    }
    const fileName = `dpc_${request.id}_${Date.now()}.pdf`;
    const filePath = path.join(pdfsDir, fileName);
    doc.save(filePath);

    // Generate hash
    const pdfBuffer = fs.readFileSync(filePath);
    const hash = crypto.createHash("sha256").update(pdfBuffer).digest("hex");

    return { filePath, hash };
  }
}

export const dpcService = new DpcService();

