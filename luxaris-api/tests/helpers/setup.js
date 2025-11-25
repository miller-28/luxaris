require('dotenv').config();

// Set test environment
process.env.NODE_ENV = 'test';
process.env.DB_NAME = process.env.DB_TEST_NAME;

// Global test timeout
jest.setTimeout(10000);

// Clean up after all tests
afterAll(async () => {
  // Close database connections, etc.
  // Will be implemented when database pool is created
});
