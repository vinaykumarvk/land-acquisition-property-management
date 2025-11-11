/**
 * SRO Service
 * Handles SRO slot booking and management
 */

import { storage } from "../../storage";
import { InsertRegistrationSlot, RegistrationSlot } from "@shared/schema";

export class SroService {
  /**
   * Get available slots for a date range
   */
  async getAvailableSlots(
    sroOffice: string,
    startDate: Date,
    endDate: Date
  ): Promise<RegistrationSlot[]> {
    const slots = await storage.getRegistrationSlots({
      sroOffice,
      status: "available",
    });

    // Filter by date range
    return slots.filter(slot => {
      const slotDate = new Date(slot.slotDate);
      return slotDate >= startDate && slotDate <= endDate;
    });
  }

  /**
   * Book a slot for a registration case
   */
  async bookSlot(
    slotId: number,
    registrationCaseId: number,
    userId: number
  ): Promise<RegistrationSlot> {
    const slot = await storage.getRegistrationSlot(slotId);
    if (!slot) {
      throw new Error("Slot not found");
    }

    if (slot.status !== "available") {
      throw new Error("Slot is not available");
    }

    if (slot.registrationCaseId) {
      throw new Error("Slot is already booked");
    }

    // Update slot
    const updated = await storage.updateRegistrationSlot(slotId, {
      registrationCaseId,
      status: "booked",
      bookedBy: userId,
      bookedAt: new Date(),
    });

    return updated;
  }

  /**
   * Reschedule a slot
   */
  async rescheduleSlot(
    oldSlotId: number,
    newSlotId: number,
    registrationCaseId: number,
    userId: number
  ): Promise<{ oldSlot: RegistrationSlot; newSlot: RegistrationSlot }> {
    // Cancel old slot
    const oldSlot = await storage.getRegistrationSlot(oldSlotId);
    if (!oldSlot || oldSlot.registrationCaseId !== registrationCaseId) {
      throw new Error("Old slot not found or not associated with this case");
    }

    await storage.updateRegistrationSlot(oldSlotId, {
      status: "cancelled",
      registrationCaseId: null,
      cancelledAt: new Date(),
    });

    // Book new slot
    const newSlot = await this.bookSlot(newSlotId, registrationCaseId, userId);

    return { oldSlot, newSlot };
  }

  /**
   * Cancel a slot booking
   */
  async cancelSlot(slotId: number, registrationCaseId: number): Promise<RegistrationSlot> {
    const slot = await storage.getRegistrationSlot(slotId);
    if (!slot) {
      throw new Error("Slot not found");
    }

    if (slot.registrationCaseId !== registrationCaseId) {
      throw new Error("Slot is not associated with this registration case");
    }

    const updated = await storage.updateRegistrationSlot(slotId, {
      status: "cancelled",
      registrationCaseId: null,
      cancelledAt: new Date(),
    });

    return updated;
  }

  /**
   * Create available slots for an SRO office
   */
  async createSlots(
    sroOffice: string,
    dates: Date[],
    timeSlots: string[] = ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"]
  ): Promise<RegistrationSlot[]> {
    const createdSlots: RegistrationSlot[] = [];

    for (const date of dates) {
      for (const timeSlot of timeSlots) {
        const [hours, minutes] = timeSlot.split(":").map(Number);
        const slotDate = new Date(date);
        slotDate.setHours(hours, minutes, 0, 0);

        // Check if slot already exists
        const existing = await storage.getRegistrationSlots({
          sroOffice,
          slotDate,
        });

        if (existing.length === 0) {
          const slot = await storage.createRegistrationSlot({
            sroOffice,
            slotDate,
            status: "available",
          });
          createdSlots.push(slot);
        }
      }
    }

    return createdSlots;
  }

  /**
   * Get slots for a registration case
   */
  async getCaseSlots(registrationCaseId: number): Promise<RegistrationSlot[]> {
    const slots = await storage.getRegistrationSlots();
    return slots.filter(s => s.registrationCaseId === registrationCaseId);
  }

  /**
   * Mark slot as completed
   */
  async completeSlot(slotId: number): Promise<RegistrationSlot> {
    const slot = await storage.getRegistrationSlot(slotId);
    if (!slot) {
      throw new Error("Slot not found");
    }

    if (slot.status !== "booked") {
      throw new Error("Only booked slots can be marked as completed");
    }

    return await storage.updateRegistrationSlot(slotId, {
      status: "completed",
    });
  }
}

export const sroService = new SroService();

