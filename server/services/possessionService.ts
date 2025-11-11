/**
 * Possession Service
 * Handles possession scheduling, evidence capture, and certificate generation
 */

import { storage } from "../storage";
import { workflowService } from "./workflowService";
import { pdfService } from "./pdfService";
import { notificationService } from "./notificationService";
import { InsertPossession } from "@shared/schema";
import { LAMS_ROLES } from "@shared/roles";

type EvidenceGpsSource = "manual" | "exif" | "device";

const GPS_SOURCE_VALUES: readonly EvidenceGpsSource[] = ["manual", "exif", "device"] as const;

type EvidenceMediaPayload = {
  photoPath: string;
  gpsLat: number | string;
  gpsLng: number | string;
  hashSha256: string;
  gpsSource?: EvidenceGpsSource | null;
};

export class PossessionService {
  /**
   * Schedule possession
   */
  async schedulePossession(
    possessionData: Omit<InsertPossession, 'status'>,
    userId: number
  ): Promise<any> {
    try {
      // Verify parcel exists
      const parcel = await storage.getParcel(possessionData.parcelId);
      if (!parcel) {
        throw new Error('Parcel not found');
      }

      // Check if possession already exists for this parcel
      const existing = await storage.getPossessionByParcel(possessionData.parcelId);
      if (existing && !['closed', 'cancelled'].includes(existing.status)) {
        throw new Error('Active possession already exists for this parcel');
      }

      // Validate and format schedule date
      const scheduleDate = possessionData.scheduleDt instanceof Date 
        ? possessionData.scheduleDt 
        : new Date(possessionData.scheduleDt);
      
      if (scheduleDate < new Date()) {
        throw new Error('Schedule date cannot be in the past');
      }

      // Create possession with properly formatted date (use Date object, drizzle will handle conversion)
      const possession = await storage.createPossession({
        ...possessionData,
        scheduleDt: scheduleDate,
        status: 'scheduled',
        createdBy: userId,
      });

      // Get parcel owners to notify
      const parcelOwners = await storage.getParcelOwners(possessionData.parcelId);
      const owners = await Promise.all(
        parcelOwners.map(po => storage.getOwner(po.ownerId))
      );

      // Notify owners (if they have user accounts)
      for (const owner of owners) {
        if (owner && owner.phone) {
          // In a real system, you'd look up user by phone/aadhaar
          // For now, we'll create a notification if owner has a user account
          // This would typically be done via SMS/email in production
        }
      }

      // Create task for case officer
      await storage.createTask({
        assigneeId: userId,
        requestType: 'possession',
        requestId: possession.id,
        taskType: 'action',
        title: `Conduct Possession - Parcel ${parcel.parcelNo}`,
        description: `Possession scheduled for ${new Date(possessionData.scheduleDt).toLocaleDateString()}. Location: ${parcel.village}, ${parcel.district}`,
        dueDate: new Date(possessionData.scheduleDt),
      });

      // Create audit log (placeholder - implement if audit log table exists)
      // await storage.createAuditLog({
      //   userId,
      //   action: 'schedule_possession',
      //   resourceType: 'possession',
      //   resourceId: possession.id,
      //   details: { parcelId: possessionData.parcelId, scheduleDate: possessionData.scheduleDt },
      // });

      return possession;
    } catch (error) {
      console.error('Error scheduling possession:', error);
      throw error;
    }
  }

  /**
   * Start possession (mark as in progress)
   */
  async startPossession(possessionId: number, userId: number): Promise<any> {
    try {
      const possession = await storage.getPossession(possessionId);
      if (!possession) {
        throw new Error('Possession not found');
      }

      if (possession.status !== 'scheduled') {
        throw new Error('Possession must be scheduled before it can be started');
      }

      // Validate schedule date
      if (new Date(possession.scheduleDt) > new Date()) {
        throw new Error('Cannot start possession before scheduled date');
      }

      await workflowService.transitionPossessionState(possessionId, 'in_progress', userId);
      const updated = await storage.updatePossession(possessionId, {
        status: 'in_progress',
      });

      // Create audit log (placeholder - implement if audit log table exists)
      // await storage.createAuditLog({
      //   userId,
      //   action: 'start_possession',
      //   resourceType: 'possession',
      //   resourceId: possessionId,
      //   details: {},
      // });

      return updated;
    } catch (error) {
      console.error('Error starting possession:', error);
      throw error;
    }
  }

  /**
   * Upload possession evidence (photos with GPS)
   */
  async uploadEvidence(
    possessionId: number,
    mediaData: EvidenceMediaPayload[],
    userId: number
  ): Promise<any> {
    try {
      const possession = await storage.getPossession(possessionId);
      if (!possession) {
        throw new Error('Possession not found');
      }

      if (!['in_progress', 'evidence_captured'].includes(possession.status)) {
        throw new Error('Evidence can only be uploaded during possession');
      }

      // Validate at least one photo
      if (mediaData.length === 0) {
        throw new Error('At least one photo is required');
      }

      // Normalize and validate media payload
      const normalizedMedia = mediaData.map((media) => {
        const lat = Number(media.gpsLat);
        const lng = Number(media.gpsLng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          throw new Error('Valid coordinates are required for each photo');
        }
        const sourceInput = media.gpsSource ?? undefined;
        let source: EvidenceGpsSource = 'manual';
        if (sourceInput && GPS_SOURCE_VALUES.includes(sourceInput)) {
          source = sourceInput;
        }
        return {
          photoPath: media.photoPath,
          gpsLat: lat,
          gpsLng: lng,
          hashSha256: media.hashSha256,
          gpsSource: source,
        };
      });

      // Create media records
      const mediaRecords = [];
      for (const media of normalizedMedia) {
        const record = await storage.createPossessionMedia({
          possessionId,
          photoPath: media.photoPath,
          gpsLat: media.gpsLat.toFixed(7),
          gpsLng: media.gpsLng.toFixed(7),
          hashSha256: media.hashSha256,
          gpsSource: media.gpsSource,
        });
        mediaRecords.push(record);
      }

      // Update possession status to evidence_captured
      await workflowService.transitionPossessionState(possessionId, 'evidence_captured', userId);
      const updated = await storage.updatePossession(possessionId, {
        status: 'evidence_captured',
      });

      // Create audit log (placeholder - implement if audit log table exists)
      // await storage.createAuditLog({
      //   userId,
      //   action: 'upload_evidence',
      //   resourceType: 'possession',
      //   resourceId: possessionId,
      //   details: { photoCount: mediaData.length },
      // });

      return { ...updated, media: mediaRecords };
    } catch (error) {
      console.error('Error uploading evidence:', error);
      throw error;
    }
  }

  /**
   * Generate possession certificate
   */
  async generateCertificate(possessionId: number, userId: number): Promise<any> {
    try {
      const possession = await storage.getPossession(possessionId);
      if (!possession) {
        throw new Error('Possession not found');
      }

      if (possession.status !== 'evidence_captured') {
        throw new Error('Certificate can only be generated after evidence is captured');
      }

      // Get possession media
      const media = await storage.getPossessionMedia(possessionId);
      if (media.length === 0) {
        throw new Error('At least one photo is required to generate certificate');
      }

      // Get parcel details
      const parcel = await storage.getParcel(possession.parcelId);
      if (!parcel) {
        throw new Error('Parcel not found');
      }

      // Get parcel owners
      const parcelOwners = await storage.getParcelOwners(possession.parcelId);
      const owners = await Promise.all(
        parcelOwners.map(po => storage.getOwner(po.ownerId))
      );

      // Generate certificate PDF
      const { filePath: certificatePath, hash: certificateHash } = await pdfService.generatePossessionCertificate(
        possessionId,
        parcel.parcelNo,
        new Date(possession.scheduleDt),
        media.map(m => ({
          path: m.photoPath,
          lat: m.gpsLat ? Number(m.gpsLat) : undefined,
          lng: m.gpsLng ? Number(m.gpsLng) : undefined,
        })),
        possession.remarks || undefined
      );

      // Update possession
      await workflowService.transitionPossessionState(possessionId, 'certificate_issued', userId);
      const updated = await storage.updatePossession(possessionId, {
        status: 'certificate_issued',
        certificatePdfPath: certificatePath,
      });

      // Update parcel status
      await storage.updateParcel(possession.parcelId, {
        status: 'possessed',
      });

      // Notify owners
      for (const owner of owners) {
        if (owner) {
          // In production, send SMS/email notification
          // For now, create notification if owner has user account
        }
      }

      // Create audit log (placeholder - implement if audit log table exists)
      // await storage.createAuditLog({
      //   userId,
      //   action: 'generate_certificate',
      //   resourceType: 'possession',
      //   resourceId: possessionId,
      //   details: { certificatePath, hash: certificateHash },
      // });

      return { ...updated, certificateHash };
    } catch (error) {
      console.error('Error generating certificate:', error);
      throw error;
    }
  }

  /**
   * Mark registry as updated
   */
  async updateRegistry(possessionId: number, userId: number): Promise<any> {
    try {
      const possession = await storage.getPossession(possessionId);
      if (!possession) {
        throw new Error('Possession not found');
      }

      if (possession.status !== 'certificate_issued') {
        throw new Error('Registry can only be updated after certificate is issued');
      }

      await workflowService.transitionPossessionState(possessionId, 'registry_updated', userId);
      const updated = await storage.updatePossession(possessionId, {
        status: 'registry_updated',
      });

      // Create audit log (placeholder - implement if audit log table exists)
      // await storage.createAuditLog({
      //   userId,
      //   action: 'update_registry',
      //   resourceType: 'possession',
      //   resourceId: possessionId,
      //   details: {},
      // });

      return updated;
    } catch (error) {
      console.error('Error updating registry:', error);
      throw error;
    }
  }

  /**
   * Close possession
   */
  async closePossession(possessionId: number, userId: number): Promise<any> {
    try {
      const possession = await storage.getPossession(possessionId);
      if (!possession) {
        throw new Error('Possession not found');
      }

      if (possession.status !== 'registry_updated') {
        throw new Error('Possession can only be closed after registry is updated');
      }

      await workflowService.transitionPossessionState(possessionId, 'closed', userId);
      const updated = await storage.updatePossession(possessionId, {
        status: 'closed',
      });

      // Create audit log (placeholder - implement if audit log table exists)
      // await storage.createAuditLog({
      //   userId,
      //   action: 'close_possession',
      //   resourceType: 'possession',
      //   resourceId: possessionId,
      //   details: {},
      // });

      return updated;
    } catch (error) {
      console.error('Error closing possession:', error);
      throw error;
    }
  }

  /**
   * Get possession with related data
   */
  async getPossessionWithDetails(possessionId: number): Promise<any> {
    try {
      const possession = await storage.getPossession(possessionId);
      if (!possession) {
        throw new Error('Possession not found');
      }

      const parcel = await storage.getParcel(possession.parcelId);
      const media = await storage.getPossessionMedia(possessionId);
      const parcelOwners = await storage.getParcelOwners(possession.parcelId);
      const owners = await Promise.all(
        parcelOwners.map(po => storage.getOwner(po.ownerId))
      );

      return {
        ...possession,
        parcel,
        media,
        owners: owners.filter(o => o !== undefined),
        photoCount: media.length,
      };
    } catch (error) {
      console.error('Error getting possession details:', error);
      throw error;
    }
  }

  /**
   * Get all possessions with filters
   */
  async getPossessions(filters?: { parcelId?: number; status?: string }): Promise<any[]> {
    return await storage.getPossessions(filters);
  }
}

export const possessionService = new PossessionService();
