/**
 * Party Service
 * Handles party (property owner/allottee) management for PMS
 */

import { storage } from "../../storage";
import { InsertParty, Party } from "@shared/schema";

export class PartyService {
  /**
   * Create a new party
   */
  async createParty(partyData: InsertParty): Promise<Party> {
    try {
      // Validate required fields
      if (!partyData.name || !partyData.address || !partyData.phone) {
        throw new Error('Name, address, and phone are required');
      }

      // Check for duplicate by phone or Aadhaar if provided
      if (partyData.phone) {
        const existing = await storage.getParties({ phone: partyData.phone });
        if (existing.length > 0) {
          throw new Error('Party with this phone number already exists');
        }
      }

      if (partyData.aadhaar) {
        const existing = await storage.getParties({ aadhaar: partyData.aadhaar });
        if (existing.length > 0) {
          throw new Error('Party with this Aadhaar number already exists');
        }
      }

      const party = await storage.createParty(partyData);
      return party;
    } catch (error) {
      console.error('Error creating party:', error);
      throw error;
    }
  }

  /**
   * Get party by ID
   */
  async getParty(id: number): Promise<Party> {
    try {
      const party = await storage.getParty(id);
      if (!party) {
        throw new Error('Party not found');
      }
      return party;
    } catch (error) {
      console.error('Error getting party:', error);
      throw error;
    }
  }

  /**
   * Get parties with filters
   */
  async getParties(filters?: { name?: string; phone?: string; aadhaar?: string }): Promise<Party[]> {
    return await storage.getParties(filters);
  }

  /**
   * Update party
   */
  async updateParty(id: number, partyData: Partial<InsertParty>): Promise<Party> {
    try {
      const existing = await storage.getParty(id);
      if (!existing) {
        throw new Error('Party not found');
      }

      // Check for duplicate phone if being updated
      if (partyData.phone && partyData.phone !== existing.phone) {
        const duplicate = await storage.getParties({ phone: partyData.phone });
        if (duplicate.length > 0 && duplicate[0].id !== id) {
          throw new Error('Party with this phone number already exists');
        }
      }

      // Check for duplicate Aadhaar if being updated
      if (partyData.aadhaar && partyData.aadhaar !== existing.aadhaar) {
        const duplicate = await storage.getParties({ aadhaar: partyData.aadhaar });
        if (duplicate.length > 0 && duplicate[0].id !== id) {
          throw new Error('Party with this Aadhaar number already exists');
        }
      }

      const updated = await storage.updateParty(id, partyData);
      return updated;
    } catch (error) {
      console.error('Error updating party:', error);
      throw error;
    }
  }
}

export const partyService = new PartyService();

