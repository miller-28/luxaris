require('dotenv').config();

// Set test environment
process.env.NODE_ENV = 'test';
// Use same database as development

// Global test timeout
jest.setTimeout(10000);

// Clean up after all tests
afterAll(async () => {
	// Close database connections, etc.
	// Will be implemented when database pool is created
});
