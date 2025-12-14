const TestServer = require('../../helpers/test-server');
const TestUsers = require('../../helpers/test-users');
const DbCleaner = require('../../helpers/db-cleaner');
const request = require('supertest');

describe('Channels Integration Tests', () => {
    let test_server;
    let app;
    let db_pool;
    let db_cleaner;
    let test_users;
    let root_token;
    let root_user_id;
    let normal_token;
    let x_channel_id;
    let linkedin_channel_id;

    beforeAll(async () => {
        // Start test server
        test_server = new TestServer();
        app = await test_server.start();
        db_pool = test_server.db_pool;

        // Initialize database cleaner and test users helper
        db_cleaner = new DbCleaner(db_pool);
        test_users = new TestUsers(app, db_pool);

        // Register users
        ({ user_id: root_user_id, token: root_token } = await test_users.create_quick_root_user('root-channels'));
        ({ token: normal_token } = await test_users.create_quick_normal_user('normal-channels'));

        // Get channel IDs
        const channels_result = await db_pool.query('SELECT id, key FROM channels');
        x_channel_id = channels_result.rows.find(c => c.key === 'x').id;
        linkedin_channel_id = channels_result.rows.find(c => c.key === 'linkedin').id;
    });

    afterAll(async () => {
        await test_server.stop();
    });

    describe('GET /api/v1/channels', () => {
        it('should list all available channels', async () => {
            const response = await request(app)
                .get('/api/v1/channels')
                .set('Authorization', `Bearer ${root_token}`);

            expect(response.status).toBe(200);
            expect(response.body.data).toBeInstanceOf(Array);
            expect(response.body.data.length).toBeGreaterThan(0);

            const x_channel = response.body.data.find(c => c.key === 'x');
            expect(x_channel).toBeDefined();
            expect(x_channel.name).toBe('X (Twitter)');
            expect(x_channel.status).toBe('active');
            expect(x_channel.limits).toBeDefined();
            expect(x_channel.limits.max_text_length).toBe(280);
        });

        it('should require authentication', async () => {
            const response = await request(app)
                .get('/api/v1/channels');

            expect(response.status).toBe(401);
            expect(response.body.errors[0].error_code).toBe('UNAUTHORIZED');
        });
    });

    describe('POST /api/v1/channels/connect', () => {
        it('should create a mock channel connection', async () => {
            const response = await request(app)
                .post('/api/v1/channels/connect')
                .set('Authorization', `Bearer ${root_token}`)
                .send({
                    channel_id: x_channel_id,
                    display_name: '@test_user',
                    mock_connection: true
                });

            expect(response.status).toBe(201);
            expect(response.body.id).toBeDefined();
            expect(response.body.channel_id).toBe(x_channel_id);
            expect(response.body.display_name).toBe('@test_user');
            expect(response.body.status).toBe('connected');
        });

        it('should prevent duplicate connections', async () => {
            // First connection
            await request(app)
                .post('/api/v1/channels/connect')
                .set('Authorization', `Bearer ${root_token}`)
                .send({
                    channel_id: linkedin_channel_id,
                    display_name: '@test_duplicate_1',
                    mock_connection: true
                });

            // Second attempt should fail
            const response = await request(app)
                .post('/api/v1/channels/connect')
                .set('Authorization', `Bearer ${root_token}`)
                .send({
                    channel_id: linkedin_channel_id,
                    display_name: '@test_duplicate_2',
                    mock_connection: true
                });

            expect(response.status).toBe(409);
            expect(response.body.errors[0].error_code).toBe('CONNECTION_ALREADY_EXISTS');

            // Cleanup
            const connections = await db_pool.query('SELECT id FROM channel_connections WHERE owner_principal_id = $1 AND channel_id = $2', [root_user_id, linkedin_channel_id]);
            if (connections.rows.length > 0) {
                const connection_ids = connections.rows.map(r => r.id);
                for (const id of connection_ids) {
                    await db_cleaner.clean_table_where('channel_connections', 'id = $1', [id]);
                }
            }
        });

        it('should validate channel_id is required', async () => {
            const response = await request(app)
                .post('/api/v1/channels/connect')
                .set('Authorization', `Bearer ${root_token}`)
                .send({
                    display_name: '@test_user',
                    mock_connection: true
                });

            expect(response.status).toBe(400);
            expect(response.body.errors[0].error_code).toBe('VALIDATION_ERROR');
        });

        it('should validate channel exists', async () => {
            const fake_channel_id = 999999;
            const response = await request(app)
                .post('/api/v1/channels/connect')
                .set('Authorization', `Bearer ${root_token}`)
                .send({
                    channel_id: fake_channel_id,
                    display_name: '@test_user',
                    mock_connection: true
                });

            expect(response.status).toBe(404);
            expect(response.body.errors[0].error_code).toBe('CHANNEL_NOT_FOUND');
        });
    });

    describe('GET /api/v1/channels/connections', () => {
        it('should list user channel connections', async () => {
            const response = await request(app)
                .get('/api/v1/channels/connections')
                .set('Authorization', `Bearer ${root_token}`);

            expect(response.status).toBe(200);
            expect(response.body.data).toBeInstanceOf(Array);
            expect(response.body.data.length).toBeGreaterThanOrEqual(1);
            expect(response.body.pagination).toBeDefined();
            expect(response.body.pagination.total).toBeGreaterThanOrEqual(1);

            const connection = response.body.data[0];
            expect(connection.channel.key).toBe('x');
            expect(connection.display_name).toBe('@test_user');
            expect(connection.status).toBe('connected');
      
            // Auth state should be sanitized (no tokens)
            expect(connection.auth_state.access_token).toBeUndefined();
            expect(connection.auth_state.refresh_token).toBeUndefined();
            expect(connection.auth_state.account_id).toBeDefined();
        });

        it('should filter by status', async () => {
            const response = await request(app)
                .get('/api/v1/channels/connections?status=connected')
                .set('Authorization', `Bearer ${root_token}`);

            expect(response.status).toBe(200);
            expect(response.body.data.every(c => c.status === 'connected')).toBe(true);
        });

        it('should support pagination', async () => {
            const response = await request(app)
                .get('/api/v1/channels/connections?page=1&limit=10')
                .set('Authorization', `Bearer ${root_token}`);

            expect(response.status).toBe(200);
            expect(response.body.pagination.page).toBe(1);
            expect(response.body.pagination.limit).toBe(10);
        });

        it('should only show user own connections', async () => {
            // Create connection for normal user
            await request(app)
                .post('/api/v1/channels/connect')
                .set('Authorization', `Bearer ${normal_token}`)
                .send({
                    channel_id: linkedin_channel_id,
                    display_name: 'Normal User LinkedIn',
                    mock_connection: true
                });

            // Root user should only see their own connection
            const root_response = await request(app)
                .get('/api/v1/channels/connections')
                .set('Authorization', `Bearer ${root_token}`);

            expect(root_response.body.data.every(c => c.channel.key === 'x')).toBe(true);

            // Normal user should only see their own connection
            const normal_response = await request(app)
                .get('/api/v1/channels/connections')
                .set('Authorization', `Bearer ${normal_token}`);

            expect(normal_response.body.data.every(c => c.channel.key === 'linkedin')).toBe(true);
        });
    });

    describe('DELETE /api/v1/channels/connections/:id', () => {
        let connection_id;

        beforeEach(async () => {
            // Create a fresh connection for root user (use LinkedIn to avoid conflict with X)
            const create_response = await request(app)
                .post('/api/v1/channels/connect')
                .set('Authorization', `Bearer ${root_token}`)
                .send({
                    channel_id: linkedin_channel_id,
                    display_name: '@test_disconnect_linkedin',
                    mock_connection: true
                });
      
            connection_id = create_response.body.id;
        });

        it('should disconnect a channel connection', async () => {
            const response = await request(app)
                .delete(`/api/v1/channels/connections/${connection_id}`)
                .set('Authorization', `Bearer ${root_token}`);

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('disconnected');
            expect(response.body.disconnected_at).toBeDefined();
            expect(response.body.message).toBe('Channel connection successfully disconnected');
        });

        it('should not allow disconnecting others connections', async () => {
            // Get normal user's existing connection
            const list_response = await request(app)
                .get('/api/v1/channels/connections')
                .set('Authorization', `Bearer ${normal_token}`);
            
            let normal_connection_id;
            if (list_response.body.data && list_response.body.data.length > 0) {
                normal_connection_id = list_response.body.data[0].id;
            } else {
                // Create a connection for normal user if none exists
                const create_response = await request(app)
                    .post('/api/v1/channels/connect')
                    .set('Authorization', `Bearer ${normal_token}`)
                    .send({
                        channel_id: x_channel_id,
                        display_name: '@normal_test_user',
                        mock_connection: true
                    });
                normal_connection_id = create_response.body.id;
            }

            // Try to disconnect with root token
            const response = await request(app)
                .delete(`/api/v1/channels/connections/${normal_connection_id}`)
                .set('Authorization', `Bearer ${root_token}`);

            expect(response.status).toBe(403);
            expect(response.body.errors[0].error_code).toBe('FORBIDDEN');
        });

        it('should return 404 for non-existent connection', async () => {
            const fake_id = 999999;
            const response = await request(app)
                .delete(`/api/v1/channels/connections/${fake_id}`)
                .set('Authorization', `Bearer ${root_token}`);

            expect(response.status).toBe(404);
            expect(response.body.errors[0].error_code).toBe('CONNECTION_NOT_FOUND');
        });
    });
});
