/**
 * Test Setup File
 * Runs before all tests to configure the test environment
 */

import { beforeAll, afterAll } from 'vitest';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file if it exists
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Set test environment variables if not already set
if (!process.env.DATABASE_URL) {
  // For tests, we can use a test database URL or skip database tests
  // For now, we'll require DATABASE_URL to be set
  console.warn('⚠️  DATABASE_URL not set. Database-dependent tests will be skipped.');
  console.warn('💡 Set DATABASE_URL environment variable to run database tests.');
}

// Set NODE_ENV to test if not already set
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'test';
}

beforeAll(() => {
  // Setup before all tests
  console.log('🧪 Test environment setup complete');
});

afterAll(() => {
  // Cleanup after all tests
  console.log('🧹 Test cleanup complete');
});

