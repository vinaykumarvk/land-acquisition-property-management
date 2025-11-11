/**
 * Draw Service
 * Handles e-draw (electronic draw) system with randomization and audit trail
 */

import { storage } from "../../storage";
import { Application } from "@shared/schema";
import crypto from "crypto";

export interface DrawResult {
  applicationId: number;
  partyId: number;
  drawSequence: number;
  selected: boolean;
  auditHash: string;
}

export interface DrawAudit {
  drawId: string;
  schemeId: number;
  totalApplications: number;
  selectedCount: number;
  drawDate: Date;
  results: DrawResult[];
  randomSeed: string;
  auditHash: string;
}

export class DrawService {
  /**
   * Conduct e-draw for a scheme
   * Implements fair randomization with audit trail
   */
  async conductDraw(
    schemeId: number,
    selectedCount: number,
    userId: number
  ): Promise<DrawAudit> {
    try {
      // Get all verified applications for the scheme
      const applications = await storage.getApplications({
        schemeId,
        status: "verified",
      });

      if (applications.length === 0) {
        throw new Error("No verified applications found for this scheme");
      }

      if (selectedCount > applications.length) {
        throw new Error(
          `Selected count (${selectedCount}) cannot exceed total applications (${applications.length})`
        );
      }

      // Generate random seed for reproducibility
      const randomSeed = crypto.randomBytes(32).toString("hex");
      const drawId = `DRAW-${schemeId}-${Date.now()}`;

      // Create a copy of applications with their IDs for shuffling
      const applicationsCopy = applications.map((app, index) => ({
        ...app,
        originalIndex: index,
      }));

      // Fisher-Yates shuffle with seeded random
      const shuffled = this.shuffleWithSeed(applicationsCopy, randomSeed);

      // Select top N applications
      const selected = shuffled.slice(0, selectedCount);
      const rejected = shuffled.slice(selectedCount);

      // Update application statuses and draw sequences
      const results: DrawResult[] = [];

      // Selected applications
      for (let i = 0; i < selected.length; i++) {
        const app = selected[i];
        const drawSeq = i + 1;

        await storage.updateApplication(app.id, {
          status: "selected",
          drawSeq,
        });

        results.push({
          applicationId: app.id,
          partyId: app.partyId,
          drawSequence: drawSeq,
          selected: true,
          auditHash: this.generateAuditHash(app.id, drawSeq, true, randomSeed),
        });
      }

      // Rejected applications
      for (const app of rejected) {
        await storage.updateApplication(app.id, {
          status: "rejected",
        });

        results.push({
          applicationId: app.id,
          partyId: app.partyId,
          drawSequence: 0,
          selected: false,
          auditHash: this.generateAuditHash(app.id, 0, false, randomSeed),
        });
      }

      // Generate overall audit hash
      const auditHash = this.generateDrawAuditHash(
        drawId,
        schemeId,
        results,
        randomSeed
      );

      const drawAudit: DrawAudit = {
        drawId,
        schemeId,
        totalApplications: applications.length,
        selectedCount: selected.length,
        drawDate: new Date(),
        results,
        randomSeed,
        auditHash,
      };

      // Store draw audit (in production, save to database)
      // await storage.createDrawAudit(drawAudit);

      // Update scheme status
      await storage.updateScheme(schemeId, {
        status: "closed", // Scheme draw completed
      });

      return drawAudit;
    } catch (error) {
      console.error("Error conducting draw:", error);
      throw error;
    }
  }

  /**
   * Fisher-Yates shuffle with seed for reproducibility
   */
  private shuffleWithSeed<T>(array: T[], seed: string): T[] {
    const shuffled = [...array];
    const seedHash = crypto.createHash("sha256").update(seed).digest("hex");
    let seedValue = parseInt(seedHash.substring(0, 8), 16);

    // Simple seeded random number generator
    const seededRandom = () => {
      seedValue = (seedValue * 9301 + 49297) % 233280;
      return seedValue / 233280;
    };

    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(seededRandom() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled;
  }

  /**
   * Generate audit hash for individual application result
   */
  private generateAuditHash(
    applicationId: number,
    drawSeq: number,
    selected: boolean,
    seed: string
  ): string {
    const data = `${applicationId}-${drawSeq}-${selected}-${seed}`;
    return crypto.createHash("sha256").update(data).digest("hex");
  }

  /**
   * Generate overall draw audit hash
   */
  private generateDrawAuditHash(
    drawId: string,
    schemeId: number,
    results: DrawResult[],
    seed: string
  ): string {
    const resultsHash = results
      .map((r) => r.auditHash)
      .sort()
      .join("-");
    const data = `${drawId}-${schemeId}-${resultsHash}-${seed}`;
    return crypto.createHash("sha256").update(data).digest("hex");
  }

  /**
   * Verify draw integrity using audit hash
   */
  async verifyDraw(drawAudit: DrawAudit): Promise<boolean> {
    try {
      const expectedHash = this.generateDrawAuditHash(
        drawAudit.drawId,
        drawAudit.schemeId,
        drawAudit.results,
        drawAudit.randomSeed
      );
      return expectedHash === drawAudit.auditHash;
    } catch (error) {
      console.error("Error verifying draw:", error);
      return false;
    }
  }
}

export const drawService = new DrawService();

