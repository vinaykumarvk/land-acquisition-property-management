/**
 * Valuation Service
 * Handles circle rate-based valuation and stamp duty/registration fee calculation
 */

import { storage } from "../../storage";
import { Property } from "@shared/schema";

export interface CircleRateConfig {
  ratePerSqM: number;
  areaMultiplier?: number;
  locationMultiplier?: number;
  propertyTypeMultiplier?: number;
}

export interface StampDutyConfig {
  baseRate: number; // Percentage of consideration/valuation
  slabRates?: Array<{ min: number; max: number; rate: number }>; // Slab-based rates
}

export interface RegistrationFeeConfig {
  baseFee: number; // Fixed fee
  percentageFee?: number; // Percentage of consideration/valuation
  maxFee?: number; // Maximum fee cap
}

export class ValuationService {
  /**
   * Calculate property valuation based on circle rate
   */
  calculateValuation(
    property: Property,
    circleRate: number,
    multipliers: Record<string, number> = {}
  ): number {
    // Base calculation: circle_rate * area
    let valuation = Number(circleRate) * Number(property.area);

    // Apply multipliers
    Object.values(multipliers).forEach(multiplier => {
      valuation *= multiplier;
    });

    return Math.round(valuation * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Calculate stamp duty based on consideration or valuation
   */
  calculateStampDuty(
    considerationOrValuation: number,
    config: StampDutyConfig = { baseRate: 5.0 } // Default 5%
  ): number {
    let stampDuty = 0;

    if (config.slabRates && config.slabRates.length > 0) {
      // Slab-based calculation
      let remaining = considerationOrValuation;
      for (const slab of config.slabRates) {
        if (remaining <= 0) break;
        
        const slabAmount = Math.min(
          remaining,
          slab.max ? (slab.max - slab.min) : remaining
        );
        stampDuty += (slabAmount * slab.rate) / 100;
        remaining -= slabAmount;
      }
    } else {
      // Simple percentage calculation
      stampDuty = (considerationOrValuation * config.baseRate) / 100;
    }

    return Math.round(stampDuty * 100) / 100;
  }

  /**
   * Calculate registration fee
   */
  calculateRegistrationFee(
    considerationOrValuation: number,
    config: RegistrationFeeConfig = { baseFee: 1000, percentageFee: 1.0, maxFee: 100000 }
  ): number {
    let fee = config.baseFee || 0;

    if (config.percentageFee) {
      const percentageAmount = (considerationOrValuation * config.percentageFee) / 100;
      fee += percentageAmount;
    }

    if (config.maxFee && fee > config.maxFee) {
      fee = config.maxFee;
    }

    return Math.round(fee * 100) / 100;
  }

  /**
   * Get circle rate for a property (from configuration or property attributes)
   * This is a stub - in production, this would fetch from a circle rate master table
   */
  async getCircleRate(property: Property): Promise<number> {
    // TODO: Implement circle rate lookup based on:
    // - Property location (district/taluka/village)
    // - Property type (residential/commercial/industrial)
    // - Land use
    // For now, return a default rate
    return 5000; // Default: 5000 per sq meter
  }

  /**
   * Calculate total registration charges (stamp duty + registration fee)
   */
  calculateTotalCharges(
    considerationOrValuation: number,
    stampDutyConfig?: StampDutyConfig,
    registrationFeeConfig?: RegistrationFeeConfig
  ): { stampDuty: number; registrationFee: number; total: number } {
    const stampDuty = this.calculateStampDuty(considerationOrValuation, stampDutyConfig);
    const registrationFee = this.calculateRegistrationFee(considerationOrValuation, registrationFeeConfig);
    const total = stampDuty + registrationFee;

    return {
      stampDuty: Math.round(stampDuty * 100) / 100,
      registrationFee: Math.round(registrationFee * 100) / 100,
      total: Math.round(total * 100) / 100,
    };
  }
}

export const valuationService = new ValuationService();

