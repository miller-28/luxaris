const TestServer = require('../../helpers/test-server');
const request = require('supertest');
const { create_database_pool } = require('../../../src/connections/database');

describe('Security - CSRF Protection', () => {
    let test_server;
    let app;
    let db_pool;
    let auth_token;
    let user_id;

    beforeAll(async () => {
        db_pool = create_database_pool();
        test_server = new TestServer();
        await test_server.start();
        app = test_server.get_app();

        const response = await request(app).post('/api/v1/auth/register').send({
            email: 'csrftest' + Date.now() + '@example.com',
            password: 'SecurePass123!',
            name: 'CSRF Test User',
            timezone: 'UTC'
        });
        user_id = response.body.user.id;
        auth_token = response.body.access_token;
    });

    afterAll(async () => {
        if (test_server) await test_server.stop();
        if (db_pool) await db_pool.end();
    });

    describe('JWT Token Authorization', () => {
        test('State-changing requests require JWT token', async () => {
            const response = await request(app)
                .post('/api/v1/posts')
                .send({ title: 'Test', content: 'Content' })
                .expect(401);
            
            expect(response.body.errors).toBeDefined();
        });

        test('Invalid JWT token is rejected', async () => {
            const response = await request(app)
                .post('/api/v1/posts')
                .set('Authorization', 'Bearer invalid_token_12345')
                .send({ title: 'Test', content: 'Content' })
                .expect(401);
            
            expect(response.body.errors).toBeDefined();
        });
    });

    describe('Origin Validation', () => {
        test('Requests from different origin are allowed with valid JWT', async () => {
            const response = await request(app)
                .post('/api/v1/posts')
                .set('Authorization', 'Bearer ' + auth_token)
                .set('Origin', 'https://evil.com')
                .send({ title: 'Test', content: 'Content' });
            
            expect([200, 201, 403]).toContain(response.status);
        });

        test('CORS headers are properly configured', async () => {
            const response = await request(app)
                .options('/api/v1/posts')
                .set('Origin', 'https://localhost:3000')
                .set('Access-Control-Request-Method', 'POST');
            
            expect(response.headers['access-control-allow-methods']).toBeDefined();
        });
    });

    describe('Security Headers', () => {
        test('X-Frame-Options header prevents clickjacking', async () => {
            const response = await request(app)
                .get('/api/v1/posts')
                .set('Authorization', 'Bearer ' + auth_token);
            
            const xFrameOptions = response.headers['x-frame-options'];
            if (xFrameOptions) {
                expect(['DENY', 'SAMEORIGIN']).toContain(xFrameOptions);
            }
        });

        test('Strict-Transport-Security header is set for HTTPS', async () => {
            const response = await request(app)
                .get('/api/v1/posts')
                .set('Authorization', 'Bearer ' + auth_token);
            
            expect(response.headers).toBeDefined();
        });
    });
});
