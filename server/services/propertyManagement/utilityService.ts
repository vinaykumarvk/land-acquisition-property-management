/**
 * Utility Service
 * Common utility logic for water and sewerage connections
 * Handles GIS serviceability checks and fee calculations
 */

import { storage } from "../../storage";
import { Property } from "@shared/schema";

export class UtilityService {
  /**
   * Check serviceability via GIS
   * This is a stub that can be integrated with actual GIS services
   */
  async checkServiceability(
    propertyId: number,
    connectionType: "water" | "sewerage"
  ): Promise<{
    serviceable: boolean;
    reason?: string;
    distanceToNearestLine?: number; // in meters
    infrastructureAvailable?: boolean;
    details?: any;
  }> {
    try {
      const property = await storage.getProperty(propertyId);
      if (!property) {
        throw new Error("Property not found");
      }

      // Stub implementation - in production, this would:
      // 1. Query GIS service for nearest water/sewerage lines
      // 2. Check distance and capacity
      // 3. Verify infrastructure availability
      // 4. Return serviceability status

      // For now, return a mock response
      // In production, integrate with actual GIS API
      const mockServiceability = {
        serviceable: true,
        reason: "Infrastructure available within 100m",
        distanceToNearestLine: 50, // meters
        infrastructureAvailable: true,
        details: {
          nearestLineId: "WL-001",
          capacity: "sufficient",
          estimatedConnectionCost: 5000,
        },
      };

      return mockServiceability;
    } catch (error) {
      console.error("Error checking serviceability:", error);
      throw error;
    }
  }

  /**
   * Calculate connection fee based on property and connection type
   */
  async calculateConnectionFee(
    propertyId: number,
    connectionType: "water" | "sewerage",
    connectionCategory: "domestic" | "commercial" | "industrial"
  ): Promise<number> {
    try {
      const property = await storage.getProperty(propertyId);
      if (!property) {
        throw new Error("Property not found");
      }

      // Fee structure (in production, this would come from configuration)
      const feeStructure: Record<
        "water" | "sewerage",
        Record<"domestic" | "commercial" | "industrial", number>
      > = {
        water: {
          domestic: 5000,
          commercial: 15000,
          industrial: 50000,
        },
        sewerage: {
          domestic: 3000,
          commercial: 10000,
          industrial: 30000,
        },
      };

      // Base fee
      let fee = feeStructure[connectionType][connectionCategory];

      // Additional charges based on property area (if applicable)
      // This is a simplified calculation
      const area = Number(property.area) || 0;
      if (area > 500) {
        // Large properties may have additional charges
        fee += (area - 500) * 10; // 10 per sq meter above 500
      }

      return fee;
    } catch (error) {
      console.error("Error calculating connection fee:", error);
      throw error;
    }
  }

  /**
   * Calculate SLA deadline based on connection type and status
   */
  calculateSLADeadline(
    connectionType: "water" | "sewerage",
    currentStatus: string
  ): Date {
    const now = new Date();
    let hoursToAdd = 0;

    // SLA hours based on status
    // In production, this would come from configuration
    switch (currentStatus) {
      case "applied":
        hoursToAdd = 24; // Serviceability check within 24 hours
        break;
      case "serviceability_checked":
        hoursToAdd = 48; // Inspection scheduling within 48 hours
        break;
      case "inspection_scheduled":
        hoursToAdd = 72; // Inspection completion within 72 hours
        break;
      case "inspection_completed":
        hoursToAdd = 24; // Sanction within 24 hours
        break;
      default:
        hoursToAdd = 168; // Default 7 days
    }

    const deadline = new Date(now.getTime() + hoursToAdd * 60 * 60 * 1000);
    return deadline;
  }

  /**
   * Validate connection application data
   */
  validateConnectionApplication(data: {
    propertyId: number;
    partyId: number;
    connectionType: string;
    connectionCategory: string;
  }): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.propertyId) {
      errors.push("Property ID is required");
    }

    if (!data.partyId) {
      errors.push("Party ID is required");
    }

    const validConnectionTypes = ["water", "sewerage"];
    if (!validConnectionTypes.includes(data.connectionType)) {
      errors.push(
        `Invalid connection type. Must be one of: ${validConnectionTypes.join(", ")}`
      );
    }

    const validCategories = ["domestic", "commercial", "industrial"];
    if (!validCategories.includes(data.connectionCategory)) {
      errors.push(
        `Invalid connection category. Must be one of: ${validCategories.join(", ")}`
      );
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export const utilityService = new UtilityService();

