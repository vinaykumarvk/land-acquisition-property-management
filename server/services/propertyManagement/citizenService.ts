/**
 * Citizen Service
 * Handles citizen-facing services: property search, OTP verification, property 360 view
 */

import { storage } from "../../storage";
import { Property, Party } from "@shared/schema";
import crypto from "crypto";

// OTP storage (in production, use Redis or database)
const otpStore = new Map<string, { otp: string; expiresAt: Date; propertyId: number }>();

export class CitizenService {
  /**
   * Generate OTP for property search
   */
  async generateOTP(propertyRef: string, phone: string): Promise<{ success: boolean; message: string }> {
    try {
      // Find property by parcel number
      const property = await storage.getPropertyByParcelNo(propertyRef);
      if (!property) {
        return { success: false, message: "Property not found" };
      }

      // Get property owners
      const ownerships = await storage.getPropertyOwners(property.id);
      if (ownerships.length === 0) {
        return { success: false, message: "No owners found for this property" };
      }

      // Verify phone number matches one of the owners
      const owners = await Promise.all(
        ownerships.map((own) => storage.getParty(own.partyId))
      );
      const matchingOwner = owners.find((owner) => owner?.phone === phone);

      if (!matchingOwner) {
        return { success: false, message: "Phone number does not match property owner" };
      }

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Store OTP (key: phone + propertyId)
      const key = `${phone}-${property.id}`;
      otpStore.set(key, { otp, expiresAt, propertyId: property.id });

      // In production, send OTP via SMS
      // await smsService.sendOTP(phone, otp);

      return {
        success: true,
        message: `OTP sent to ${phone}. OTP: ${otp} (for testing only)`,
      };
    } catch (error) {
      console.error("Error generating OTP:", error);
      return { success: false, message: "Error generating OTP" };
    }
  }

  /**
   * Verify OTP and return property access token
   */
  async verifyOTP(propertyRef: string, phone: string, otp: string): Promise<{
    success: boolean;
    accessToken?: string;
    propertyId?: number;
    message: string;
  }> {
    try {
      // Find property by parcel number
      const property = await storage.getPropertyByParcelNo(propertyRef);
      if (!property) {
        return { success: false, message: "Property not found" };
      }

      const key = `${phone}-${property.id}`;
      const stored = otpStore.get(key);

      if (!stored) {
        return { success: false, message: "OTP not found or expired" };
      }

      if (stored.expiresAt < new Date()) {
        otpStore.delete(key);
        return { success: false, message: "OTP expired" };
      }

      if (stored.otp !== otp) {
        return { success: false, message: "Invalid OTP" };
      }

      // Generate access token (in production, use JWT)
      const accessToken = crypto
        .createHash("sha256")
        .update(`${property.id}-${phone}-${Date.now()}`)
        .digest("hex");

      // Store access token (in production, use secure session)
      otpStore.set(`token-${accessToken}`, {
        otp: "",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        propertyId: property.id,
      });

      // Clean up OTP
      otpStore.delete(key);

      return {
        success: true,
        accessToken,
        propertyId: property.id,
        message: "OTP verified successfully",
      };
    } catch (error) {
      console.error("Error verifying OTP:", error);
      return { success: false, message: "Error verifying OTP" };
    }
  }

  /**
   * Get property 360 view (comprehensive property details)
   */
  async getProperty360(propertyId: number, accessToken?: string): Promise<any> {
    try {
      // Verify access token if provided
      if (accessToken) {
        const tokenData = otpStore.get(`token-${accessToken}`);
        if (!tokenData || tokenData.expiresAt < new Date() || tokenData.propertyId !== propertyId) {
          throw new Error("Invalid or expired access token");
        }
      }

      const property = await storage.getProperty(propertyId);
      if (!property) {
        throw new Error("Property not found");
      }

      // Get ownership details
      const ownerships = await storage.getPropertyOwners(propertyId);
      const owners = await Promise.all(
        ownerships.map(async (own) => {
          const party = await storage.getParty(own.partyId);
          return {
            ...party,
            sharePct: own.sharePct,
          };
        })
      );

      // Get allotment details
      const allotments = await storage.getAllotments({ propertyId });
      const latestAllotment = allotments.length > 0 ? allotments[0] : null;

      // Get demand notes
      const demandNotes = await storage.getDemandNotes({ propertyId });
      const totalDues = demandNotes
        .filter((dn) => ["issued", "part_paid", "overdue"].includes(dn.status))
        .reduce((sum, dn) => sum + Number(dn.amount), 0);

      // Get payments
      const payments = await storage.getPmsPayments({ propertyId, status: "success" });
      const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);

      // Get current balance
      const ledger = await storage.getLedgers({ propertyId });
      const currentBalance =
        ledger.length > 0 ? Number(ledger[ledger.length - 1].balance) : 0;

      // Get transfers
      const transfers = await storage.getTransfers({ propertyId });

      // Get mortgages
      const mortgages = await storage.getMortgages({ propertyId });

      // Get NOCs
      const nocs = await storage.getNOCs({ propertyId });

      // Get service requests
      const serviceRequests = await storage.getServiceRequests({ propertyId });

      return {
        property: {
          id: property.id,
          parcelNo: property.parcelNo,
          address: property.address,
          area: property.area,
          landUse: property.landUse,
          status: property.status,
        },
        owners,
        allotment: latestAllotment,
        financial: {
          totalDues,
          totalPaid,
          currentBalance,
          demandNotes: demandNotes.map((dn) => ({
            noteNo: dn.noteNo,
            amount: dn.amount,
            dueDate: dn.dueDate,
            status: dn.status,
          })),
        },
        transactions: {
          transfers: transfers.length,
          mortgages: mortgages.filter((m) => m.status === "active").length,
          nocs: nocs.filter((n) => n.status === "issued").length,
        },
        serviceRequests: serviceRequests.length,
      };
    } catch (error) {
      console.error("Error getting property 360:", error);
      throw error;
    }
  }

  /**
   * Search property by reference number
   */
  async searchProperty(refNo: string): Promise<Property | null> {
    try {
      const property = await storage.getPropertyByParcelNo(refNo);
      return property || null;
    } catch (error) {
      console.error("Error searching property:", error);
      return null;
    }
  }
}

export const citizenService = new CitizenService();

