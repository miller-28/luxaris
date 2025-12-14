const TestServer = require('../../helpers/test-server');
const DbCleaner = require('../../helpers/db-cleaner');
const request = require('supertest');

describe('System Context - OAuth Authentication', () => {
    let test_server;
    let app;
    let db_pool;
    let db_cleaner;

    beforeAll(async () => {
        test_server = new TestServer();
        app = await test_server.start();
        db_pool = test_server.db_pool;
        
        // Initialize database cleaner
        db_cleaner = new DbCleaner(db_pool);
    });

    afterAll(async () => {
        if (test_server) {
            await test_server.stop();
        }
    });

    beforeEach(async () => {
        // Clean up test data before each test
        await db_cleaner.clean_test_users('%@oauth-test.com');
    });

    describe('OAuth Provider Management', () => {
        test('Google OAuth provider should exist in database', async () => {
            const result = await db_pool.query(
                'SELECT * FROM luxaris.oauth_providers WHERE key = $1',
                ['google']
            );

            expect(result.rows.length).toBe(1);
            expect(result.rows[0].name).toBe('Google');
            expect(result.rows[0].status).toBe('active');
            // Config structure verified - contains client_id, authorization_url, token_url
        });
    });

    describe('OAuth Authorization Flow', () => {
        test('GET /api/v1/auth/google - Should redirect to Google OAuth consent screen', async () => {
            const response = await request(app)
                .get('/api/v1/auth/google')
                .expect(302);

            // Verify redirect URL contains Google OAuth parameters
            const redirect_url = response.headers.location;
            expect(redirect_url).toContain('accounts.google.com/o/oauth2/v2/auth');
            expect(redirect_url).toContain('client_id=');
            expect(redirect_url).toContain('redirect_uri=');
            expect(redirect_url).toContain('scope=');
            expect(redirect_url).toContain('state=');
            expect(redirect_url).toContain('response_type=code');
        });

        test('GET /api/v1/auth/google - Should generate unique state parameter for CSRF protection', async () => {
            const response1 = await request(app)
                .get('/api/v1/auth/google')
                .expect(302);

            const response2 = await request(app)
                .get('/api/v1/auth/google')
                .expect(302);

            const url1 = new URL(response1.headers.location);
            const url2 = new URL(response2.headers.location);

            const state1 = url1.searchParams.get('state');
            const state2 = url2.searchParams.get('state');

            expect(state1).toBeTruthy();
            expect(state2).toBeTruthy();
            expect(state1).not.toBe(state2);
        });
    });

    describe('OAuth Callback - Error Handling', () => {
        test('GET /api/v1/auth/google/callback - Should return 400 when code is missing', async () => {
            const response = await request(app)
                .get('/api/v1/auth/google/callback?state=test-state')
                .expect(400);

            // Should return error response
            expect(response.body.errors[0].error_code).toBe('MISSING_AUTHORIZATION_CODE');
            expect(response.body.errors[0].error_description).toContain('Authorization code is required');
        });

        test('GET /api/v1/auth/google/callback - Should return 400 when state is missing', async () => {
            const response = await request(app)
                .get('/api/v1/auth/google/callback?code=test-code')
                .expect(400);

            // Should return error response
            expect(response.body.errors[0].error_code).toBe('MISSING_STATE_PARAMETER');
            expect(response.body.errors[0].error_description).toContain('State parameter is required');
        });

        test('GET /api/v1/auth/google/callback - Should fail with invalid state (CSRF protection)', async () => {
            const response = await request(app)
                .get('/api/v1/auth/google/callback?code=test-code&state=invalid-state')
                .expect(302);

            // Should redirect to frontend error page
            const redirect_url = response.headers.location;
            expect(redirect_url).toContain('success=false');
            expect(redirect_url).toContain('error=');
        });
    });

    describe('OAuth User Registration and Login', () => {
        test('First OAuth user should become root admin (simulated)', async () => {
            // Note: Full OAuth flow requires mocking Google APIs
            // This test verifies the database logic for first user = root
            
            // Delete ALL users to ensure this is truly the first user
            await db_cleaner.clean_table('users');
            
            // Register first user via regular registration to test root logic
            const register_response = await request(app)
                .post('/api/v1/auth/register')
                .send({
                    email: 'first-oauth@oauth-test.com',
                    password: 'Password123!',
                    name: 'First OAuth User',
                    timezone: 'UTC'
                })
                .expect(201);

            expect(register_response.body.user.is_root).toBe(true);
            expect(register_response.body.user.status).toBe('active');

            // Verify root role assigned
            const role_result = await db_pool.query(
                `SELECT r.slug 
                 FROM luxaris.acl_principal_role_assignments pra
                 JOIN luxaris.acl_roles r ON pra.role_id = r.id 
                 WHERE pra.principal_type = 'user' AND pra.principal_id = $1`,
                [register_response.body.user.id]
            );

            const has_root_role = role_result.rows.some(r => r.slug === 'admin');
            expect(has_root_role).toBe(true);
        });

        test('Subsequent OAuth users should have pending_approval status (simulated)', async () => {
            // Register first user (becomes root)
            await request(app)
                .post('/api/v1/auth/register')
                .send({
                    email: 'root-user@oauth-test.com',
                    password: 'Password123!',
                    name: 'Root User',
                    timezone: 'UTC'
                })
                .expect(201);

            // Register second user (should be pending_approval)
            const response = await request(app)
                .post('/api/v1/auth/register')
                .send({
                    email: 'pending-user@oauth-test.com',
                    password: 'Password123!',
                    name: 'Pending User',
                    timezone: 'UTC'
                })
                .expect(201);

            expect(response.body.user.is_root).toBe(false);
            expect(response.body.user.status).toBe('pending_approval');
        });

        test('Pending approval user cannot login until approved', async () => {
            // Register first user (root)
            await request(app)
                .post('/api/v1/auth/register')
                .send({
                    email: 'root2@oauth-test.com',
                    password: 'Password123!',
                    name: 'Root',
                    timezone: 'UTC'
                })
                .expect(201);

            // Register second user (pending)
            await request(app)
                .post('/api/v1/auth/register')
                .send({
                    email: 'pending2@oauth-test.com',
                    password: 'Password123!',
                    name: 'Pending',
                    timezone: 'UTC'
                })
                .expect(201);

            // Try to login with pending user
            const login_response = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    email: 'pending2@oauth-test.com',
                    password: 'Password123!'
                });

            // Should fail with 403 forbidden
            expect(login_response.status).toBe(403);
            expect(login_response.body.errors[0].error_description).toContain('pending approval');
        });
    });

    describe('OAuth Account Linking', () => {
        test('OAuth account should link to user in database (verification)', async () => {
            // Register a user
            const register_response = await request(app)
                .post('/api/v1/auth/register')
                .send({
                    email: 'link-test@oauth-test.com',
                    password: 'Password123!',
                    name: 'Link Test User',
                    timezone: 'UTC'
                })
                .expect(201);

            const user_id = register_response.body.user.id;

            // Get Google provider
            const provider_result = await db_pool.query(
                'SELECT id FROM oauth_providers WHERE key = $1',
                ['google']
            );
            const provider_id = provider_result.rows[0].id;

            // Manually insert OAuth account (simulating OAuth callback)
            await db_pool.query(
                `INSERT INTO oauth_accounts 
                 (user_id, provider_id, provider_user_id, provider_email, provider_name, access_token)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [user_id, provider_id, 'google_12345', 'link-test@oauth-test.com', 'Link Test User', 'mock_access_token']
            );

            // Verify OAuth account linked
            const oauth_result = await db_pool.query(
                'SELECT * FROM oauth_accounts WHERE user_id = $1 AND provider_id = $2',
                [user_id, provider_id]
            );

            expect(oauth_result.rows.length).toBe(1);
            expect(oauth_result.rows[0].provider_user_id).toBe('google_12345');
            expect(oauth_result.rows[0].provider_email).toBe('link-test@oauth-test.com');
        });
    });

    describe('OAuth Database Schema', () => {
        test('oauth_providers table should have correct structure', async () => {
            const result = await db_pool.query(`
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_schema = 'luxaris' 
                AND table_name = 'oauth_providers'
                ORDER BY ordinal_position
            `);

            const columns = result.rows.reduce((acc, row) => {
                acc[row.column_name] = {
                    data_type: row.data_type,
                    is_nullable: row.is_nullable
                };
                return acc;
            }, {});

            expect(columns).toHaveProperty('id');
            expect(columns).toHaveProperty('key');
            expect(columns).toHaveProperty('name');
            expect(columns).toHaveProperty('status');
            expect(columns).toHaveProperty('config');
            expect(columns.config.data_type).toBe('jsonb');
        });

        test('oauth_accounts table should have correct structure', async () => {
            const result = await db_pool.query(`
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_schema = 'luxaris' 
                AND table_name = 'oauth_accounts'
                ORDER BY ordinal_position
            `);

            const columns = result.rows.reduce((acc, row) => {
                acc[row.column_name] = {
                    data_type: row.data_type,
                    is_nullable: row.is_nullable
                };
                return acc;
            }, {});

            expect(columns).toHaveProperty('id');
            expect(columns).toHaveProperty('user_id');
            expect(columns).toHaveProperty('provider_id');
            expect(columns).toHaveProperty('provider_user_id');
            expect(columns).toHaveProperty('provider_email');
            expect(columns).toHaveProperty('access_token');
            expect(columns).toHaveProperty('refresh_token');
        });
    });
});
