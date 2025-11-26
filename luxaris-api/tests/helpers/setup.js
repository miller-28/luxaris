require('dotenv').config();

// Set test environment
process.env.NODE_ENV = 'test';
process.env.DB_HOST = process.env.DB_TEST_HOST;
process.env.DB_PORT = process.env.DB_TEST_PORT;
process.env.DB_USER = process.env.DB_TEST_USER;
process.env.DB_PASSWORD = process.env.DB_TEST_PASSWORD;
process.env.DB_NAME = process.env.DB_TEST_NAME;
process.env.DB_SCHEMA = process.env.DB_TEST_SCHEMA;

// Global test timeout
jest.setTimeout(10000);

// Clean up after all tests
afterAll(async () => {
	// Close database connections, etc.
	// Will be implemented when database pool is created
});
