/**
 * Citizen Alert Service (Stub)
 * Logs outbound alert requests for Email/SMS/WhatsApp.
 * Replace these stubs with real integrations when gateways are available.
 */

import { notificationService } from "./notificationService";
import { storage } from "../storage";
import { LAMS_ROLES } from "@shared/roles";

type Channel = "email" | "sms" | "whatsapp";

interface AlertPayload {
  notificationId: number;
  notificationRef: string;
  title: string;
  bodyPreview: string;
  channels: Channel[];
}

class CitizenAlertService {
  async sendAlerts(payload: AlertPayload): Promise<void> {
    if (!payload.channels.length) {
      return;
    }

    const timestamp = new Date().toISOString();
    console.log(
      `[CitizenAlertStub] ${timestamp} :: Notification ${payload.notificationRef} via [${payload.channels.join(
        ", "
      )}] :: ${payload.title}`
    );

    // Notify admins for auditability.
    const users = await storage.getAllUsers();
    const admins = users.filter((user) => user.role === LAMS_ROLES.ADMIN);
    await Promise.all(
      admins.map((admin) =>
        notificationService.createNotification({
          userId: admin.id,
          title: "Citizen alerts dispatched",
          message: `Notification ${payload.notificationRef} shared via ${payload.channels.join(", ")}`,
          type: "status_update",
          relatedType: "land_notification",
          relatedId: payload.notificationId,
        })
      )
    );
  }
}

export const citizenAlertService = new CitizenAlertService();

