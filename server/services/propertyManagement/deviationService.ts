/**
 * Deviation Service
 * Handles construction deviation recording, fee calculation, and rectification workflow
 */

import { storage } from "../../storage";
import { InsertDeviation, Deviation, InsertInspection } from "@shared/schema";

export class DeviationService {
  /**
   * Record deviation
   */
  async recordDeviation(
    deviationData: Omit<InsertDeviation, "createdBy" | "status">,
    userId: number
  ): Promise<Deviation> {
    try {
      // Validate property exists
      const property = await storage.getProperty(deviationData.propertyId);
      if (!property) {
        throw new Error("Property not found");
      }

      // Validate party exists
      const party = await storage.getParty(deviationData.partyId);
      if (!party) {
        throw new Error("Party not found");
      }

      // Validate deviation type
      const validTypes = ["area", "height", "setback", "usage", "other"];
      if (!validTypes.includes(deviationData.deviationType)) {
        throw new Error(
          `Invalid deviation type. Must be one of: ${validTypes.join(", ")}`
        );
      }

      const deviation = await storage.createDeviation({
        ...deviationData,
        createdBy: userId,
        status: "recorded",
      });

      return deviation;
    } catch (error) {
      console.error("Error recording deviation:", error);
      throw error;
    }
  }

  /**
   * Get deviation by ID
   */
  async getDeviation(id: number): Promise<Deviation> {
    try {
      const deviation = await storage.getDeviation(id);
      if (!deviation) {
        throw new Error("Deviation not found");
      }
      return deviation;
    } catch (error) {
      console.error("Error getting deviation:", error);
      throw error;
    }
  }

  /**
   * Get deviations with filters
   */
  async getDeviations(filters?: {
    propertyId?: number;
    status?: string;
    deviationType?: string;
  }): Promise<Deviation[]> {
    return await storage.getDeviations(filters);
  }

  /**
   * Calculate and levy fee for deviation
   */
  async levyFee(
    deviationId: number,
    fee: number,
    userId: number,
    penalty?: number
  ): Promise<Deviation> {
    try {
      const deviation = await storage.getDeviation(deviationId);
      if (!deviation) {
        throw new Error("Deviation not found");
      }

      if (deviation.status !== "recorded") {
        throw new Error(
          `Deviation must be in 'recorded' status. Current: ${deviation.status}`
        );
      }

      const updated = await storage.updateDeviation(deviationId, {
        fee: fee.toString(),
        penalty: penalty ? penalty.toString() : null,
        status: "fee_levied",
      });

      return updated;
    } catch (error) {
      console.error("Error levying fee:", error);
      throw error;
    }
  }

  /**
   * Schedule inspection for deviation
   */
  async scheduleInspection(
    deviationId: number,
    scheduledAt: Date,
    inspectedBy: number,
    userId: number
  ): Promise<Deviation> {
    try {
      const deviation = await storage.getDeviation(deviationId);
      if (!deviation) {
        throw new Error("Deviation not found");
      }

      // Create inspection record
      const inspection = await storage.createInspection({
        propertyId: deviation.propertyId,
        type: "deviation",
        scheduledAt,
        inspectedBy,
        status: "scheduled",
      });

      const updated = await storage.updateDeviation(deviationId, {
        inspectionId: inspection.id,
      });

      return updated;
    } catch (error) {
      console.error("Error scheduling inspection:", error);
      throw error;
    }
  }

  /**
   * Record rectification
   */
  async recordRectification(
    deviationId: number,
    rectificationData: {
      photos?: Array<{ path: string; lat?: number; lng?: number }>;
      remarks?: string;
    },
    userId: number
  ): Promise<Deviation> {
    try {
      const deviation = await storage.getDeviation(deviationId);
      if (!deviation) {
        throw new Error("Deviation not found");
      }

      if (!["fee_levied", "recorded"].includes(deviation.status)) {
        throw new Error(
          `Deviation must be in 'fee_levied' or 'recorded' status. Current: ${deviation.status}`
        );
      }

      // Update inspection if exists
      if (deviation.inspectionId) {
        await storage.updateInspection(deviation.inspectionId, {
          status: "completed",
          inspectedAt: new Date(),
          photos: rectificationData.photos as any,
          remarks: rectificationData.remarks,
        } as Partial<InsertInspection>);
      }

      const updated = await storage.updateDeviation(deviationId, {
        status: "rectified",
        rectifiedAt: new Date(),
        rectifiedBy: userId,
      } as Partial<InsertDeviation>);

      return updated;
    } catch (error) {
      console.error("Error recording rectification:", error);
      throw error;
    }
  }

  /**
   * Approve rectification
   */
  async approveRectification(
    deviationId: number,
    userId: number
  ): Promise<Deviation> {
    try {
      const deviation = await storage.getDeviation(deviationId);
      if (!deviation) {
        throw new Error("Deviation not found");
      }

      if (deviation.status !== "rectified") {
        throw new Error(
          `Deviation must be rectified before approval. Current: ${deviation.status}`
        );
      }

      const updated = await storage.updateDeviation(deviationId, {
        status: "approved",
        approvedAt: new Date(),
        approvedBy: userId,
      } as Partial<InsertDeviation>);

      return updated;
    } catch (error) {
      console.error("Error approving rectification:", error);
      throw error;
    }
  }

  /**
   * Reject deviation/rectification
   */
  async rejectDeviation(
    deviationId: number,
    reason: string,
    userId: number
  ): Promise<Deviation> {
    try {
      const deviation = await storage.getDeviation(deviationId);
      if (!deviation) {
        throw new Error("Deviation not found");
      }

      if (["approved", "rejected"].includes(deviation.status)) {
        throw new Error(`Deviation cannot be rejected. Current status: ${deviation.status}`);
      }

      const updated = await storage.updateDeviation(deviationId, {
        status: "rejected",
      });

      return updated;
    } catch (error) {
      console.error("Error rejecting deviation:", error);
      throw error;
    }
  }

  /**
   * Calculate deviation fee based on type and severity
   * This is a placeholder - actual fee calculation logic should be implemented based on business rules
   */
  calculateFee(
    deviationType: string,
    oldValue: string,
    newValue: string,
    propertyArea?: number
  ): { fee: number; penalty: number } {
    // Placeholder fee calculation logic
    // In production, this should use configurable fee tables and formulas
    
    let baseFee = 0;
    let penalty = 0;

    switch (deviationType) {
      case "area":
        // Calculate based on area difference
        const areaDiff = parseFloat(newValue) - parseFloat(oldValue);
        baseFee = Math.abs(areaDiff) * 100; // 100 per unit
        penalty = baseFee * 0.1; // 10% penalty
        break;
      case "height":
        const heightDiff = parseFloat(newValue) - parseFloat(oldValue);
        baseFee = Math.abs(heightDiff) * 500; // 500 per unit
        penalty = baseFee * 0.15; // 15% penalty
        break;
      case "setback":
        baseFee = 5000; // Fixed fee
        penalty = baseFee * 0.2; // 20% penalty
        break;
      case "usage":
        baseFee = 10000; // Fixed fee for usage deviation
        penalty = baseFee * 0.25; // 25% penalty
        break;
      case "other":
        baseFee = 2000; // Default fee
        penalty = baseFee * 0.1; // 10% penalty
        break;
    }

    return { fee: baseFee, penalty };
  }
}

export const deviationService = new DeviationService();

