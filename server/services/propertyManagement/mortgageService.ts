/**
 * Mortgage Service
 * Handles mortgage permissions and hypothecation management
 */

import { storage } from "../../storage";
import { InsertMortgage, Mortgage } from "@shared/schema";

export class MortgageService {
  /**
   * Create mortgage request
   */
  async createMortgage(
    mortgageData: Omit<InsertMortgage, "createdBy">,
    userId: number
  ): Promise<Mortgage> {
    try {
      // Validate property exists
      const property = await storage.getProperty(mortgageData.propertyId);
      if (!property) {
        throw new Error("Property not found");
      }

      // Validate property is allotted
      if (!["allotted", "transferred"].includes(property.status)) {
        throw new Error(
          `Property must be allotted before mortgage. Current status: ${property.status}`
        );
      }

      // Validate party owns the property
      const ownerships = await storage.getPropertyOwners(property.id);
      const ownerExists = ownerships.some(
        (own) => own.partyId === mortgageData.partyId
      );
      if (!ownerExists) {
        throw new Error("Party does not own this property");
      }

      // Check for existing active mortgage
      const existingMortgages = await storage.getMortgages({
        propertyId: property.id,
      });
      const activeMortgage = existingMortgages.find(
        (m) => ["approved", "active"].includes(m.status)
      );
      if (activeMortgage) {
        throw new Error("Property already has an active mortgage");
      }

      const mortgage = await storage.createMortgage({
        ...mortgageData,
        createdBy: userId,
        status: "draft",
      });

      return mortgage;
    } catch (error) {
      console.error("Error creating mortgage:", error);
      throw error;
    }
  }

  /**
   * Get mortgage by ID
   */
  async getMortgage(id: number): Promise<Mortgage> {
    try {
      const mortgage = await storage.getMortgage(id);
      if (!mortgage) {
        throw new Error("Mortgage not found");
      }
      return mortgage;
    } catch (error) {
      console.error("Error getting mortgage:", error);
      throw error;
    }
  }

  /**
   * Get mortgages with filters
   */
  async getMortgages(filters?: {
    propertyId?: number;
    status?: string;
  }): Promise<Mortgage[]> {
    return await storage.getMortgages(filters);
  }

  /**
   * Approve mortgage
   */
  async approveMortgage(
    mortgageId: number,
    userId: number
  ): Promise<Mortgage> {
    try {
      const mortgage = await storage.getMortgage(mortgageId);
      if (!mortgage) {
        throw new Error("Mortgage not found");
      }

      if (mortgage.status !== "under_review") {
        throw new Error(
          `Mortgage must be in 'under_review' status. Current: ${mortgage.status}`
        );
      }

      const updated = await storage.updateMortgage(mortgageId, {
        status: "approved",
        approvedBy: userId,
        approvedAt: new Date(),
      } as Partial<InsertMortgage>);

      // Activate mortgage
      await storage.updateMortgage(mortgageId, {
        status: "active",
      });

      // Update property status
      await storage.updateProperty(mortgage.propertyId, {
        status: "mortgaged",
      });

      return updated;
    } catch (error) {
      console.error("Error approving mortgage:", error);
      throw error;
    }
  }

  /**
   * Close mortgage
   */
  async closeMortgage(mortgageId: number, userId: number): Promise<Mortgage> {
    try {
      const mortgage = await storage.getMortgage(mortgageId);
      if (!mortgage) {
        throw new Error("Mortgage not found");
      }

      if (mortgage.status !== "active") {
        throw new Error(
          `Mortgage must be active to close. Current: ${mortgage.status}`
        );
      }

      const updated = await storage.updateMortgage(mortgageId, {
        status: "closed",
      });

      // Update property status back
      const property = await storage.getProperty(mortgage.propertyId);
      if (property) {
        // Check if property has other active mortgages
        const otherMortgages = await storage.getMortgages({
          propertyId: property.id,
        });
        const hasActiveMortgage = otherMortgages.some(
          (m) => m.id !== mortgageId && m.status === "active"
        );

        if (!hasActiveMortgage) {
          await storage.updateProperty(mortgage.propertyId, {
            status: property.status === "mortgaged" ? "allotted" : property.status,
          });
        }
      }

      return updated;
    } catch (error) {
      console.error("Error closing mortgage:", error);
      throw error;
    }
  }

  /**
   * Submit mortgage for review
   */
  async submitForReview(
    mortgageId: number,
    userId: number
  ): Promise<Mortgage> {
    try {
      const mortgage = await storage.getMortgage(mortgageId);
      if (!mortgage) {
        throw new Error("Mortgage not found");
      }

      if (mortgage.status !== "draft") {
        throw new Error(
          `Mortgage must be in 'draft' status. Current: ${mortgage.status}`
        );
      }

      const updated = await storage.updateMortgage(mortgageId, {
        status: "under_review",
      });

      return updated;
    } catch (error) {
      console.error("Error submitting mortgage for review:", error);
      throw error;
    }
  }

  /**
   * Reject mortgage
   */
  async rejectMortgage(
    mortgageId: number,
    reason: string,
    userId: number
  ): Promise<Mortgage> {
    try {
      const mortgage = await storage.getMortgage(mortgageId);
      if (!mortgage) {
        throw new Error("Mortgage not found");
      }

      if (!["draft", "under_review"].includes(mortgage.status)) {
        throw new Error(
          `Mortgage cannot be rejected. Current status: ${mortgage.status}`
        );
      }

      const updated = await storage.updateMortgage(mortgageId, {
        status: "rejected",
      });

      return updated;
    } catch (error) {
      console.error("Error rejecting mortgage:", error);
      throw error;
    }
  }
}

export const mortgageService = new MortgageService();

