/**
 * Test Skip Utilities
 * Helper to skip tests when database is not available
 */

export function skipIfNoDatabase() {
  if (!process.env.DATABASE_URL) {
    return {
      skip: true,
      reason: 'DATABASE_URL not set. Skipping database-dependent tests.',
    };
  }
  return { skip: false };
}

