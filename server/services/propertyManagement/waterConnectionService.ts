/**
 * Water Connection Service
 * Handles water connection application, inspection, sanction, renewal, and closure
 */

import { storage } from "../../storage";
import { utilityService } from "./utilityService";
import { notificationService } from "../notificationService";
import { InsertWaterConnection, WaterConnection, sequences } from "@shared/schema";
import { db } from "../../db";
import { eq, and } from "drizzle-orm";
import { InsertConnectionInspection } from "@shared/schema";

export class WaterConnectionService {
  /**
   * Generate connection number
   */
  private async generateConnectionNumber(): Promise<string> {
    const currentYear = new Date().getFullYear();
    const sequenceName = `WC-${currentYear}`;

    let sequence = await db
      .select()
      .from(sequences)
      .where(
        and(
          eq(sequences.sequenceName, sequenceName),
          eq(sequences.year, currentYear)
        )
      )
      .limit(1);

    if (sequence.length === 0) {
      await db.insert(sequences).values({
        sequenceName,
        year: currentYear,
        currentValue: 0,
      });
      sequence = await db
        .select()
        .from(sequences)
        .where(
          and(
            eq(sequences.sequenceName, sequenceName),
            eq(sequences.year, currentYear)
          )
        )
        .limit(1);
    }

    const nextValue = (sequence[0].currentValue || 0) + 1;
    await db
      .update(sequences)
      .set({ currentValue: nextValue })
      .where(eq(sequences.id, sequence[0].id));

    return `${sequenceName}-${String(nextValue).padStart(6, "0")}`;
  }

  /**
   * Apply for water connection
   */
  async applyForConnection(
    connectionData: Omit<InsertWaterConnection, "connectionNo" | "createdBy" | "status" | "applicationDate" | "slaDue">,
    userId: number
  ): Promise<WaterConnection> {
    try {
      // Validate application
      const validation = utilityService.validateConnectionApplication({
        propertyId: connectionData.propertyId,
        partyId: connectionData.partyId,
        connectionType: "water",
        connectionCategory: connectionData.connectionType,
      });

      if (!validation.valid) {
        throw new Error(validation.errors.join(", "));
      }

      // Check serviceability
      const serviceability = await utilityService.checkServiceability(
        connectionData.propertyId,
        "water"
      );

      if (!serviceability.serviceable) {
        throw new Error(
          `Property is not serviceable: ${serviceability.reason || "Infrastructure not available"}`
        );
      }

      // Calculate fee
      const fee = await utilityService.calculateConnectionFee(
        connectionData.propertyId,
        "water",
        connectionData.connectionType as "domestic" | "commercial" | "industrial"
      );

      // Generate connection number
      const connectionNo = await this.generateConnectionNumber();

      // Calculate SLA deadline
      const slaDue = utilityService.calculateSLADeadline("water", "applied");

      // Create connection
      const connection = await storage.createWaterConnection({
        ...connectionData,
        connectionNo,
        applicationDate: new Date(),
        fee,
        serviceabilityCheck: serviceability,
        status: "serviceability_checked",
        slaDue,
        createdBy: userId,
      });

      // Notify assigned officer if assigned
      if (connection.assignedTo) {
        await notificationService.createNotification({
          userId: connection.assignedTo,
          title: "New Water Connection Application",
          message: `New water connection application ${connectionNo} requires attention`,
          type: "task_assigned",
          relatedType: "water_connection",
          relatedId: connection.id,
        });
      }

      return connection;
    } catch (error) {
      console.error("Error applying for water connection:", error);
      throw error;
    }
  }

  /**
   * Get water connection by ID
   */
  async getConnection(id: number): Promise<WaterConnection> {
    try {
      const connection = await storage.getWaterConnection(id);
      if (!connection) {
        throw new Error("Water connection not found");
      }
      return connection;
    } catch (error) {
      console.error("Error getting water connection:", error);
      throw error;
    }
  }

  /**
   * Get water connections with filters
   */
  async getConnections(filters?: {
    propertyId?: number;
    partyId?: number;
    status?: string;
  }): Promise<WaterConnection[]> {
    return await storage.getWaterConnections(filters);
  }

  /**
   * Schedule inspection
   */
  async scheduleInspection(
    connectionId: number,
    inspectionData: Omit<InsertConnectionInspection, "connectionType" | "connectionId">,
    userId: number
  ): Promise<any> {
    try {
      const connection = await storage.getWaterConnection(connectionId);
      if (!connection) {
        throw new Error("Water connection not found");
      }

      if (connection.status !== "serviceability_checked" && connection.status !== "inspection_scheduled") {
        throw new Error(
          `Connection must be in 'serviceability_checked' or 'inspection_scheduled' status. Current: ${connection.status}`
        );
      }

      // Create inspection
      const inspection = await storage.createConnectionInspection({
        ...inspectionData,
        connectionType: "water",
        connectionId,
      });

      // Update connection status
      await storage.updateWaterConnection(connectionId, {
        status: "inspection_scheduled",
        assignedTo: inspectionData.inspectorId || connection.assignedTo,
        slaDue: utilityService.calculateSLADeadline("water", "inspection_scheduled"),
      });

      // Notify inspector
      if (inspectionData.inspectorId) {
        await notificationService.createNotification({
          userId: inspectionData.inspectorId,
          title: "Water Connection Inspection Scheduled",
          message: `Inspection scheduled for connection ${connection.connectionNo} on ${new Date(inspectionData.scheduledAt).toLocaleDateString()}`,
          type: "task_assigned",
          relatedType: "water_connection",
          relatedId: connectionId,
        });
      }

      return inspection;
    } catch (error) {
      console.error("Error scheduling inspection:", error);
      throw error;
    }
  }

  /**
   * Complete inspection
   */
  async completeInspection(
    inspectionId: number,
    result: "passed" | "failed" | "conditional",
    remarks: string,
    photos?: Array<{ path: string; gpsLat?: number; gpsLng?: number }>,
    userId?: number
  ): Promise<any> {
    try {
      const inspection = await storage.getConnectionInspection(inspectionId);
      if (!inspection) {
        throw new Error("Inspection not found");
      }

      if (inspection.status !== "scheduled" && inspection.status !== "in_progress") {
        throw new Error(`Inspection must be scheduled or in progress. Current: ${inspection.status}`);
      }

      // Update inspection
      const updated = await storage.updateConnectionInspection(inspectionId, {
        status: "completed",
        result,
        remarks,
        photosJson: photos || null,
        inspectedAt: new Date(),
        inspectorId: userId || inspection.inspectorId,
      });

      // Update connection status
      const connection = await storage.getWaterConnection(inspection.connectionId);
      if (connection) {
        if (result === "passed") {
          await storage.updateWaterConnection(inspection.connectionId, {
            status: "inspection_completed",
            slaDue: utilityService.calculateSLADeadline("water", "inspection_completed"),
          });
        } else {
          await storage.updateWaterConnection(inspection.connectionId, {
            status: "applied", // Reset to allow re-application or correction
          });
        }
      }

      return updated;
    } catch (error) {
      console.error("Error completing inspection:", error);
      throw error;
    }
  }

  /**
   * Sanction connection
   */
  async sanctionConnection(connectionId: number, userId: number): Promise<WaterConnection> {
    try {
      const connection = await storage.getWaterConnection(connectionId);
      if (!connection) {
        throw new Error("Water connection not found");
      }

      if (connection.status !== "inspection_completed") {
        throw new Error(
          `Connection must pass inspection before sanction. Current: ${connection.status}`
        );
      }

      // Update connection
      const updated = await storage.updateWaterConnection(connectionId, {
        status: "sanctioned",
        sanctionedAt: new Date(),
      });

      // Notify party
      const party = await storage.getParty(connection.partyId);
      if (party) {
        // In production, send email/SMS notification
        console.log(`Connection ${connection.connectionNo} sanctioned for party ${party.name}`);
      }

      return updated;
    } catch (error) {
      console.error("Error sanctioning connection:", error);
      throw error;
    }
  }

  /**
   * Activate connection
   */
  async activateConnection(
    connectionId: number,
    meterNo?: string,
    meterIntegrationData?: any,
    userId?: number
  ): Promise<WaterConnection> {
    try {
      const connection = await storage.getWaterConnection(connectionId);
      if (!connection) {
        throw new Error("Water connection not found");
      }

      if (connection.status !== "sanctioned") {
        throw new Error(
          `Connection must be sanctioned before activation. Current: ${connection.status}`
        );
      }

      // Update connection
      const updated = await storage.updateWaterConnection(connectionId, {
        status: "active",
        activatedAt: new Date(),
        meterNo: meterNo || connection.meterNo,
        meterIntegrationData: meterIntegrationData || connection.meterIntegrationData,
      });

      return updated;
    } catch (error) {
      console.error("Error activating connection:", error);
      throw error;
    }
  }

  /**
   * Renew connection
   */
  async renewConnection(connectionId: number, userId: number): Promise<WaterConnection> {
    try {
      const connection = await storage.getWaterConnection(connectionId);
      if (!connection) {
        throw new Error("Water connection not found");
      }

      if (connection.status !== "active" && connection.status !== "renewal_pending") {
        throw new Error(
          `Connection must be active or pending renewal. Current: ${connection.status}`
        );
      }

      // Update connection
      const updated = await storage.updateWaterConnection(connectionId, {
        status: "active",
      });

      return updated;
    } catch (error) {
      console.error("Error renewing connection:", error);
      throw error;
    }
  }

  /**
   * Close connection
   */
  async closeConnection(connectionId: number, reason: string, userId: number): Promise<WaterConnection> {
    try {
      const connection = await storage.getWaterConnection(connectionId);
      if (!connection) {
        throw new Error("Water connection not found");
      }

      if (connection.status === "closed") {
        throw new Error("Connection is already closed");
      }

      // Update connection
      const updated = await storage.updateWaterConnection(connectionId, {
        status: "closed",
        closedAt: new Date(),
      });

      return updated;
    } catch (error) {
      console.error("Error closing connection:", error);
      throw error;
    }
  }
}

export const waterConnectionService = new WaterConnectionService();

