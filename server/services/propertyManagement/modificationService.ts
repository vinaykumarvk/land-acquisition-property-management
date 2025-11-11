/**
 * Modification Service
 * Handles property modifications (area/usage/partner/firm changes)
 */

import { storage } from "../../storage";
import { InsertModification, Modification } from "@shared/schema";

export class ModificationService {
  /**
   * Create modification request
   */
  async createModification(
    modificationData: Omit<InsertModification, "createdBy">,
    userId: number
  ): Promise<Modification> {
    try {
      // Validate property exists
      const property = await storage.getProperty(modificationData.propertyId);
      if (!property) {
        throw new Error("Property not found");
      }

      // Validate modification kind
      const validKinds = ["area", "usage", "partner", "firm"];
      if (!validKinds.includes(modificationData.kind)) {
        throw new Error(
          `Invalid modification kind. Must be one of: ${validKinds.join(", ")}`
        );
      }

      // Store old values
      const oldValues: any = {};
      if (modificationData.kind === "area") {
        oldValues.area = property.area;
      } else if (modificationData.kind === "usage") {
        oldValues.landUse = property.landUse;
      }
      // For partner/firm, would need to get current ownership details

      const modification = await storage.createModification({
        ...modificationData,
        oldJson: oldValues,
        createdBy: userId,
        status: "draft",
      });

      return modification;
    } catch (error) {
      console.error("Error creating modification:", error);
      throw error;
    }
  }

  /**
   * Get modification by ID
   */
  async getModification(id: number): Promise<Modification> {
    try {
      const modification = await storage.getModification(id);
      if (!modification) {
        throw new Error("Modification not found");
      }
      return modification;
    } catch (error) {
      console.error("Error getting modification:", error);
      throw error;
    }
  }

  /**
   * Get modifications with filters
   */
  async getModifications(filters?: {
    propertyId?: number;
    status?: string;
  }): Promise<Modification[]> {
    return await storage.getModifications(filters);
  }

  /**
   * Approve modification
   */
  async approveModification(
    modificationId: number,
    userId: number
  ): Promise<Modification> {
    try {
      const modification = await storage.getModification(modificationId);
      if (!modification) {
        throw new Error("Modification not found");
      }

      if (modification.status !== "under_review") {
        throw new Error(
          `Modification must be in 'under_review' status. Current: ${modification.status}`
        );
      }

      // Apply modification to property
      const property = await storage.getProperty(modification.propertyId);
      if (!property) {
        throw new Error("Property not found");
      }

      const newValues = modification.newJson as any;
      const updateData: any = {};

      if (modification.kind === "area" && newValues.area) {
        updateData.area = newValues.area;
      } else if (modification.kind === "usage" && newValues.landUse) {
        updateData.landUse = newValues.landUse;
      }
      // For partner/firm modifications, would need to update ownership

      if (Object.keys(updateData).length > 0) {
        await storage.updateProperty(modification.propertyId, updateData);
      }

      const updated = await storage.updateModification(modificationId, {
        status: "approved",
        approvedBy: userId,
        approvedAt: new Date(),
      });

      // Complete modification
      await storage.updateModification(modificationId, {
        status: "completed",
      });

      return updated;
    } catch (error) {
      console.error("Error approving modification:", error);
      throw error;
    }
  }

  /**
   * Submit modification for review
   */
  async submitForReview(
    modificationId: number,
    userId: number
  ): Promise<Modification> {
    try {
      const modification = await storage.getModification(modificationId);
      if (!modification) {
        throw new Error("Modification not found");
      }

      if (modification.status !== "draft") {
        throw new Error(
          `Modification must be in 'draft' status. Current: ${modification.status}`
        );
      }

      const updated = await storage.updateModification(modificationId, {
        status: "under_review",
      });

      return updated;
    } catch (error) {
      console.error("Error submitting modification for review:", error);
      throw error;
    }
  }

  /**
   * Reject modification
   */
  async rejectModification(
    modificationId: number,
    reason: string,
    userId: number
  ): Promise<Modification> {
    try {
      const modification = await storage.getModification(modificationId);
      if (!modification) {
        throw new Error("Modification not found");
      }

      if (!["draft", "under_review"].includes(modification.status)) {
        throw new Error(
          `Modification cannot be rejected. Current status: ${modification.status}`
        );
      }

      const updated = await storage.updateModification(modificationId, {
        status: "rejected",
      });

      return updated;
    } catch (error) {
      console.error("Error rejecting modification:", error);
      throw error;
    }
  }
}

export const modificationService = new ModificationService();

