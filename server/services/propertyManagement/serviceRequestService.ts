/**
 * Service Request Service
 * Handles citizen self-service requests (address change, duplicate documents, corrections, etc.)
 */

import { storage } from "../../storage";
import { InsertServiceRequest, ServiceRequest, sequences } from "@shared/schema";
import { db } from "../../db";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";

export class ServiceRequestService {
  /**
   * Generate reference number
   */
  private generateRefNo(): string {
    return `SR-${nanoid(8).toUpperCase()}`;
  }

  /**
   * Create service request
   */
  async createServiceRequest(
    requestData: Omit<InsertServiceRequest, "refNo">
  ): Promise<ServiceRequest> {
    try {
      // Validate property if provided
      if (requestData.propertyId) {
        const property = await storage.getProperty(requestData.propertyId);
        if (!property) {
          throw new Error("Property not found");
        }
      }

      // Validate party if provided
      if (requestData.partyId) {
        const party = await storage.getParty(requestData.partyId);
        if (!party) {
          throw new Error("Party not found");
        }
      }

      // Validate request type
      const validTypes = [
        "address_change",
        "duplicate_document",
        "correction",
        "noc_request",
        "passbook_request",
        "other",
      ];
      if (!validTypes.includes(requestData.requestType)) {
        throw new Error(
          `Invalid request type. Must be one of: ${validTypes.join(", ")}`
        );
      }

      // Generate reference number
      const refNo = this.generateRefNo();

      const serviceRequest = await storage.createServiceRequest({
        ...requestData,
        refNo,
        status: "new",
      });

      return serviceRequest;
    } catch (error) {
      console.error("Error creating service request:", error);
      throw error;
    }
  }

  /**
   * Get service request by ID or reference number
   */
  async getServiceRequest(idOrRef: string | number): Promise<ServiceRequest> {
    try {
      let request: ServiceRequest | undefined;

      if (typeof idOrRef === "number") {
        request = await storage.getServiceRequest(idOrRef);
      } else {
        // Search by reference number
        const requests = await storage.getServiceRequests({});
        request = requests.find((r) => r.refNo === idOrRef);
      }

      if (!request) {
        throw new Error("Service request not found");
      }

      return request;
    } catch (error) {
      console.error("Error getting service request:", error);
      throw error;
    }
  }

  /**
   * Get service requests with filters
   */
  async getServiceRequests(filters?: {
    propertyId?: number;
    partyId?: number;
    status?: string;
    requestType?: string;
  }): Promise<ServiceRequest[]> {
    return await storage.getServiceRequests(filters);
  }

  /**
   * Update service request status
   */
  async updateServiceRequestStatus(
    id: number,
    status: string,
    resolution?: string,
    assignedTo?: number
  ): Promise<ServiceRequest> {
    try {
      const request = await storage.getServiceRequest(id);
      if (!request) {
        throw new Error("Service request not found");
      }

      const updateData: any = { status };
      if (resolution) {
        updateData.resolution = resolution;
      }
      if (assignedTo) {
        updateData.assignedTo = assignedTo;
      }
      if (["completed", "closed"].includes(status)) {
        updateData.resolvedAt = new Date();
      }

      const updated = await storage.updateServiceRequest(id, updateData);

      return updated;
    } catch (error) {
      console.error("Error updating service request:", error);
      throw error;
    }
  }

  /**
   * Assign service request
   */
  async assignServiceRequest(
    id: number,
    userId: number
  ): Promise<ServiceRequest> {
    try {
      const request = await storage.getServiceRequest(id);
      if (!request) {
        throw new Error("Service request not found");
      }

      const updated = await storage.updateServiceRequest(id, {
        assignedTo: userId,
        status: request.status === "new" ? "under_review" : request.status,
      });

      return updated;
    } catch (error) {
      console.error("Error assigning service request:", error);
      throw error;
    }
  }
}

export const serviceRequestService = new ServiceRequestService();

