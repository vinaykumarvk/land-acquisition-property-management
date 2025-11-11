/**
 * Property Service
 * Handles property master management for PMS
 */

import { storage } from "../../storage";
import { InsertProperty, Property, InsertOwnership } from "@shared/schema";

export class PropertyService {
  /**
   * Create a new property
   */
  async createProperty(propertyData: InsertProperty): Promise<Property> {
    try {
      // Validate required fields
      if (!propertyData.parcelNo || !propertyData.address || !propertyData.area) {
        throw new Error('Parcel number, address, and area are required');
      }

      // Check for duplicate parcel number
      const existing = await storage.getPropertyByParcelNo(propertyData.parcelNo);
      if (existing) {
        throw new Error('Property with this parcel number already exists');
      }

      // Validate scheme exists if provided
      if (propertyData.schemeId) {
        const scheme = await storage.getScheme(propertyData.schemeId);
        if (!scheme) {
          throw new Error('Scheme not found');
        }
      }

      const property = await storage.createProperty(propertyData);
      return property;
    } catch (error) {
      console.error('Error creating property:', error);
      throw error;
    }
  }

  /**
   * Get property by ID
   */
  async getProperty(id: number): Promise<Property> {
    try {
      const property = await storage.getProperty(id);
      if (!property) {
        throw new Error('Property not found');
      }
      return property;
    } catch (error) {
      console.error('Error getting property:', error);
      throw error;
    }
  }

  /**
   * Get property by parcel number
   */
  async getPropertyByParcelNo(parcelNo: string): Promise<Property> {
    try {
      const property = await storage.getPropertyByParcelNo(parcelNo);
      if (!property) {
        throw new Error('Property not found');
      }
      return property;
    } catch (error) {
      console.error('Error getting property:', error);
      throw error;
    }
  }

  /**
   * Get properties with filters
   */
  async getProperties(filters?: { schemeId?: number; status?: string }): Promise<Property[]> {
    return await storage.getProperties(filters);
  }

  /**
   * Update property
   */
  async updateProperty(id: number, propertyData: Partial<InsertProperty>): Promise<Property> {
    try {
      const existing = await storage.getProperty(id);
      if (!existing) {
        throw new Error('Property not found');
      }

      // Check for duplicate parcel number if being updated
      if (propertyData.parcelNo && propertyData.parcelNo !== existing.parcelNo) {
        const duplicate = await storage.getPropertyByParcelNo(propertyData.parcelNo);
        if (duplicate) {
          throw new Error('Property with this parcel number already exists');
        }
      }

      // Validate scheme exists if being updated
      if (propertyData.schemeId) {
        const scheme = await storage.getScheme(propertyData.schemeId);
        if (!scheme) {
          throw new Error('Scheme not found');
        }
      }

      const updated = await storage.updateProperty(id, propertyData);
      return updated;
    } catch (error) {
      console.error('Error updating property:', error);
      throw error;
    }
  }

  /**
   * Get property with ownership details
   */
  async getPropertyWithOwnership(propertyId: number): Promise<Property & { owners: any[] }> {
    try {
      const property = await storage.getProperty(propertyId);
      if (!property) {
        throw new Error('Property not found');
      }

      const ownerships = await storage.getPropertyOwners(propertyId);
      const owners = await Promise.all(
        ownerships.map(async (own) => {
          const party = await storage.getParty(own.partyId);
          return {
            ...own,
            party: party || null,
          };
        })
      );

      return {
        ...property,
        owners: owners.filter(o => o.party !== null),
      };
    } catch (error) {
      console.error('Error getting property with ownership:', error);
      throw error;
    }
  }

  /**
   * Add ownership to property
   */
  async addOwnership(propertyId: number, ownershipData: Omit<InsertOwnership, 'propertyId'>): Promise<any> {
    try {
      const property = await storage.getProperty(propertyId);
      if (!property) {
        throw new Error('Property not found');
      }

      // Verify party exists
      const party = await storage.getParty(ownershipData.partyId);
      if (!party) {
        throw new Error('Party not found');
      }

      // Check if ownership already exists
      const existingOwners = await storage.getPropertyOwners(propertyId);
      const existing = existingOwners.find(o => o.partyId === ownershipData.partyId);
      if (existing) {
        throw new Error('Ownership already exists for this party');
      }

      // Validate total shares don't exceed 100%
      const totalShares = existingOwners.reduce((sum, o) => sum + Number(o.sharePct), 0);
      const newShare = Number(ownershipData.sharePct);
      if (totalShares + newShare > 100) {
        throw new Error('Total ownership shares cannot exceed 100%');
      }

      const ownership = await storage.createOwnership({
        ...ownershipData,
        propertyId,
      });

      return ownership;
    } catch (error) {
      console.error('Error adding ownership:', error);
      throw error;
    }
  }
}

export const propertyService = new PropertyService();

