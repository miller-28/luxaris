require('dotenv').config();

// Set test environment
process.env.NODE_ENV = 'test';
// Use same database as development

// Global test timeout
jest.setTimeout(10000);

// Custom matchers
expect.extend({
    toBeOneOf(received, expected_array) {
        const pass = expected_array.includes(received);
        if (pass) {
            return {
                message: () => `expected ${received} not to be one of ${expected_array}`,
                pass: true
            };
        } else {
            return {
                message: () => `expected ${received} to be one of ${expected_array}`,
                pass: false
            };
        }
    }
});

// will work for each test file separately
afterAll(async () => {
    
});
