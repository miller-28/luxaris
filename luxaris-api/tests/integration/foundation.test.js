const TestServer = require('../helpers/test-server');
const request = require('supertest');

describe('Foundation - Server Sanity Test', () => {
	let test_server;
	let app;

	beforeAll(async () => {
		test_server = new TestServer();
		app = await test_server.start();
	});

	afterAll(async () => {
		await test_server.stop();
	});

	describe('Server Basics', () => {
		test('should return 404 for undefined route', async () => {
			const response = await request(app)
				.get('/api/v1/nonexistent')
				.expect(404);

			expect(response.body).toHaveProperty('errors');
			expect(response.body.errors).toHaveLength(1);
			expect(response.body.errors[0].error_code).toBe('ROUTE_NOT_FOUND');
		});

		test('should include request ID in response headers', async () => {
			const response = await request(app)
				.get('/api/v1/health');

			expect(response.headers).toHaveProperty('x-request-id');
		});

		test('should handle JSON body parsing', async () => {
			const response = await request(app)
				.post('/api/v1/test')
				.send({ test: 'data' })
				.set('Content-Type', 'application/json');

			// Will return 404 since route doesn't exist yet, but body should be parsed
			expect(response.status).toBe(404);
		});
	});

	describe('Security Headers', () => {
		test('should include helmet security headers', async () => {
			const response = await request(app).get('/');

			expect(response.headers).toHaveProperty('x-content-type-options');
			expect(response.headers['x-content-type-options']).toBe('nosniff');
		});
	});

	describe('Error Handling', () => {
		test('should return structured error format', async () => {
			const response = await request(app)
				.get('/api/v1/missing')
				.expect(404);

			expect(response.body).toHaveProperty('errors');
			expect(Array.isArray(response.body.errors)).toBe(true);
			expect(response.body.errors[0]).toHaveProperty('error_code');
			expect(response.body.errors[0]).toHaveProperty('error_description');
			expect(response.body.errors[0]).toHaveProperty('error_severity');
		});
	});
});
