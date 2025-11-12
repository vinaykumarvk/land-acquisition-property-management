/**
 * Grievance Service
 * Handles grievance/complaint management with SLA tracking and escalation
 */

import { storage } from "../../storage";
import { InsertGrievance, Grievance } from "@shared/schema";
import { notificationService } from "../notificationService";
import { sequences } from "@shared/schema";
import { db } from "../../db";
import { eq, and } from "drizzle-orm";

export class GrievanceService {
  /**
   * Generate unique grievance reference number
   */
  private async generateRefNo(): Promise<string> {
    const currentYear = new Date().getFullYear();
    const seqName = "GRV";
    
    // Get or create sequence
    let seq = await db.select().from(sequences)
      .where(and(
        eq(sequences.sequenceName, seqName),
        eq(sequences.year, currentYear)
      ))
      .limit(1);
    
    if (seq.length === 0) {
      await db.insert(sequences).values({
        sequenceName: seqName,
        year: currentYear,
        currentValue: 0,
      });
      seq = await db.select().from(sequences)
        .where(and(
          eq(sequences.sequenceName, seqName),
          eq(sequences.year, currentYear)
        ))
        .limit(1);
    }
    
    // Increment and get new value
    const newValue = (seq[0].currentValue || 0) + 1;
    await db.update(sequences)
      .set({ currentValue: newValue })
      .where(and(
        eq(sequences.sequenceName, seqName),
        eq(sequences.year, currentYear)
      ));
    
    return `${seqName}-${currentYear}-${String(newValue).padStart(3, "0")}`;
  }

  /**
   * Calculate SLA due date based on priority
   */
  private calculateSLADue(priority: string, slaHours?: number): Date {
    const hours = slaHours || this.getDefaultSLAHours(priority);
    const dueDate = new Date();
    dueDate.setHours(dueDate.getHours() + hours);
    return dueDate;
  }

  /**
   * Get default SLA hours based on priority
   */
  private getDefaultSLAHours(priority: string): number {
    switch (priority) {
      case "urgent":
        return 24; // 1 day
      case "high":
        return 48; // 2 days
      case "medium":
        return 72; // 3 days
      case "low":
        return 120; // 5 days
      default:
        return 72; // Default 3 days
    }
  }

  /**
   * Create a new grievance
   */
  async createGrievance(
    grievanceData: Omit<InsertGrievance, "refNo" | "slaDue" | "status">,
    userId?: number
  ): Promise<Grievance> {
    try {
      // Generate reference number
      const refNo = await this.generateRefNo();
      
      // Calculate SLA due date
      const slaDue = this.calculateSLADue(
        grievanceData.priority || "medium",
        grievanceData.slaHours ?? undefined
      );

      const grievance = await storage.createGrievance({
        ...grievanceData,
        refNo,
        slaDue,
        status: "new",
        slaHours: grievanceData.slaHours || this.getDefaultSLAHours(grievanceData.priority || "medium"),
      });

      // Notify assigned officer if assigned
      if (grievance.assignedTo) {
        await notificationService.createNotification({
          userId: grievance.assignedTo,
          title: "New Grievance Assigned",
          message: `Grievance ${refNo} has been assigned to you`,
          type: "task_assigned",
          relatedType: "grievance",
          relatedId: grievance.id,
        });
      }

      return grievance;
    } catch (error) {
      console.error("Error creating grievance:", error);
      throw error;
    }
  }

  /**
   * Get grievance by ID
   */
  async getGrievance(id: number): Promise<Grievance> {
    try {
      const grievance = await storage.getGrievance(id);
      if (!grievance) {
        throw new Error("Grievance not found");
      }
      return grievance;
    } catch (error) {
      console.error("Error getting grievance:", error);
      throw error;
    }
  }

  /**
   * Get grievance by reference number
   */
  async getGrievanceByRefNo(refNo: string): Promise<Grievance> {
    try {
      const grievance = await storage.getGrievanceByRefNo(refNo);
      if (!grievance) {
        throw new Error("Grievance not found");
      }
      return grievance;
    } catch (error) {
      console.error("Error getting grievance:", error);
      throw error;
    }
  }

  /**
   * Get grievances with filters
   */
  async getGrievances(filters?: {
    partyId?: number;
    propertyId?: number;
    status?: string;
    category?: string;
    assignedTo?: number;
  }): Promise<Grievance[]> {
    return await storage.getGrievances(filters);
  }

  /**
   * Assign grievance to an officer
   */
  async assignGrievance(
    id: number,
    assignedTo: number,
    userId: number
  ): Promise<Grievance> {
    try {
      const existing = await storage.getGrievance(id);
      if (!existing) {
        throw new Error("Grievance not found");
      }

      if (existing.status !== "new" && existing.status !== "reopened") {
        throw new Error("Only new or reopened grievances can be assigned");
      }

      const updated = await storage.updateGrievance(id, {
        assignedTo,
        status: "assigned",
      });

      // Notify assigned officer
      await notificationService.createNotification({
        userId: assignedTo,
        title: "Grievance Assigned",
        message: `Grievance ${existing.refNo} has been assigned to you`,
        type: "task_assigned",
        relatedType: "grievance",
        relatedId: id,
      });

      return updated;
    } catch (error) {
      console.error("Error assigning grievance:", error);
      throw error;
    }
  }

  /**
   * Start working on grievance
   */
  async startGrievance(id: number, userId: number): Promise<Grievance> {
    try {
      const existing = await storage.getGrievance(id);
      if (!existing) {
        throw new Error("Grievance not found");
      }

      if (existing.status !== "assigned" && existing.status !== "new") {
        throw new Error("Grievance must be assigned or new to start");
      }

      // Verify user is assigned or has permission
      if (existing.assignedTo && existing.assignedTo !== userId) {
        throw new Error("You are not assigned to this grievance");
      }

      const updated = await storage.updateGrievance(id, {
        status: "in_progress",
        assignedTo: existing.assignedTo || userId,
      });

      return updated;
    } catch (error) {
      console.error("Error starting grievance:", error);
      throw error;
    }
  }

  /**
   * Resolve grievance
   */
  async resolveGrievance(
    id: number,
    resolutionText: string,
    userId: number,
    resolutionPdf?: string
  ): Promise<Grievance> {
    try {
      const existing = await storage.getGrievance(id);
      if (!existing) {
        throw new Error("Grievance not found");
      }

      if (existing.status !== "in_progress" && existing.status !== "assigned") {
        throw new Error("Grievance must be in progress or assigned to resolve");
      }

      const updated = await storage.updateGrievance(id, {
        status: "resolved",
        resolutionText,
        resolutionPdf,
        resolvedAt: new Date(),
        resolvedBy: userId,
      } as Partial<InsertGrievance>);

      // Notify party if linked
      if (existing.partyId) {
        // In a real system, would send email/SMS to party
        // For now, just log
        console.log(`Grievance ${existing.refNo} resolved. Notify party ${existing.partyId}`);
      }

      return updated;
    } catch (error) {
      console.error("Error resolving grievance:", error);
      throw error;
    }
  }

  /**
   * Escalate grievance
   */
  async escalateGrievance(
    id: number,
    escalatedTo: number,
    userId: number
  ): Promise<Grievance> {
    try {
      const existing = await storage.getGrievance(id);
      if (!existing) {
        throw new Error("Grievance not found");
      }

      const updated = await storage.updateGrievance(id, {
        escalatedAt: new Date(),
        escalatedBy: userId,
        escalatedTo,
        assignedTo: escalatedTo,
        status: "assigned", // Reset to assigned for new officer
      } as Partial<InsertGrievance>);

      // Notify escalated to officer
      await notificationService.createNotification({
        userId: escalatedTo,
        title: "Grievance Escalated",
        message: `Grievance ${existing.refNo} has been escalated to you`,
        type: "task_assigned",
        relatedType: "grievance",
        relatedId: id,
      });

      return updated;
    } catch (error) {
      console.error("Error escalating grievance:", error);
      throw error;
    }
  }

  /**
   * Reopen grievance
   */
  async reopenGrievance(id: number, userId: number): Promise<Grievance> {
    try {
      const existing = await storage.getGrievance(id);
      if (!existing) {
        throw new Error("Grievance not found");
      }

      if (existing.status !== "resolved") {
        throw new Error("Only resolved grievances can be reopened");
      }

      // Recalculate SLA
      const slaDue = this.calculateSLADue(
        existing.priority || "medium",
        existing.slaHours ?? undefined
      );

      const updated = await storage.updateGrievance(id, {
        status: "reopened",
        slaDue,
        resolvedAt: null,
        resolvedBy: null,
        resolutionText: null,
      } as Partial<InsertGrievance>);

      // Notify assigned officer
      if (updated.assignedTo) {
        await notificationService.createNotification({
          userId: updated.assignedTo,
          title: "Grievance Reopened",
          message: `Grievance ${existing.refNo} has been reopened`,
          type: "task_assigned",
          relatedType: "grievance",
          relatedId: id,
        });
      }

      return updated;
    } catch (error) {
      console.error("Error reopening grievance:", error);
      throw error;
    }
  }

  /**
   * Close grievance
   */
  async closeGrievance(id: number, userId: number): Promise<Grievance> {
    try {
      const existing = await storage.getGrievance(id);
      if (!existing) {
        throw new Error("Grievance not found");
      }

      if (existing.status !== "resolved") {
        throw new Error("Only resolved grievances can be closed");
      }

      const updated = await storage.updateGrievance(id, {
        status: "closed",
        closedAt: new Date(),
        closedBy: userId,
      } as Partial<InsertGrievance>);

      return updated;
    } catch (error) {
      console.error("Error closing grievance:", error);
      throw error;
    }
  }

  /**
   * Submit citizen feedback
   */
  async submitFeedback(
    id: number,
    rating: number,
    feedback?: string
  ): Promise<Grievance> {
    try {
      const existing = await storage.getGrievance(id);
      if (!existing) {
        throw new Error("Grievance not found");
      }

      if (existing.status !== "resolved") {
        throw new Error("Feedback can only be submitted for resolved grievances");
      }

      if (rating < 1 || rating > 5) {
        throw new Error("Rating must be between 1 and 5");
      }

      const updated = await storage.updateGrievance(id, {
        citizenRating: rating,
        citizenFeedback: feedback,
      });

      return updated;
    } catch (error) {
      console.error("Error submitting feedback:", error);
      throw error;
    }
  }

  /**
   * Get grievances with SLA violations
   */
  async getSLAViolations(): Promise<Grievance[]> {
    const allGrievances = await storage.getGrievances();
    const now = new Date();
    
    return allGrievances.filter(g => {
      if (!g.slaDue) return false;
      if (g.status === "resolved" || g.status === "closed") return false;
      return new Date(g.slaDue) < now;
    });
  }
}

export const grievanceService = new GrievanceService();

