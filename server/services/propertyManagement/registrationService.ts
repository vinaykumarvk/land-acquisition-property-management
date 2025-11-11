/**
 * Registration Service
 * Orchestrates the property registration workflow
 */

import { storage } from "../../storage";
import { InsertRegistrationCase, RegistrationCase, InsertKycVerification } from "@shared/schema";
import { valuationService } from "./valuationService";
import { encumbranceService } from "./encumbranceService";
import { sroService } from "./sroService";
import { deedService } from "./deedService";

export class RegistrationService {
  /**
   * Create a new registration case
   */
  async createRegistrationCase(
    caseData: Omit<InsertRegistrationCase, "createdBy" | "caseNo" | "status">,
    userId: number
  ): Promise<RegistrationCase> {
    try {
      // Validate property exists
      const property = await storage.getProperty(caseData.propertyId);
      if (!property) {
        throw new Error("Property not found");
      }

      // Validate parties exist
      const toParty = await storage.getParty(caseData.toPartyId);
      if (!toParty) {
        throw new Error("Transferee party not found");
      }

      if (caseData.fromPartyId) {
        const fromParty = await storage.getParty(caseData.fromPartyId);
        if (!fromParty) {
          throw new Error("Transferor party not found");
        }
      }

      // Generate case number
      const caseNo = await this.generateCaseNumber();

      // Create registration case
      const registrationCase = await storage.createRegistrationCase({
        ...caseData,
        caseNo,
        status: "draft",
        createdBy: userId,
      });

      // Create audit log
      await storage.createAuditLog({
        userId,
        action: "create_registration_case",
        resourceType: "registration_case",
        resourceId: registrationCase.id,
        details: { propertyId: caseData.propertyId, deedType: caseData.deedType },
      });

      return registrationCase;
    } catch (error) {
      console.error("Error creating registration case:", error);
      throw error;
    }
  }

  /**
   * Generate case number (REG-YYYY-XXX)
   */
  private async generateCaseNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const sequenceName = "REG";
    
    // Get or create sequence
    let sequence = await storage.getSequence(sequenceName);
    if (!sequence || sequence.year !== year) {
      if (sequence) {
        await storage.updateSequence(sequence.id, { currentValue: 0, year });
      } else {
        sequence = await storage.createSequence({
          sequenceName,
          currentValue: 0,
          year,
        });
      }
    }

    // Increment sequence
    const newValue = sequence.currentValue + 1;
    await storage.updateSequence(sequence.id, { currentValue: newValue });

    return `${sequenceName}-${year}-${String(newValue).padStart(3, "0")}`;
  }

  /**
   * Calculate valuation for a registration case
   */
  async calculateValuation(
    registrationCaseId: number,
    circleRate: number,
    multipliers: Record<string, number> = {}
  ): Promise<{ valuation: number; stampDuty: number; registrationFee: number; total: number }> {
    try {
      const registrationCase = await storage.getRegistrationCase(registrationCaseId);
      if (!registrationCase) {
        throw new Error("Registration case not found");
      }

      const property = await storage.getProperty(registrationCase.propertyId);
      if (!property) {
        throw new Error("Property not found");
      }

      // Calculate valuation
      const valuation = valuationService.calculateValuation(property, circleRate, multipliers);

      // Use consideration amount or valuation (whichever is higher)
      const baseAmount = registrationCase.considerationAmount
        ? Math.max(Number(registrationCase.considerationAmount), valuation)
        : valuation;

      // Calculate stamp duty and registration fee
      const charges = valuationService.calculateTotalCharges(baseAmount);

      // Update registration case
      await storage.updateRegistrationCase(registrationCaseId, {
        valuation: valuation.toString(),
        stampDuty: charges.stampDuty.toString(),
        registrationFee: charges.registrationFee.toString(),
      });

      return {
        valuation,
        stampDuty: charges.stampDuty,
        registrationFee: charges.registrationFee,
        total: charges.total,
      };
    } catch (error) {
      console.error("Error calculating valuation:", error);
      throw error;
    }
  }

  /**
   * Verify KYC for parties in a registration case
   */
  async verifyKYC(
    registrationCaseId: number,
    partyId: number,
    verificationType: "pan" | "aadhaar" | "plrs",
    documentNumber: string,
    userId: number
  ): Promise<any> {
    try {
      const registrationCase = await storage.getRegistrationCase(registrationCaseId);
      if (!registrationCase) {
        throw new Error("Registration case not found");
      }

      // TODO: In production, integrate with actual KYC verification APIs
      // For now, simulate verification
      const verificationResponse = {
        verified: true,
        name: "Verified",
        status: "success",
        timestamp: new Date().toISOString(),
      };

      // Create or update KYC verification record
      const existing = await storage.getKycVerifications({
        registrationCaseId,
        partyId,
        status: "verified",
      });

      let kycVerification;
      if (existing.length > 0) {
        kycVerification = await storage.updateKycVerification(existing[0].id, {
          verificationType,
          documentNumber,
          status: "verified",
          verificationResponse: verificationResponse as any,
          verifiedAt: new Date(),
          verifiedBy: userId,
        });
      } else {
        kycVerification = await storage.createKycVerification({
          registrationCaseId,
          partyId,
          verificationType,
          documentNumber,
          status: "verified",
          verificationResponse: verificationResponse as any,
          verifiedAt: new Date(),
          verifiedBy: userId,
        });
      }

      // Update registration case KYC status
      const allKycVerifications = await storage.getKycVerifications({ registrationCaseId });
      const allVerified = allKycVerifications.every(k => k.status === "verified");
      
      await storage.updateRegistrationCase(registrationCaseId, {
        kycVerified: allVerified,
      });

      return kycVerification;
    } catch (error) {
      console.error("Error verifying KYC:", error);
      throw error;
    }
  }

  /**
   * Generate encumbrance certificate for a registration case
   */
  async generateEncumbranceCertificate(
    registrationCaseId: number,
    userId: number
  ): Promise<any> {
    try {
      const registrationCase = await storage.getRegistrationCase(registrationCaseId);
      if (!registrationCase) {
        throw new Error("Registration case not found");
      }

      const encumbrance = await encumbranceService.generateEncumbranceCertificate(
        registrationCase.propertyId,
        registrationCaseId,
        userId
      );

      // Update registration case
      await storage.updateRegistrationCase(registrationCaseId, {
        encumbranceChecked: true,
        encumbranceCertPath: encumbrance.certPdf,
      });

      return encumbrance;
    } catch (error) {
      console.error("Error generating encumbrance certificate:", error);
      throw error;
    }
  }

  /**
   * Book SRO slot for a registration case
   */
  async bookSlot(
    registrationCaseId: number,
    slotId: number,
    userId: number
  ): Promise<any> {
    try {
      const registrationCase = await storage.getRegistrationCase(registrationCaseId);
      if (!registrationCase) {
        throw new Error("Registration case not found");
      }

      const slot = await sroService.bookSlot(slotId, registrationCaseId, userId);

      // Update registration case
      await storage.updateRegistrationCase(registrationCaseId, {
        slotAt: slot.slotDate,
        status: "scheduled",
      });

      return slot;
    } catch (error) {
      console.error("Error booking slot:", error);
      throw error;
    }
  }

  /**
   * Prepare deed for a registration case
   */
  async prepareDeed(
    registrationCaseId: number,
    userId: number
  ): Promise<any> {
    try {
      const registrationCase = await storage.getRegistrationCase(registrationCaseId);
      if (!registrationCase) {
        throw new Error("Registration case not found");
      }

      // Validate prerequisites
      if (!registrationCase.kycVerified) {
        throw new Error("KYC verification is required before preparing deed");
      }

      if (!registrationCase.encumbranceChecked) {
        throw new Error("Encumbrance check is required before preparing deed");
      }

      const deed = await deedService.prepareDeed(registrationCaseId, userId);

      return deed;
    } catch (error) {
      console.error("Error preparing deed:", error);
      throw error;
    }
  }

  /**
   * Complete registration (mark as registered)
   */
  async completeRegistration(
    registrationCaseId: number,
    registeredDeedPdfPath: string,
    userId: number
  ): Promise<RegistrationCase> {
    try {
      const registrationCase = await storage.getRegistrationCase(registrationCaseId);
      if (!registrationCase) {
        throw new Error("Registration case not found");
      }

      if (registrationCase.status !== "under_verification") {
        throw new Error("Registration case must be in 'under_verification' status");
      }

      // Update registration case
      const updated = await storage.updateRegistrationCase(registrationCaseId, {
        status: "registered",
        registeredDeedPdfPath,
        registeredAt: new Date(),
        registeredBy: userId,
      });

      // Update deed status
      const deeds = await storage.getDeeds({ registrationCaseId });
      for (const deed of deeds) {
        if (deed.status === "prepared") {
          await deedService.markAsRegistered(deed.id, registeredDeedPdfPath);
        }
      }

      // Create audit log
      await storage.createAuditLog({
        userId,
        action: "complete_registration",
        resourceType: "registration_case",
        resourceId: registrationCaseId,
        details: { registeredAt: new Date() },
      });

      return updated;
    } catch (error) {
      console.error("Error completing registration:", error);
      throw error;
    }
  }

  /**
   * Get registration case with all related data
   */
  async getRegistrationCaseWithDetails(id: number): Promise<any> {
    const registrationCase = await storage.getRegistrationCase(id);
    if (!registrationCase) {
      throw new Error("Registration case not found");
    }

    const property = await storage.getProperty(registrationCase.propertyId);
    const toParty = await storage.getParty(registrationCase.toPartyId);
    const fromParty = registrationCase.fromPartyId
      ? await storage.getParty(registrationCase.fromPartyId)
      : null;

    const deeds = await storage.getDeeds({ registrationCaseId: id });
    const encumbrances = await storage.getEncumbrances({ registrationCaseId: id });
    const slots = await storage.getRegistrationSlots();
    const caseSlots = slots.filter(s => s.registrationCaseId === id);
    const kycVerifications = await storage.getKycVerifications({ registrationCaseId: id });

    return {
      ...registrationCase,
      property,
      toParty,
      fromParty,
      deeds,
      encumbrances,
      slots: caseSlots,
      kycVerifications,
    };
  }

  /**
   * Get registration cases with filters
   */
  async getRegistrationCases(filters?: {
    propertyId?: number;
    status?: string;
    deedType?: string;
  }): Promise<RegistrationCase[]> {
    return await storage.getRegistrationCases(filters);
  }
}

export const registrationService = new RegistrationService();

