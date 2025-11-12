/**
 * Demarcation Service
 * Handles demarcation request workflow: request → inspection → certificate issuance
 */

import { storage } from "../../storage";
import { InsertDemarcationRequest, DemarcationRequest, InsertInspection } from "@shared/schema";
import crypto from "crypto";
import { jsPDF } from "jspdf";
import fs from "fs";
import path from "path";

export class DemarcationService {
  /**
   * Create demarcation request
   */
  async createDemarcationRequest(
    requestData: Omit<InsertDemarcationRequest, "createdBy" | "requestNo" | "status">,
    userId: number
  ): Promise<DemarcationRequest> {
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

      const request = await storage.createDemarcationRequest({
        ...requestData,
        requestNo,
        createdBy: userId,
        status: "draft",
      });

      return request;
    } catch (error) {
      console.error("Error creating demarcation request:", error);
      throw error;
    }
  }

  /**
   * Get demarcation request by ID
   */
  async getDemarcationRequest(id: number): Promise<DemarcationRequest> {
    try {
      const request = await storage.getDemarcationRequest(id);
      if (!request) {
        throw new Error("Demarcation request not found");
      }
      return request;
    } catch (error) {
      console.error("Error getting demarcation request:", error);
      throw error;
    }
  }

  /**
   * Get demarcation requests with filters
   */
  async getDemarcationRequests(filters?: {
    propertyId?: number;
    status?: string;
  }): Promise<DemarcationRequest[]> {
    return await storage.getDemarcationRequests(filters);
  }

  /**
   * Schedule inspection for demarcation request
   */
  async scheduleInspection(
    requestId: number,
    scheduledAt: Date,
    inspectedBy: number,
    userId: number
  ): Promise<DemarcationRequest> {
    try {
      const request = await storage.getDemarcationRequest(requestId);
      if (!request) {
        throw new Error("Demarcation request not found");
      }

      if (request.status !== "draft") {
        throw new Error(
          `Request must be in 'draft' status. Current: ${request.status}`
        );
      }

      // Create inspection record
      const inspection = await storage.createInspection({
        propertyId: request.propertyId,
        type: "demarcation",
        scheduledAt,
        inspectedBy,
        status: "scheduled",
      });

      const updated = await storage.updateDemarcationRequest(requestId, {
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
  ): Promise<DemarcationRequest> {
    try {
      const request = await storage.getDemarcationRequest(requestId);
      if (!request) {
        throw new Error("Demarcation request not found");
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
      } as Partial<InsertInspection>);

      const updated = await storage.updateDemarcationRequest(requestId, {
        status: "inspection_completed",
      });

      return updated;
    } catch (error) {
      console.error("Error completing inspection:", error);
      throw error;
    }
  }

  /**
   * Issue demarcation certificate
   */
  async issueCertificate(
    requestId: number,
    userId: number
  ): Promise<DemarcationRequest> {
    try {
      const request = await storage.getDemarcationRequest(requestId);
      if (!request) {
        throw new Error("Demarcation request not found");
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
      const verifyUrl = `${process.env.APP_URL || "http://localhost:5000"}/api/public/property-management/demarcation/verify/${hash}`;

      const updated = await storage.updateDemarcationRequest(requestId, {
        status: "certificate_issued",
        certificateNo,
        pdfPath: filePath,
        hashSha256: hash,
        qrCode: verifyUrl,
        issuedAt: new Date(),
        issuedBy: userId,
      } as Partial<InsertDemarcationRequest>);

      return updated;
    } catch (error) {
      console.error("Error issuing certificate:", error);
      throw error;
    }
  }

  /**
   * Reject demarcation request
   */
  async rejectRequest(
    requestId: number,
    reason: string,
    userId: number
  ): Promise<DemarcationRequest> {
    try {
      const request = await storage.getDemarcationRequest(requestId);
      if (!request) {
        throw new Error("Demarcation request not found");
      }

      if (["certificate_issued", "rejected"].includes(request.status)) {
        throw new Error(`Request cannot be rejected. Current status: ${request.status}`);
      }

      const updated = await storage.updateDemarcationRequest(requestId, {
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
    return `DEM-${year}-${String(count + 1).padStart(6, "0")}`;
  }

  /**
   * Generate certificate number
   */
  private async generateCertificateNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.getCertificateCount(year);
    return `DEM-CERT-${year}-${String(count + 1).padStart(6, "0")}`;
  }

  /**
   * Get request count for year
   */
  private async getRequestCount(year: number): Promise<number> {
    const requests = await storage.getDemarcationRequests();
    return requests.filter(
      (r) => r.requestNo?.startsWith(`DEM-${year}-`)
    ).length;
  }

  /**
   * Get certificate count for year
   */
  private async getCertificateCount(year: number): Promise<number> {
    const requests = await storage.getDemarcationRequests();
    return requests.filter(
      (r) => r.certificateNo?.startsWith(`DEM-CERT-${year}-`)
    ).length;
  }

  /**
   * Generate demarcation certificate PDF
   */
  private async generateCertificatePDF(
    request: DemarcationRequest,
    certificateNo: string
  ): Promise<{ filePath: string; hash: string }> {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(20);
    doc.text("DEMARCATION CERTIFICATE", 105, 20, { align: "center" });

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
      if (property.lat && property.lng) {
        doc.text(`Coordinates: ${property.lat}, ${property.lng}`, 15, yPos);
        yPos += 8;
      }
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
    const fileName = `demarcation_${request.id}_${Date.now()}.pdf`;
    const filePath = path.join(pdfsDir, fileName);
    doc.save(filePath);

    // Generate hash
    const pdfBuffer = fs.readFileSync(filePath);
    const hash = crypto.createHash("sha256").update(pdfBuffer).digest("hex");

    return { filePath, hash };
  }
}

export const demarcationService = new DemarcationService();

