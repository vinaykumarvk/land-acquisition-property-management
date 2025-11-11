/**
 * Scheme Service
 * Handles property scheme management for PMS
 */

import { storage } from "../../storage";
import { InsertScheme, Scheme, InsertApplication, Application } from "@shared/schema";

export class SchemeService {
  /**
   * Create a new scheme
   */
  async createScheme(schemeData: InsertScheme, userId: number): Promise<Scheme> {
    try {
      // Validate required fields
      if (!schemeData.name || !schemeData.category) {
        throw new Error('Name and category are required');
      }

      // Validate category enum
      const validCategories = ['residential', 'commercial', 'industrial', 'mixed'];
      if (!validCategories.includes(schemeData.category)) {
        throw new Error(`Invalid category. Must be one of: ${validCategories.join(', ')}`);
      }

      const scheme = await storage.createScheme({
        ...schemeData,
        createdBy: userId,
      });

      // Create audit log (placeholder - implement if audit log table exists)
      // await storage.createAuditLog({
      //   userId,
      //   action: 'create_scheme',
      //   resourceType: 'scheme',
      //   resourceId: scheme.id,
      //   details: { name: scheme.name, category: scheme.category },
      // });

      return scheme;
    } catch (error) {
      console.error('Error creating scheme:', error);
      throw error;
    }
  }

  /**
   * Get scheme by ID
   */
  async getScheme(id: number): Promise<Scheme> {
    try {
      const scheme = await storage.getScheme(id);
      if (!scheme) {
        throw new Error('Scheme not found');
      }
      return scheme;
    } catch (error) {
      console.error('Error getting scheme:', error);
      throw error;
    }
  }

  /**
   * Get scheme with details (applications, properties)
   */
  async getSchemeWithDetails(id: number): Promise<any> {
    try {
      const scheme = await storage.getScheme(id);
      if (!scheme) {
        throw new Error('Scheme not found');
      }

      const applications = await storage.getApplications({ schemeId: id });
      const properties = await storage.getProperties({ schemeId: id });

      return {
        ...scheme,
        applications,
        properties,
        applicationCount: applications.length,
        propertyCount: properties.length,
      };
    } catch (error) {
      console.error('Error getting scheme details:', error);
      throw error;
    }
  }

  /**
   * Get schemes with filters
   */
  async getSchemes(filters?: { status?: string; createdBy?: number }): Promise<Scheme[]> {
    return await storage.getSchemes(filters);
  }

  /**
   * Update scheme
   */
  async updateScheme(id: number, schemeData: Partial<InsertScheme>, userId: number): Promise<Scheme> {
    try {
      const existing = await storage.getScheme(id);
      if (!existing) {
        throw new Error('Scheme not found');
      }

      // Validate status transitions
      if (schemeData.status && existing.status !== schemeData.status) {
        // Add state machine validation here if needed
        // For now, allow any transition
      }

      const updated = await storage.updateScheme(id, schemeData);

      // Create audit log
      // await storage.createAuditLog({
      //   userId,
      //   action: 'update_scheme',
      //   resourceType: 'scheme',
      //   resourceId: id,
      //   details: { changes: schemeData },
      // });

      return updated;
    } catch (error) {
      console.error('Error updating scheme:', error);
      throw error;
    }
  }

  /**
   * Submit application for a scheme
   */
  async submitApplication(applicationData: InsertApplication): Promise<Application> {
    try {
      // Validate scheme exists and is accepting applications
      const scheme = await storage.getScheme(applicationData.schemeId);
      if (!scheme) {
        throw new Error('Scheme not found');
      }

      if (scheme.status !== 'published') {
        throw new Error('Scheme is not accepting applications. Status: ' + scheme.status);
      }

      // Validate party exists
      const party = await storage.getParty(applicationData.partyId);
      if (!party) {
        throw new Error('Party not found');
      }

      // Check for duplicate application
      const existing = await storage.getApplications({
        schemeId: applicationData.schemeId,
        partyId: applicationData.partyId,
      });

      if (existing.length > 0) {
        const activeApplication = existing.find(
          (app) => !['rejected', 'closed'].includes(app.status)
        );
        if (activeApplication) {
          throw new Error('Application already exists for this party');
        }
      }

      // Validate eligibility if criteria provided
      if (scheme.eligibilityJson) {
        const eligibility = scheme.eligibilityJson as any;
        // Add eligibility validation logic here
        // For now, just check if required fields are present
      }

      const application = await storage.createApplication({
        ...applicationData,
        status: 'submitted',
      });

      return application;
    } catch (error) {
      console.error('Error submitting application:', error);
      throw error;
    }
  }

  /**
   * Verify application (eligibility check)
   */
  async verifyApplication(applicationId: number, userId: number): Promise<Application> {
    try {
      const application = await storage.getApplication(applicationId);
      if (!application) {
        throw new Error('Application not found');
      }

      if (application.status !== 'submitted') {
        throw new Error(`Application must be in 'submitted' status. Current: ${application.status}`);
      }

      const scheme = await storage.getScheme(application.schemeId);
      if (!scheme) {
        throw new Error('Scheme not found');
      }

      // Calculate eligibility score
      let score = 0;
      if (scheme.eligibilityJson) {
        // Add scoring logic based on eligibility criteria
        // For now, set a default score
        score = 100;
      }

      const updated = await storage.updateApplication(applicationId, {
        status: 'verified',
        score: score.toString(),
      });

      return updated;
    } catch (error) {
      console.error('Error verifying application:', error);
      throw error;
    }
  }

  /**
   * Reject application
   */
  async rejectApplication(applicationId: number, reason: string, userId: number): Promise<Application> {
    try {
      const application = await storage.getApplication(applicationId);
      if (!application) {
        throw new Error('Application not found');
      }

      if (!['submitted', 'verified'].includes(application.status)) {
        throw new Error(`Application cannot be rejected. Current status: ${application.status}`);
      }

      const updated = await storage.updateApplication(applicationId, {
        status: 'rejected',
      });

      return updated;
    } catch (error) {
      console.error('Error rejecting application:', error);
      throw error;
    }
  }

  /**
   * Get applications for a scheme
   */
  async getSchemeApplications(schemeId: number, filters?: { status?: string }): Promise<Application[]> {
    try {
      const scheme = await storage.getScheme(schemeId);
      if (!scheme) {
        throw new Error('Scheme not found');
      }

      return await storage.getApplications({
        schemeId,
        ...filters,
      });
    } catch (error) {
      console.error('Error getting scheme applications:', error);
      throw error;
    }
  }
}

export const schemeService = new SchemeService();

