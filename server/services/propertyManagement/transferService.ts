/**
 * Transfer Service
 * Handles property transfers (sale/gift/inheritance) with maker-checker workflow
 */

import { storage } from "../../storage";
import { InsertTransfer, Transfer } from "@shared/schema";

export class TransferService {
  /**
   * Create transfer request
   */
  async createTransfer(
    transferData: Omit<InsertTransfer, "createdBy">,
    userId: number
  ): Promise<Transfer> {
    try {
      // Validate property exists
      const property = await storage.getProperty(transferData.propertyId);
      if (!property) {
        throw new Error("Property not found");
      }

      // Validate property is allotted (post-allotment service)
      if (property.status !== "allotted") {
        throw new Error(
          `Property must be allotted before transfer. Current status: ${property.status}`
        );
      }

      // Validate parties exist
      const fromParty = await storage.getParty(transferData.fromPartyId);
      const toParty = await storage.getParty(transferData.toPartyId);
      if (!fromParty || !toParty) {
        throw new Error("Transferor or transferee not found");
      }

      // Validate fromParty owns the property
      const ownerships = await storage.getPropertyOwners(property.id);
      const ownerExists = ownerships.some(
        (own) => own.partyId === transferData.fromPartyId
      );
      if (!ownerExists) {
        throw new Error("Transferor does not own this property");
      }

      // Validate transfer type
      if (!["sale", "gift", "inheritance"].includes(transferData.transferType)) {
        throw new Error("Invalid transfer type. Must be sale, gift, or inheritance");
      }

      const transfer = await storage.createTransfer({
        ...transferData,
        createdBy: userId,
        status: "draft",
      });

      return transfer;
    } catch (error) {
      console.error("Error creating transfer:", error);
      throw error;
    }
  }

  /**
   * Get transfer by ID
   */
  async getTransfer(id: number): Promise<Transfer> {
    try {
      const transfer = await storage.getTransfer(id);
      if (!transfer) {
        throw new Error("Transfer not found");
      }
      return transfer;
    } catch (error) {
      console.error("Error getting transfer:", error);
      throw error;
    }
  }

  /**
   * Get transfers with filters
   */
  async getTransfers(filters?: {
    propertyId?: number;
    status?: string;
  }): Promise<Transfer[]> {
    return await storage.getTransfers(filters);
  }

  /**
   * Approve transfer
   */
  async approveTransfer(
    transferId: number,
    userId: number
  ): Promise<Transfer> {
    try {
      const transfer = await storage.getTransfer(transferId);
      if (!transfer) {
        throw new Error("Transfer not found");
      }

      if (transfer.status !== "under_review") {
        throw new Error(
          `Transfer must be in 'under_review' status. Current: ${transfer.status}`
        );
      }

      // Update ownership
      const ownerships = await storage.getPropertyOwners(transfer.propertyId);
      const fromOwnership = ownerships.find(
        (own) => own.partyId === transfer.fromPartyId
      );

      if (fromOwnership) {
        // Remove or reduce fromParty ownership
        if (Number(fromOwnership.sharePct) === 100) {
          // Full transfer - remove old ownership, add new
          await storage.deleteOwnership(fromOwnership.id);
          await storage.createOwnership({
            propertyId: transfer.propertyId,
            partyId: transfer.toPartyId,
            sharePct: "100.00",
          });
        } else {
          // Partial transfer - adjust shares
          // For simplicity, assuming full transfer for now
          // In production, handle partial transfers
          await storage.deleteOwnership(fromOwnership.id);
          await storage.createOwnership({
            propertyId: transfer.propertyId,
            partyId: transfer.toPartyId,
            sharePct: fromOwnership.sharePct,
          });
        }
      }

      // Update transfer status
      const updated = await storage.updateTransfer(transferId, {
        status: "approved",
        approvedBy: userId,
        approvedAt: new Date(),
      });

      // Update property status
      await storage.updateProperty(transfer.propertyId, {
        status: "transferred",
      });

      return updated;
    } catch (error) {
      console.error("Error approving transfer:", error);
      throw error;
    }
  }

  /**
   * Complete transfer (after all formalities)
   */
  async completeTransfer(transferId: number, userId: number): Promise<Transfer> {
    try {
      const transfer = await storage.getTransfer(transferId);
      if (!transfer) {
        throw new Error("Transfer not found");
      }

      if (transfer.status !== "approved") {
        throw new Error(
          `Transfer must be approved before completion. Current: ${transfer.status}`
        );
      }

      const updated = await storage.updateTransfer(transferId, {
        status: "completed",
      });

      return updated;
    } catch (error) {
      console.error("Error completing transfer:", error);
      throw error;
    }
  }

  /**
   * Submit transfer for review
   */
  async submitForReview(transferId: number, userId: number): Promise<Transfer> {
    try {
      const transfer = await storage.getTransfer(transferId);
      if (!transfer) {
        throw new Error("Transfer not found");
      }

      if (transfer.status !== "draft") {
        throw new Error(
          `Transfer must be in 'draft' status. Current: ${transfer.status}`
        );
      }

      const updated = await storage.updateTransfer(transferId, {
        status: "under_review",
      });

      return updated;
    } catch (error) {
      console.error("Error submitting transfer for review:", error);
      throw error;
    }
  }

  /**
   * Reject transfer
   */
  async rejectTransfer(
    transferId: number,
    reason: string,
    userId: number
  ): Promise<Transfer> {
    try {
      const transfer = await storage.getTransfer(transferId);
      if (!transfer) {
        throw new Error("Transfer not found");
      }

      if (!["draft", "under_review"].includes(transfer.status)) {
        throw new Error(
          `Transfer cannot be rejected. Current status: ${transfer.status}`
        );
      }

      const updated = await storage.updateTransfer(transferId, {
        status: "rejected",
      });

      return updated;
    } catch (error) {
      console.error("Error rejecting transfer:", error);
      throw error;
    }
  }
}

export const transferService = new TransferService();

