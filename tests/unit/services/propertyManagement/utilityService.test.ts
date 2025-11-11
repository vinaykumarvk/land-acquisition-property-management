/**
 * Unit Tests for Utility Service
 * Tests fee calculation, serviceability checks, and SLA calculations
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { skipIfNoDatabase } from '../../../test-utils/test-skip';

const dbCheck = skipIfNoDatabase();
const describeIfDb = dbCheck.skip ? describe.skip : describe;

// Only import services if database is available
let utilityService: any;
let createTestUser: any;
let createTestProperty: any;
let cleanupTestData: any;

if (!dbCheck.skip) {
  const utilityServiceModule = await import('../../../../server/services/propertyManagement/utilityService');
  const testHelpers = await import('../../../test-utils/test-helpers');
  
  utilityService = utilityServiceModule.utilityService;
  createTestUser = testHelpers.createTestUser;
  createTestProperty = testHelpers.createTestProperty;
  cleanupTestData = testHelpers.cleanupTestData;
}

describeIfDb('UtilityService', () => {
  let testUserId: number;
  let testPropertyId: number;

  beforeEach(async () => {
    testUserId = await createTestUser();
    testPropertyId = await createTestProperty();
  });

  afterEach(async () => {
    await cleanupTestData([testUserId]);
  });

  describe('calculateConnectionFee', () => {
    it('should calculate water connection fee for domestic', async () => {
      const fee = await utilityService.calculateConnectionFee(
        testPropertyId,
        'water',
        'domestic'
      );

      expect(fee).toBeGreaterThan(0);
      expect(fee).toBe(5000); // Base fee for domestic water
    });

    it('should calculate water connection fee for commercial', async () => {
      const fee = await utilityService.calculateConnectionFee(
        testPropertyId,
        'water',
        'commercial'
      );

      expect(fee).toBe(15000); // Base fee for commercial water
    });

    it('should calculate sewerage connection fee for domestic', async () => {
      const fee = await utilityService.calculateConnectionFee(
        testPropertyId,
        'sewerage',
        'domestic'
      );

      expect(fee).toBe(3000); // Base fee for domestic sewerage
    });

    it('should add additional charges for large properties', async () => {
      // Create property with large area
      const largePropertyId = await createTestProperty(undefined, {
        area: '600.00', // 600 sq meters
      });

      const fee = await utilityService.calculateConnectionFee(
        largePropertyId,
        'water',
        'domestic'
      );

      // Base 5000 + (600 - 500) * 10 = 5000 + 1000 = 6000
      expect(fee).toBe(6000);
    });
  });

  describe('checkServiceability', () => {
    it('should check water serviceability', async () => {
      const result = await utilityService.checkServiceability(
        testPropertyId,
        'water'
      );

      expect(result).toBeDefined();
      expect(result.serviceable).toBe(true);
      expect(result.distanceToNearestLine).toBeDefined();
      expect(result.infrastructureAvailable).toBe(true);
      expect(result.reason).toBeDefined();
    });

    it('should check sewerage serviceability', async () => {
      const result = await utilityService.checkServiceability(
        testPropertyId,
        'sewerage'
      );

      expect(result).toBeDefined();
      expect(result.serviceable).toBe(true);
    });

    it('should return serviceability details', async () => {
      const result = await utilityService.checkServiceability(
        testPropertyId,
        'water'
      );

      expect(result.details).toBeDefined();
      expect(result.details?.nearestLineId).toBeDefined();
      expect(result.details?.capacity).toBeDefined();
    });

    it('should throw error for non-existent property', async () => {
      await expect(
        utilityService.checkServiceability(99999, 'water')
      ).rejects.toThrow('Property not found');
    });
  });

  describe('calculateSLADeadline', () => {
    it('should calculate SLA deadline for applied status', () => {
      const deadline = utilityService.calculateSLADeadline('water', 'applied');
      const now = new Date();
      const expectedDeadline = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

      // Allow 1 second tolerance
      expect(Math.abs(deadline.getTime() - expectedDeadline.getTime())).toBeLessThan(1000);
    });

    it('should calculate SLA deadline for inspection_scheduled status', () => {
      const deadline = utilityService.calculateSLADeadline('sewerage', 'inspection_scheduled');
      const now = new Date();
      const expectedDeadline = new Date(now.getTime() + 72 * 60 * 60 * 1000); // 72 hours

      expect(Math.abs(deadline.getTime() - expectedDeadline.getTime())).toBeLessThan(1000);
    });

    it('should calculate SLA deadline for serviceability_checked status', () => {
      const deadline = utilityService.calculateSLADeadline('water', 'serviceability_checked');
      const now = new Date();
      const expectedDeadline = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48 hours

      expect(Math.abs(deadline.getTime() - expectedDeadline.getTime())).toBeLessThan(1000);
    });
  });

  describe('validateConnectionApplication', () => {
    it('should validate valid application', () => {
      const result = utilityService.validateConnectionApplication({
        propertyId: testPropertyId,
        partyId: 1,
        connectionType: 'water',
        connectionCategory: 'domestic',
      });

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should reject missing property ID', () => {
      const result = utilityService.validateConnectionApplication({
        propertyId: 0,
        partyId: 1,
        connectionType: 'water',
        connectionCategory: 'domestic',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Property ID is required');
    });

    it('should reject missing party ID', () => {
      const result = utilityService.validateConnectionApplication({
        propertyId: testPropertyId,
        partyId: 0,
        connectionType: 'water',
        connectionCategory: 'domestic',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Party ID is required');
    });

    it('should reject invalid connection type', () => {
      const result = utilityService.validateConnectionApplication({
        propertyId: testPropertyId,
        partyId: 1,
        connectionType: 'invalid',
        connectionCategory: 'domestic',
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid connection type'))).toBe(true);
    });

    it('should reject invalid connection category', () => {
      const result = utilityService.validateConnectionApplication({
        propertyId: testPropertyId,
        partyId: 1,
        connectionType: 'water',
        connectionCategory: 'invalid',
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid connection category'))).toBe(true);
    });
  });
});

