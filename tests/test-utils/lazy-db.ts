/**
 * Lazy Database Import
 * Only imports database when DATABASE_URL is available
 */

let db: any = null;
let storage: any = null;

export async function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL not set');
  }
  
  if (!db) {
    const dbModule = await import('../../server/db');
    db = dbModule.db;
  }
  
  return db;
}

export async function getStorage() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL not set');
  }
  
  if (!storage) {
    const storageModule = await import('../../server/storage');
    storage = storageModule.storage;
  }
  
  return storage;
}

