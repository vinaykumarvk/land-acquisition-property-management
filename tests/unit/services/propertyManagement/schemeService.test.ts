/**
 * Unit Tests for Scheme Service
 * Tests scheme creation, validation, and management
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { skipIfNoDatabase } from '../../../test-utils/test-skip';

const dbCheck = skipIfNoDatabase();
const describeIfDb = dbCheck.skip ? describe.skip : describe;

// Only import services if database is available
let schemeService: any;
let storage: any;
let createTestUser: any;
let cleanupTestData: any;

if (!dbCheck.skip) {
  const schemeServiceModule = await import('../../../../server/services/propertyManagement/schemeService');
  const storageModule = await import('../../../../server/storage');
  const testHelpers = await import('../../../test-utils/test-helpers');
  
  schemeService = schemeServiceModule.schemeService;
  storage = storageModule.storage;
  createTestUser = testHelpers.createTestUser;
  cleanupTestData = testHelpers.cleanupTestData;
}

describeIfDb('SchemeService', () => {
  let testUserId: number;
  let testSchemeIds: number[] = [];

  beforeEach(async () => {
    // Use unique username for each test to avoid conflicts
    testUserId = await createTestUser({
      role: 'admin',
    });
  });

  afterEach(async () => {
    // Cleanup test schemes first (they reference users via foreign key)
    if (testSchemeIds.length > 0) {
      try {
        const { pool } = await import('../../../../server/db');
        await pool.query('DELETE FROM pms_schemes WHERE id = ANY($1)', [testSchemeIds]);
      } catch (error) {
        // Ignore cleanup errors
      }
      testSchemeIds = [];
    }
    // Then cleanup user
    await cleanupTestData([testUserId]);
  });

  describe('createScheme', () => {
    it('should create a scheme with valid data', async () => {
      const schemeData = {
        name: 'Test Housing Scheme',
        category: 'residential',
        eligibilityJson: { minAge: 18, maxAge: 65 },
        inventoryJson: { totalPlots: 100, availablePlots: 100 },
      };

      const scheme = await schemeService.createScheme(schemeData, testUserId);
      
      expect(scheme).toBeDefined();
      expect(scheme.name).toBe(schemeData.name);
      expect(scheme.category).toBe(schemeData.category);
      expect(scheme.status).toBe('draft');
      expect(scheme.createdBy).toBe(testUserId);
      
      testSchemeIds.push(scheme.id);
    });

    it('should validate required fields', async () => {
      await expect(
        schemeService.createScheme({
          name: '',
          category: 'residential',
        } as any, testUserId)
      ).rejects.toThrow();
    });

    it('should validate category enum', async () => {
      await expect(
        schemeService.createScheme({
          name: 'Test Scheme',
          category: 'invalid_category',
        } as any, testUserId)
      ).rejects.toThrow();
    });
  });

  describe('getScheme', () => {
    it('should retrieve a scheme by ID', async () => {
      const scheme = await schemeService.createScheme({
        name: 'Test Scheme',
        category: 'residential',
      }, testUserId);
      
      testSchemeIds.push(scheme.id);
      
      const retrieved = await schemeService.getScheme(scheme.id);
      
      expect(retrieved).toBeDefined();
      expect(retrieved.id).toBe(scheme.id);
      expect(retrieved.name).toBe(scheme.name);
    });

    it('should throw error for non-existent scheme', async () => {
      await expect(
        schemeService.getScheme(99999)
      ).rejects.toThrow('Scheme not found');
    });
  });

  describe('updateScheme', () => {
    it('should update scheme details', async () => {
      const scheme = await schemeService.createScheme({
        name: 'Test Scheme',
        category: 'residential',
      }, testUserId);
      
      testSchemeIds.push(scheme.id);
      
      const updated = await schemeService.updateScheme(
        scheme.id,
        {
          name: 'Updated Scheme Name',
          status: 'published',
        },
        testUserId
      );
      
      expect(updated.name).toBe('Updated Scheme Name');
      expect(updated.status).toBe('published');
    });

    it('should throw error when updating non-existent scheme', async () => {
      await expect(
        schemeService.updateScheme(99999, {
          name: 'Updated Name',
        }, testUserId)
      ).rejects.toThrow('Scheme not found');
    });
  });

  describe('getSchemes', () => {
    it('should retrieve all schemes', async () => {
      const scheme1 = await schemeService.createScheme({
        name: 'Scheme 1',
        category: 'residential',
      }, testUserId);
      
      const scheme2 = await schemeService.createScheme({
        name: 'Scheme 2',
        category: 'commercial',
      }, testUserId);
      
      testSchemeIds.push(scheme1.id, scheme2.id);
      
      const schemes = await schemeService.getSchemes();
      
      expect(schemes.length).toBeGreaterThanOrEqual(2);
      expect(schemes.some(s => s.id === scheme1.id)).toBe(true);
      expect(schemes.some(s => s.id === scheme2.id)).toBe(true);
    });

    it('should filter schemes by status', async () => {
      const scheme1 = await schemeService.createScheme({
        name: 'Draft Scheme',
        category: 'residential',
      }, testUserId);
      
      const scheme2 = await schemeService.createScheme({
        name: 'Published Scheme',
        category: 'residential',
      }, testUserId);
      
      testSchemeIds.push(scheme1.id, scheme2.id);
      
      await schemeService.updateScheme(scheme2.id, { status: 'published' }, testUserId);
      
      const publishedSchemes = await schemeService.getSchemes({ status: 'published' });
      
      expect(publishedSchemes.some(s => s.id === scheme2.id)).toBe(true);
      expect(publishedSchemes.every(s => s.status === 'published')).toBe(true);
    });
  });
});

