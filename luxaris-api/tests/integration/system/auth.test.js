const TestServer = require('../../helpers/test-server');
const request = require('supertest');
const { create_database_pool } = require('../../../src/connections/database');

describe('System Context - Authentication', () => {
    let test_server;
    let app;
    let db_pool;

    beforeAll(async () => {
        // Initialize database pool
        db_pool = create_database_pool();

        // Start test server
        test_server = new TestServer();
        app = await test_server.start();
    });

    afterAll(async () => {
        await test_server.stop();
        await db_pool.end();
    });

    beforeEach(async () => {
        // Clean up test data before each test
        await db_pool.query('DELETE FROM audit_logs');
        await db_pool.query('DELETE FROM request_logs');
        await db_pool.query('DELETE FROM system_events');
        await db_pool.query('DELETE FROM system_logs');
        await db_pool.query('DELETE FROM sessions');
        await db_pool.query('DELETE FROM users');
    });

    afterEach(async () => {
        // Clean up test data
        await db_pool.query('DELETE FROM audit_logs');
        await db_pool.query('DELETE FROM request_logs');
        await db_pool.query('DELETE FROM system_events');
        await db_pool.query('DELETE FROM system_logs');
        await db_pool.query('DELETE FROM users');
    });

    describe('POST /api/v1/auth/register', () => {
        test('should register first user as root', async () => {
            const registration_data = {
                email: 'root@example.com',
                password: 'SecurePassword123!',
                name: 'Root User',
                timezone: 'America/New_York'
            };

            const response = await request(app)
                .post('/api/v1/auth/register')
                .send(registration_data)
                .expect(201);

            expect(response.body).toHaveProperty('user');
            expect(response.body).toHaveProperty('access_token');
            expect(response.body).toHaveProperty('refresh_token');
            expect(response.body.user.email).toBe('root@example.com');
            expect(response.body.user.name).toBe('Root User');
            expect(response.body.user.is_root).toBe(true);
            expect(response.body.user.status).toBe('active');
            expect(response.body.user).not.toHaveProperty('password_hash');
        });

        test('should register second user with pending approval', async () => {
            // First create root user
            await request(app)
                .post('/api/v1/auth/register')
                .send({
                    email: 'root@example.com',
                    password: 'SecurePassword123!',
                    name: 'Root User'
                });

            // Register second user
            const registration_data = {
                email: 'user@example.com',
                password: 'SecurePassword123!',
                name: 'Regular User'
            };

            const response = await request(app)
                .post('/api/v1/auth/register')
                .send(registration_data)
                .expect(201);

            expect(response.body.user.email).toBe('user@example.com');
            expect(response.body.user.is_root).toBe(false);
            expect(response.body.user.status).toBe('pending_approval');
        });

        test('should reject registration with duplicate email', async () => {
            const registration_data = {
                email: 'user@example.com',
                password: 'SecurePassword123!',
                name: 'User One'
            };

            // First registration
            await request(app)
                .post('/api/v1/auth/register')
                .send(registration_data)
                .expect(201);

            // Second registration with same email
            const response = await request(app)
                .post('/api/v1/auth/register')
                .send(registration_data)
                .expect(500);

            expect(response.body.errors[0].error_description).toContain('Email already registered');
        });

        test('should reject registration with weak password', async () => {
            const registration_data = {
                email: 'user@example.com',
                password: 'weak',
                name: 'User'
            };

            const response = await request(app)
                .post('/api/v1/auth/register')
                .send(registration_data)
                .expect(400);

            expect(response.body.errors).toBeDefined();
            expect(response.body.errors[0].error_code).toBe('VALIDATION_ERROR');
        });

        test('should reject registration with invalid email', async () => {
            const registration_data = {
                email: 'not-an-email',
                password: 'SecurePassword123!',
                name: 'User'
            };

            const response = await request(app)
                .post('/api/v1/auth/register')
                .send(registration_data)
                .expect(400);

            expect(response.body.errors[0].error_code).toBe('VALIDATION_ERROR');
        });
    });

    describe('POST /api/v1/auth/login', () => {
        beforeEach(async () => {
            // Create a root user for login tests
            await request(app)
                .post('/api/v1/auth/register')
                .send({
                    email: 'root@example.com',
                    password: 'SecurePassword123!',
                    name: 'Root User'
                });
        });

        test('should login successfully with valid credentials', async () => {
            const login_data = {
                email: 'root@example.com',
                password: 'SecurePassword123!'
            };

            const response = await request(app)
                .post('/api/v1/auth/login')
                .send(login_data)
                .expect(200);

            expect(response.body).toHaveProperty('user');
            expect(response.body).toHaveProperty('access_token');
            expect(response.body).toHaveProperty('refresh_token');
            expect(response.body.user.email).toBe('root@example.com');
        });

        test('should reject login with incorrect password', async () => {
            const login_data = {
                email: 'root@example.com',
                password: 'WrongPassword123!'
            };

            const response = await request(app)
                .post('/api/v1/auth/login')
                .send(login_data)
                .expect(500);

            expect(response.body.errors[0].error_description).toContain('Invalid credentials');
        });

        test('should reject login with non-existent email', async () => {
            const login_data = {
                email: 'nonexistent@example.com',
                password: 'SecurePassword123!'
            };

            const response = await request(app)
                .post('/api/v1/auth/login')
                .send(login_data)
                .expect(500);

            expect(response.body.errors[0].error_description).toContain('Invalid credentials');
        });

        test('should reject login for pending approval user', async () => {
            // Register second user (pending approval)
            await request(app)
                .post('/api/v1/auth/register')
                .send({
                    email: 'pending@example.com',
                    password: 'SecurePassword123!',
                    name: 'Pending User'
                });

            const login_data = {
                email: 'pending@example.com',
                password: 'SecurePassword123!'
            };

            const response = await request(app)
                .post('/api/v1/auth/login')
                .send(login_data)
                .expect(500);

            expect(response.body.errors[0].error_description).toContain('pending approval');
        });
    });

    describe('POST /api/v1/auth/refresh', () => {
        let refresh_token;

        beforeEach(async () => {
            // Register and get tokens
            const response = await request(app)
                .post('/api/v1/auth/register')
                .send({
                    email: 'root@example.com',
                    password: 'SecurePassword123!',
                    name: 'Root User'
                });

            refresh_token = response.body.refresh_token;
        });

        test('should refresh access token with valid refresh token', async () => {
            const response = await request(app)
                .post('/api/v1/auth/refresh')
                .send({ refresh_token })
                .expect(200);

            expect(response.body).toHaveProperty('access_token');
            expect(response.body).toHaveProperty('expires_in');
        });

        test('should reject refresh with invalid token', async () => {
            const response = await request(app)
                .post('/api/v1/auth/refresh')
                .send({ refresh_token: 'invalid-token' })
                .expect(500);

            expect(response.body.errors[0].error_description).toContain('Invalid or expired token');
        });
    });
});
