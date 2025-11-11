/**
 * Test Database Helper
 * Provides database connection for tests with proper error handling
 */

let dbAvailable = false;

export function checkDatabaseAvailable(): boolean {
  if (process.env.DATABASE_URL) {
    dbAvailable = true;
    return true;
  }
  return false;
}

export function skipIfNoDatabase() {
  if (!checkDatabaseAvailable()) {
    return {
      skip: true,
      reason: 'DATABASE_URL not set. Skipping database-dependent tests.',
    };
  }
  return { skip: false };
}

