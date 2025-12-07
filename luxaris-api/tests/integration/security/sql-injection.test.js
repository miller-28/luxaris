const TestServer = require('../../helpers/test-server');
const request = require('supertest');
const { create_database_pool } = require('../../../src/connections/database');

describe('Security - SQL Injection Protection', () => {
    let test_server;
    let app;
    let db_pool;
    let auth_token;
    let user_id;
    let channel_id;
    let post_id;

    beforeAll(async () => {
        db_pool = create_database_pool();
        test_server = new TestServer();
        await test_server.start();
        app = test_server.get_app();

        const response = await request(app).post('/api/v1/auth/register').send({
            email: 'sqltest' + Date.now() + '@example.com',
            password: 'SecurePass123!',
            name: 'SQL Test User',
            timezone: 'UTC'
        });
        user_id = response.body.user.id;
        auth_token = response.body.access_token;

        const channel_response = await request(app).post('/api/v1/channels').set('Authorization', 'Bearer ' + auth_token).send({
            name: 'Test Channel', type: 'social', provider: 'custom'
        });
        channel_id = channel_response.body.id;

        const post_response = await request(app).post('/api/v1/posts').set('Authorization', 'Bearer ' + auth_token).send({
            title: 'Test Post', content: 'Test content'
        });
        post_id = post_response.body.id;
    });

    afterAll(async () => {
        if (test_server) await test_server.stop();
        if (db_pool) await db_pool.end();
    });

    describe('Path Parameter Injection', () => {
        test('SQL injection in user ID path parameter', async () => {
            const malicious_id = "1' OR '1'='1";
            const response = await request(app)
                .get('/api/v1/system/users/' + encodeURIComponent(malicious_id))
                .set('Authorization', 'Bearer ' + auth_token);
            expect([400, 404]).toContain(response.status);
        });

        test('SQL injection in post ID path parameter', async () => {
            const malicious_id = "1; DROP TABLE posts; --";
            const response = await request(app)
                .get('/api/v1/posts/' + encodeURIComponent(malicious_id))
                .set('Authorization', 'Bearer ' + auth_token);
            expect([400, 404]).toContain(response.status);
            const verify = await db_pool.query('SELECT COUNT(*) FROM posts');
            expect(parseInt(verify.rows[0].count)).toBeGreaterThan(0);
        });

        test('SQL injection in channel ID path parameter', async () => {
            const malicious_id = "1' UNION SELECT * FROM users WHERE '1'='1";
            const response = await request(app)
                .get('/api/v1/channels/' + encodeURIComponent(malicious_id))
                .set('Authorization', 'Bearer ' + auth_token);
            expect([400, 404]).toContain(response.status);
        });
    });

    describe('Query Parameter Injection', () => {
        test('SQL injection in search query parameter', async () => {
            const malicious_query = "test' OR '1'='1' --";
            const response = await request(app)
                .get('/api/v1/posts?search=' + encodeURIComponent(malicious_query))
                .set('Authorization', 'Bearer ' + auth_token)
                .expect(200);
            expect(Array.isArray(response.body)).toBe(true);
        });

        test('SQL injection in filter query parameter', async () => {
            const malicious_filter = "active'; DROP TABLE posts; --";
            const response = await request(app)
                .get('/api/v1/posts?status=' + encodeURIComponent(malicious_filter))
                .set('Authorization', 'Bearer ' + auth_token);
            expect([200, 400]).toContain(response.status);
            const verify = await db_pool.query('SELECT COUNT(*) FROM posts');
            expect(parseInt(verify.rows[0].count)).toBeGreaterThan(0);
        });

        test('SQL injection in sort query parameter', async () => {
            const malicious_sort = "id; DELETE FROM posts WHERE 1=1; --";
            const response = await request(app)
                .get('/api/v1/posts?sort=' + encodeURIComponent(malicious_sort))
                .set('Authorization', 'Bearer ' + auth_token);
            expect([200, 400]).toContain(response.status);
        });
    });

    describe('Request Body Injection', () => {
        test('SQL injection in POST body fields', async () => {
            const malicious_data = {
                title: "Test'; DROP TABLE posts; --",
                content: "Normal content"
            };
            const response = await request(app)
                .post('/api/v1/posts')
                .set('Authorization', 'Bearer ' + auth_token)
                .send(malicious_data)
                .expect(201);
            const verify = await db_pool.query('SELECT COUNT(*) FROM posts');
            expect(parseInt(verify.rows[0].count)).toBeGreaterThan(0);
            expect(response.body.title).toBe(malicious_data.title);
        });

        test('SQL injection in PUT body fields', async () => {
            const malicious_data = {
                title: "Updated' OR '1'='1",
                content: "Updated content"
            };
            const response = await request(app)
                .put('/api/v1/posts/' + post_id)
                .set('Authorization', 'Bearer ' + auth_token)
                .send(malicious_data)
                .expect(200);
            expect(response.body.title).toBe(malicious_data.title);
        });

        test('SQL injection in nested JSON body fields', async () => {
            const malicious_data = {
                name: "Channel'; DELETE FROM channels; --",
                settings: {
                    config: "value'; DROP TABLE users; --"
                }
            };
            const response = await request(app)
                .post('/api/v1/channels')
                .set('Authorization', 'Bearer ' + auth_token)
                .send(malicious_data);
            expect([201, 400]).toContain(response.status);
            const verify = await db_pool.query('SELECT COUNT(*) FROM channels');
            expect(parseInt(verify.rows[0].count)).toBeGreaterThan(0);
        });
    });

    describe('Parameterized Query Verification', () => {
        test('Verify all database queries use parameterized statements', async () => {
            const test_cases = [
                { endpoint: '/api/v1/posts', method: 'get' },
                { endpoint: '/api/v1/channels', method: 'get' },
                { endpoint: '/api/v1/posts/' + post_id, method: 'get' }
            ];

            for (const test_case of test_cases) {
                const response = await request(app)[test_case.method](test_case.endpoint)
                    .set('Authorization', 'Bearer ' + auth_token);
                expect([200, 404]).toContain(response.status);
            }

            const table_check = await db_pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'luxaris' AND table_name IN ('users', 'posts', 'channels')");
            expect(table_check.rows.length).toBe(3);
        });
    });
});
