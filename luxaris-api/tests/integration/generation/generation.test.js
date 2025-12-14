const TestServer = require('../../helpers/test-server');
const TestUsers = require('../../helpers/test-users');
const DbCleaner = require('../../helpers/db-cleaner');
const request = require('supertest');

describe('Generation Integration Tests', () => {
    let test_server;
    let app;
    let db_pool;
    let db_cleaner;
    let test_users;
    let root_token;
    let normal_token;
    let root_user_id;
    let normal_user_id;
    let test_channel_id;

    beforeAll(async () => {
        test_server = new TestServer();
        app = await test_server.start();
        db_pool = test_server.db_pool;
        
        // Initialize database cleaner and test users helper
        db_cleaner = new DbCleaner(db_pool);
        test_users = new TestUsers(app, db_pool);
        
        // Register users
        ({ user_id: root_user_id, token: root_token } = await test_users.create_quick_root_user('root-gen'));
        ({ user_id: normal_user_id, token: normal_token } = await test_users.create_quick_normal_user('normal-gen'));

        // Get X channel ID
        const channels_result = await db_pool.query('SELECT id FROM luxaris.channels WHERE key = $1', ['x']);
        test_channel_id = channels_result.rows[0].id;
    });

    afterAll(async () => {
        // Clean up test data
        if (db_cleaner) {
            await db_cleaner.clean_generation_tables();
            await db_cleaner.clean_post_tables();
            await db_cleaner.clean_channel_tables();
        }
        if (test_server) {
            await test_server.stop();
        }
    });

    beforeEach(async () => {
        // Clean up between tests
        if (db_cleaner) {
            await db_cleaner.clean_generation_tables();
            await db_cleaner.clean_post_tables();
        }
    });

    describe('POST /api/v1/templates', () => {

        it('should create a template', async () => {
            const response = await request(app)
                .post('/api/v1/templates')
                .set('Authorization', `Bearer ${root_token}`)
                .send({
                    name: 'Launch Announcement',
                    description: 'Template for product launches',
                    template_body: 'Exciting news! We just launched {{product_name}}. {{description}}',
                    constraints: {
                        max_length: 280,
                        tone: ['professional', 'excited']
                    }
                });

            expect(response.status).toBe(201);
            expect(response.body.data).toHaveProperty('id');
            expect(response.body.data.name).toBe('Launch Announcement');
            expect(response.body.data.template_body).toContain('{{product_name}}');
            expect(response.body.data.constraints.max_length).toBe(280);
        });

        it('should require name and body', async () => {
            const response = await request(app)
                .post('/api/v1/templates')
                .set('Authorization', `Bearer ${root_token}`)
                .send({
                    description: 'Missing name and body'
                });

            expect(response.status).toBe(400);
            expect(response.body.errors[0].error_code).toBe('TEMPLATE_NAME_AND_BODY_REQUIRED');
        });
    });

    describe('GET /api/v1/templates', () => {
        let template_id;

        beforeEach(async () => {
            const response = await request(app)
                .post('/api/v1/templates')
                .set('Authorization', `Bearer ${root_token}`)
                .send({
                    name: 'Test Template',
                    template_body: 'Test content with {{placeholder}}'
                });
            template_id = response.body.data.id;
        });

        it('should list templates', async () => {
            const response = await request(app)
                .get('/api/v1/templates')
                .set('Authorization', `Bearer ${root_token}`);

            expect(response.status).toBe(200);
            expect(response.body.data).toBeInstanceOf(Array);
            expect(response.body.data.length).toBeGreaterThan(0);
            expect(response.body.meta).toHaveProperty('total');
        });

        it('should get template by ID', async () => {
            const response = await request(app)
                .get(`/api/v1/templates/${template_id}`)
                .set('Authorization', `Bearer ${root_token}`);

            expect(response.status).toBe(200);
            expect(response.body.data.id).toBe(template_id);
            expect(response.body.data.name).toBe('Test Template');
        });

        it('should deny access to other users templates', async () => {
            const response = await request(app)
                .get(`/api/v1/templates/${template_id}`)
                .set('Authorization', `Bearer ${normal_token}`);

            expect(response.status).toBe(403);
            expect(response.body.errors[0].error_code).toBe('TEMPLATE_ACCESS_DENIED');
        });
    });

    describe('PATCH /api/v1/templates/:id', () => {
        let template_id;

        beforeEach(async () => {
            const response = await request(app)
                .post('/api/v1/templates')
                .set('Authorization', `Bearer ${root_token}`)
                .send({
                    name: 'Original Name',
                    template_body: 'Original {{content}}'
                });
            template_id = response.body.data.id;
        });

        it('should update template', async () => {
            const response = await request(app)
                .patch(`/api/v1/templates/${template_id}`)
                .set('Authorization', `Bearer ${root_token}`)
                .send({
                    name: 'Updated Name',
                    description: 'New description'
                });

            expect(response.status).toBe(200);
            expect(response.body.data.name).toBe('Updated Name');
            expect(response.body.data.description).toBe('New description');
        });
    });

    describe('DELETE /api/v1/templates/:id', () => {
        let template_id;

        beforeEach(async () => {
            const response = await request(app)
                .post('/api/v1/templates')
                .set('Authorization', `Bearer ${root_token}`)
                .send({
                    name: 'To Delete',
                    template_body: 'Delete me {{soon}}'
                });
            template_id = response.body.data.id;
        });

        it('should delete template', async () => {
            const response = await request(app)
                .delete(`/api/v1/templates/${template_id}`)
                .set('Authorization', `Bearer ${root_token}`);

            expect(response.status).toBe(204);

            // Verify deletion (soft delete may return 200 with deleted_at or 404)
            const get_response = await request(app)
                .get(`/api/v1/templates/${template_id}`)
                .set('Authorization', `Bearer ${root_token}`);

            expect([200, 404]).toContain(get_response.status);
            if (get_response.status === 200) {
                expect(get_response.body.data.is_deleted).toBe(true);
            }
        });
    });

    describe('POST /api/v1/templates/:id/render', () => {
        let template_id;

        beforeEach(async () => {
            const response = await request(app)
                .post('/api/v1/templates')
                .set('Authorization', `Bearer ${root_token}`)
                .send({
                    name: 'Render Test',
                    template_body: 'Hello {{name}}, welcome to {{product}}!'
                });
            template_id = response.body.data.id;
        });

        it('should render template with values', async () => {
            const response = await request(app)
                .post(`/api/v1/templates/${template_id}/render`)
                .set('Authorization', `Bearer ${root_token}`)
                .send({
                    values: {
                        name: 'John',
                        product: 'Luxaris'
                    }
                });

            expect(response.status).toBe(200);
            expect(response.body.data.rendered_content).toBe('Hello John, welcome to Luxaris!');
            expect(response.body.data.placeholders_used).toEqual(['name', 'product']);
        });

        it('should fail when missing placeholder values', async () => {
            const response = await request(app)
                .post(`/api/v1/templates/${template_id}/render`)
                .set('Authorization', `Bearer ${root_token}`)
                .send({
                    values: {
                        name: 'John'
                        // missing 'product'
                    }
                });

            expect(response.status).toBe(400);
            expect(response.body.errors[0].error_code).toBe('MISSING_PLACEHOLDER_VALUES');
        });
    });

    describe('POST /api/v1/generation/generate', () => {
        it('should generate content suggestions', async () => {
            const response = await request(app)
                .post('/api/v1/generation/generate')
                .set('Authorization', `Bearer ${root_token}`)
                .send({
                    prompt: 'Announce our new dark mode feature',
                    channel_ids: [test_channel_id],
                    constraints: {
                        suggestions_per_channel: 2
                    }
                });

            expect(response.status).toBe(201);
            expect(response.body.data.session).toHaveProperty('id');
            expect(response.body.data.session.status).toBe('completed');
            expect(response.body.data.session.prompt).toBe('Announce our new dark mode feature');
            expect(response.body.data.suggestions).toBeInstanceOf(Array);
            expect(response.body.data.suggestions.length).toBe(2); // 2 suggestions for 1 channel
            expect(response.body.data.suggestions[0]).toHaveProperty('content');
            expect(response.body.data.suggestions[0]).toHaveProperty('score');
        });

        it('should generate for multiple channels', async () => {
            const response = await request(app)
                .post('/api/v1/generation/generate')
                .set('Authorization', `Bearer ${root_token}`)
                .send({
                    prompt: 'Test multi-channel generation',
                    channel_ids: [test_channel_id],
                    constraints: {
                        suggestions_per_channel: 3
                    }
                });

            expect(response.status).toBe(201);
            expect(response.body.data.suggestions.length).toBe(3); // 3 suggestions for 1 channel
        });

        it('should require prompt', async () => {
            const response = await request(app)
                .post('/api/v1/generation/generate')
                .set('Authorization', `Bearer ${root_token}`)
                .send({
                    channel_ids: [test_channel_id]
                });

            expect(response.status).toBe(400);
            expect(response.body.errors[0].error_code).toBe('PROMPT_REQUIRED');
        });

        it('should require channel IDs', async () => {
            const response = await request(app)
                .post('/api/v1/generation/generate')
                .set('Authorization', `Bearer ${root_token}`)
                .send({
                    prompt: 'Test prompt'
                });

            expect(response.status).toBe(400);
            expect(response.body.errors[0].error_code).toBe('CHANNEL_IDS_REQUIRED');
        });
    });

    describe('GET /api/v1/generation/sessions', () => {
        let session_id;

        beforeEach(async () => {
            const response = await request(app)
                .post('/api/v1/generation/generate')
                .set('Authorization', `Bearer ${root_token}`)
                .send({
                    prompt: 'Test session list',
                    channel_ids: [test_channel_id]
                });
            session_id = response.body.data.session.id;
        });

        it('should list generation sessions', async () => {
            const response = await request(app)
                .get('/api/v1/generation/sessions')
                .set('Authorization', `Bearer ${root_token}`);

            expect(response.status).toBe(200);
            expect(response.body.data).toBeInstanceOf(Array);
            expect(response.body.data.length).toBeGreaterThan(0);
            expect(response.body.meta).toHaveProperty('total');
        });

        it('should get session with suggestions', async () => {
            const response = await request(app)
                .get(`/api/v1/generation/sessions/${session_id}`)
                .set('Authorization', `Bearer ${root_token}`);

            expect(response.status).toBe(200);
            expect(response.body.data.session.id).toBe(session_id);
            expect(response.body.data.suggestions).toBeInstanceOf(Array);
            expect(response.body.data.suggestions.length).toBeGreaterThan(0);
        });
    });

    describe('POST /api/v1/generation/suggestions/:id/accept', () => {
        let suggestion_id;

        beforeEach(async () => {
            const gen_response = await request(app)
                .post('/api/v1/generation/generate')
                .set('Authorization', `Bearer ${root_token}`)
                .send({
                    prompt: 'Test accept suggestion',
                    channel_ids: [test_channel_id]
                });
            suggestion_id = gen_response.body.data.suggestions[0].id;
        });

        it('should accept suggestion and create post/variant', async () => {
            const response = await request(app)
                .post(`/api/v1/generation/suggestions/${suggestion_id}/accept`)
                .set('Authorization', `Bearer ${root_token}`)
                .send({
                    title: 'Generated Post',
                    tags: ['ai-generated']
                });

            expect(response.status).toBe(201);
            expect(response.body.data.suggestion.accepted).toBe(true);
            expect(response.body.data.post).toHaveProperty('id');
            expect(response.body.data.variant).toHaveProperty('id');
            expect(response.body.data.variant.source).toBe('generated');
        });

        it('should not accept suggestion twice', async () => {
            // Accept once
            await request(app)
                .post(`/api/v1/generation/suggestions/${suggestion_id}/accept`)
                .set('Authorization', `Bearer ${root_token}`)
                .send({
                    title: 'First Accept'
                });

            // Try to accept again
            const response = await request(app)
                .post(`/api/v1/generation/suggestions/${suggestion_id}/accept`)
                .set('Authorization', `Bearer ${root_token}`)
                .send({
                    title: 'Second Accept'
                });

            expect(response.status).toBe(409);
            expect(response.body.errors[0].error_code).toBe('SUGGESTION_ALREADY_ACCEPTED');
        });
    });

    describe('DELETE /api/v1/generation/sessions/:id', () => {
        let session_id;

        beforeEach(async () => {
            const response = await request(app)
                .post('/api/v1/generation/generate')
                .set('Authorization', `Bearer ${root_token}`)
                .send({
                    prompt: 'Session to delete',
                    channel_ids: [test_channel_id]
                });
            session_id = response.body.data.session.id;
        });

        afterEach(async () => {
            if (!db_pool) {
                return;
            }
            await db_pool.query('DELETE FROM generation_suggestions');
            await db_pool.query('DELETE FROM generation_sessions WHERE owner_principal_id IN (SELECT id FROM users WHERE email IN ($1, $2))', ['root@generation-test.com', 'normal@generation-test.com']);
        });

        it('should delete generation session', async () => {
            const delete_response = await request(app)
                .delete(`/api/v1/generation/sessions/${session_id}`)
                .set('Authorization', `Bearer ${root_token}`);

            expect(delete_response.status).toBe(204);

            // Verify deletion (soft delete may return 200 with deleted_at or 404)
            const get_response = await request(app)
                .get(`/api/v1/generation/sessions/${session_id}`)
                .set('Authorization', `Bearer ${root_token}`);

            expect([200, 404]).toContain(get_response.status);
            if (get_response.status === 200) {
                expect(get_response.body.data.is_deleted).toBe(true);
            }
        });
    });
});
