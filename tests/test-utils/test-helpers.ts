/**
 * Test Utilities and Helpers
 * Common utilities for PMS testing
 */

// Lazy import database - only when DATABASE_URL is available
// This prevents errors when DATABASE_URL is not set
let db: any;
let storage: any;

// Initialize database connection lazily
async function initDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL not set. Cannot initialize database.');
  }
  
  if (!db || !storage) {
    const dbModule = await import('../../server/db');
    const storageModule = await import('../../server/storage');
    db = dbModule.db;
    storage = storageModule.storage;
  }
  
  return { db, storage };
}

// Export getters that initialize on first use
export async function getDb() {
  const { db: dbInstance } = await initDb();
  return dbInstance;
}

export async function getStorage() {
  const { storage: storageInstance } = await initDb();
  return storageInstance;
}
import { 
  users, 
  schemes, 
  properties, 
  parties, 
  applications, 
  allotments,
  demandNotes,
  pmsPayments,
  receipts,
  transfers,
  nocs,
  waterConnections,
  sewerageConnections,
  registrationCases,
} from '../../shared/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

/**
 * Create a test user
 */
export async function createTestUser(overrides?: Partial<{
  username: string;
  email: string;
  password: string;
  role: string;
  firstName: string;
  lastName: string;
}>): Promise<number> {
  const { pool } = await import('../../server/db');
  const passwordHash = overrides?.password 
    ? await bcrypt.hash(overrides.password, 10)
    : await bcrypt.hash('testpassword', 10);
  
  // Use raw SQL via pool to insert only columns that exist in the database
  // This avoids issues with schema mismatches (e.g., missing phone column)
  // Use crypto for better uniqueness (especially for parallel tests)
  const uniqueId = crypto.randomUUID().replace(/-/g, '').substring(0, 16);
  const username = overrides?.username || `testuser_${uniqueId}`;
  const email = overrides?.email || `test_${uniqueId}@example.com`;
  const firstName = overrides?.firstName || 'Test';
  const lastName = overrides?.lastName || 'User';
  const role = overrides?.role || 'case_officer';
  
  const result = await pool.query(`
    INSERT INTO users (username, email, password, first_name, last_name, role, is_active)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id
  `, [username, email, passwordHash, firstName, lastName, role, true]);
  
  return result.rows[0].id;
}

/**
 * Create a test party
 */
export async function createTestParty(overrides?: Partial<{
  name: string;
  type: string;
  phone: string;
  address: string;
}>): Promise<number> {
  const dbInstance = await getDb();
  const [party] = await dbInstance.insert(parties).values({
    type: overrides?.type || 'individual',
    name: overrides?.name || `Test Party ${Date.now()}`,
    phone: overrides?.phone || '9876543210',
    address: overrides?.address || '123 Test Street, Test City',
  }).returning();
  
  return party.id;
}

/**
 * Create a test scheme
 */
export async function createTestScheme(
  userId: number,
  overrides?: Partial<{
    name: string;
    category: string;
    status: string;
  }>
): Promise<number> {
  const [scheme] = await db.insert(schemes).values({
    name: overrides?.name || `Test Scheme ${Date.now()}`,
    category: overrides?.category || 'residential',
    status: overrides?.status || 'published',
    createdBy: userId,
  }).returning();
  
  return scheme.id;
}

/**
 * Create a test property
 */
export async function createTestProperty(
  schemeId?: number,
  overrides?: Partial<{
    parcelNo: string;
    address: string;
    area: string;
    status: string;
  }>
): Promise<number> {
  const dbInstance = await getDb();
  const [property] = await dbInstance.insert(properties).values({
    schemeId: schemeId || null,
    parcelNo: overrides?.parcelNo || `PROP-${Date.now()}`,
    address: overrides?.address || '123 Test Property, Test City',
    area: overrides?.area || '100.00',
    landUse: 'residential',
    status: overrides?.status || 'available',
  }).returning();
  
  return property.id;
}

/**
 * Create a test application
 */
export async function createTestApplication(
  schemeId: number,
  partyId: number,
  overrides?: Partial<{
    status: string;
    score: number;
  }>
): Promise<number> {
  const dbInstance = await getDb();
  const [application] = await dbInstance.insert(applications).values({
    schemeId,
    partyId,
    status: overrides?.status || 'submitted',
    score: overrides?.score ? String(overrides.score) : null,
  }).returning();
  
  return application.id;
}

/**
 * Create a test demand note
 * Returns the full demand note object for testing
 */
export async function createTestDemandNote(
  propertyId: number,
  partyId: number,
  userId: number,
  overrides?: Partial<{
    amount: string;
    dueDate: Date;
    status: string;
  }>
): Promise<{ id: number; status: string; [key: string]: any }> {
  const dbInstance = await getDb();
  const [demandNote] = await dbInstance.insert(demandNotes).values({
    propertyId,
    partyId,
    noteNo: `DEMAND-${Date.now()}`,
    scheduleJson: {},
    amount: overrides?.amount || '10000.00',
    dueDate: overrides?.dueDate || new Date(),
    status: overrides?.status || 'issued',
    createdBy: userId,
  }).returning();
  
  return demandNote;
}

/**
 * Clean up test data
 * Cleans up in reverse dependency order to handle foreign key constraints
 */
export async function cleanupTestData(userIds: number[] = []): Promise<void> {
  if (userIds.length === 0) return;
  
  try {
    const { pool } = await import('../../server/db');
    
    // Clean up in reverse dependency order (child tables first, then parent)
    // Delete all dependent records that reference these users
    
    // 1. Delete schemes (they reference users via created_by)
    await pool.query('DELETE FROM pms_schemes WHERE created_by = ANY($1)', [userIds]).catch(() => {});
    
    // 2. Delete applications (they reference users via party_id, but also schemes)
    await pool.query(`
      DELETE FROM pms_applications 
      WHERE scheme_id IN (SELECT id FROM pms_schemes WHERE created_by = ANY($1))
    `, [userIds]).catch(() => {});
    
    // 3. Delete properties (they reference schemes)
    await pool.query(`
      DELETE FROM pms_properties 
      WHERE scheme_id IN (SELECT id FROM pms_schemes WHERE created_by = ANY($1))
    `, [userIds]).catch(() => {});
    
    // 4. Delete demand notes (they reference properties and parties)
    await pool.query(`
      DELETE FROM pms_demand_notes 
      WHERE property_id IN (
        SELECT id FROM pms_properties 
        WHERE scheme_id IN (SELECT id FROM pms_schemes WHERE created_by = ANY($1))
      )
    `, [userIds]).catch(() => {});
    
    // 5. Finally delete users
    await pool.query('DELETE FROM users WHERE id = ANY($1)', [userIds]).catch(() => {});
    
  } catch (error: any) {
    // Silently ignore cleanup errors - they're not critical for test execution
    // Only log if it's a serious error
    if (error.message && !error.message.includes('does not exist') && !error.message.includes('violates foreign key')) {
      // Suppress cleanup warnings in tests
    }
  }
}

/**
 * Wait for async operations
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Mock date for testing
 */
export function mockDate(date: Date): () => void {
  const originalDate = Date;
  global.Date = class extends originalDate {
    constructor(...args: any[]) {
      if (args.length === 0) {
        super(date.getTime());
      } else {
        // Use apply to avoid spread argument issue
        super(args[0], args[1], args[2], args[3], args[4], args[5], args[6]);
      }
    }
    static now() {
      return date.getTime();
    }
  } as any;
  
  return () => {
    global.Date = originalDate;
  };
}

