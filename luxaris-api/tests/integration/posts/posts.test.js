const request = require('supertest');
const { create_database_pool } = require('../../../src/connections/database');
const Server = require('../../../src/core/http/server');
const { get_app_config } = require('../../../src/config/app');
const { get_auth_config } = require('../../../src/config/auth');
const { get_logger } = require('../../../src/core/logging/system_logger');
const EventRegistry = require('../../../src/core/events/event-registry');
const UserRepository = require('../../../src/contexts/system/infrastructure/repositories/user-repository');
const AuthService = require('../../../src/contexts/system/application/services/auth-service');
const LoginUserUseCase = require('../../../src/contexts/system/application/use_cases/login-user');
const { initialize_channels_domain } = require('../../../src/contexts/channels');
const { initialize_posts_domain } = require('../../../src/contexts/posts');

describe('Posts Integration Tests', () => {
    let db_pool;
    let server;
    let app;
    let auth_service;
    let root_token;
    let normal_token;
    let posts_domain;

    beforeAll(async () => {
        // Initialize database
        db_pool = create_database_pool();

        // Initialize services
        const app_config = get_app_config();
        const auth_config = get_auth_config();
        const system_logger = get_logger(db_pool);
        const event_registry = new EventRegistry(db_pool, system_logger);
        const user_repository = new UserRepository(db_pool);

        auth_service = new AuthService(user_repository, auth_config, system_logger, event_registry);
        const login_use_case = new LoginUserUseCase(auth_service);

        // Initialize domains
        const channels_domain = initialize_channels_domain({
            db_pool,
            system_logger,
            acl_service: auth_service.acl_service,
            event_registry
        });

        posts_domain = initialize_posts_domain({
            db_pool,
            system_logger,
            event_registry,
            channel_service: channels_domain.channel_service
        });

        // Create authentication middleware
        const auth_middleware = (req, res, next) => {
            const auth_header = req.headers.authorization;
            if (!auth_header || !auth_header.startsWith('Bearer ')) {
                return res.status(401).json({
                    errors: [{ error_code: 'UNAUTHORIZED', error_description: 'Missing or invalid authorization header', error_severity: 'error' }]
                });
            }
            const token = auth_header.substring(7);
            try {
                const payload = auth_service.verify_token(token);
                // Transform JWT payload to principal format
                req.principal = {
                    id: payload.sub,
                    type: payload.typ,
                    email: payload.email,
                    name: payload.name,
                    is_root: payload.is_root,
                    roles: payload.roles || []
                };
                next();
            } catch (error) {
                return res.status(401).json({
                    errors: [{ error_code: 'INVALID_TOKEN', error_description: 'Token is invalid or expired', error_severity: 'error' }]
                });
            }
        };

        // Create server
        server = new Server(app_config);
        const post_routes = posts_domain.create_post_routes({
            post_service: posts_domain.post_service,
            auth_middleware,
            error_handler: (err, req, res, next) => {
                console.error('Test error:', err);
                res.status(500).json({ errors: [{ error_code: 'INTERNAL_ERROR', error_description: err.message, error_severity: 'error' }] });
            }
        });
        server.register_routes('/api/v1/posts', post_routes);
        app = server.get_app();

        // Register root user and get token
        const root_user = await auth_service.register_user({
            email: 'root@test.com',
            password: 'SecurePassword123!',
            name: 'Root User',
            is_root: true
        });
        const root_login = await login_use_case.execute({ 
            email: 'root@test.com', 
            password: 'SecurePassword123!'
        });
        root_token = root_login.access_token;

        // Register normal user, approve, and get token
        const normal_user = await auth_service.register_user({
            email: 'normal@test.com',
            password: 'SecurePassword123!',
            name: 'Normal User'
        });
        await db_pool.query("UPDATE users SET status = 'active' WHERE id = $1", [normal_user.id]);
        const normal_login = await login_use_case.execute({ 
            email: 'normal@test.com', 
            password: 'SecurePassword123!'
        });
        normal_token = normal_login.access_token;
    });

    afterAll(async () => {
        // Clean up test data
        await db_pool.query('DELETE FROM posts');
        await db_pool.query("DELETE FROM users WHERE email IN ('root@test.com', 'normal@test.com')");
        await db_pool.end();
    });

    describe('POST /api/v1/posts', () => {
        it('should create a new post', async () => {
            const response = await request(app)
                .post('/api/v1/posts')
                .set('Authorization', `Bearer ${root_token}`)
                .send({
                    title: 'My First Post',
                    base_content: 'This is the base content for my post',
                    tags: ['tech', 'product-launch']
                });

            expect(response.status).toBe(201);
            expect(response.body.data).toHaveProperty('id');
            expect(response.body.data.title).toBe('My First Post');
            expect(response.body.data.base_content).toBe('This is the base content for my post');
            expect(response.body.data.tags).toEqual(['tech', 'product-launch']);
            expect(response.body.data.status).toBe('draft');
        });

        it('should require base_content', async () => {
            const response = await request(app)
                .post('/api/v1/posts')
                .set('Authorization', `Bearer ${root_token}`)
                .send({
                    title: 'No Content Post'
                });

            expect(response.status).toBe(400);
            expect(response.body.errors[0].error_code).toBe('BASE_CONTENT_REQUIRED');
        });

        it('should require authentication', async () => {
            const response = await request(app)
                .post('/api/v1/posts')
                .send({
                    base_content: 'Content without auth'
                });

            expect(response.status).toBe(401);
        });
    });

    describe('GET /api/v1/posts', () => {
        let test_post_id;

        beforeEach(async () => {
            // Create a test post
            const response = await request(app)
                .post('/api/v1/posts')
                .set('Authorization', `Bearer ${root_token}`)
                .send({
                    title: 'List Test Post',
                    base_content: 'Content for listing test',
                    tags: ['list-test']
                });
            test_post_id = response.body.data.id;
        });

        it('should list user posts', async () => {
            const response = await request(app)
                .get('/api/v1/posts')
                .set('Authorization', `Bearer ${root_token}`);

            expect(response.status).toBe(200);
            expect(response.body.data).toBeInstanceOf(Array);
            expect(response.body.data.length).toBeGreaterThan(0);
            expect(response.body.pagination).toHaveProperty('total');
            expect(response.body.pagination).toHaveProperty('limit');
            expect(response.body.pagination).toHaveProperty('offset');
        });

        it('should filter by status', async () => {
            const response = await request(app)
                .get('/api/v1/posts?status=draft')
                .set('Authorization', `Bearer ${root_token}`);

            expect(response.status).toBe(200);
            response.body.data.forEach(post => {
                expect(post.status).toBe('draft');
            });
        });

        it('should filter by tags', async () => {
            const response = await request(app)
                .get('/api/v1/posts?tags=list-test')
                .set('Authorization', `Bearer ${root_token}`);

            expect(response.status).toBe(200);
            const found_post = response.body.data.find(p => p.id === test_post_id);
            expect(found_post).toBeDefined();
            expect(found_post.tags).toContain('list-test');
        });

        it('should support pagination', async () => {
            const response = await request(app)
                .get('/api/v1/posts?limit=1&offset=0')
                .set('Authorization', `Bearer ${root_token}`);

            expect(response.status).toBe(200);
            expect(response.body.data.length).toBeLessThanOrEqual(1);
            expect(response.body.pagination.limit).toBe(1);
            expect(response.body.pagination.offset).toBe(0);
        });
    });

    describe('GET /api/v1/posts/:id', () => {
        let test_post_id;

        beforeEach(async () => {
            const response = await request(app)
                .post('/api/v1/posts')
                .set('Authorization', `Bearer ${root_token}`)
                .send({
                    title: 'Get Single Post',
                    base_content: 'Content for get test'
                });
            test_post_id = response.body.data.id;
        });

        it('should get a post by ID', async () => {
            const response = await request(app)
                .get(`/api/v1/posts/${test_post_id}`)
                .set('Authorization', `Bearer ${root_token}`);

            expect(response.status).toBe(200);
            expect(response.body.data.id).toBe(test_post_id);
            expect(response.body.data.title).toBe('Get Single Post');
            expect(response.body.data.base_content).toBe('Content for get test');
        });

        it('should return 404 for non-existent post', async () => {
            const fake_id = '00000000-0000-0000-0000-000000000000';
            const response = await request(app)
                .get(`/api/v1/posts/${fake_id}`)
                .set('Authorization', `Bearer ${root_token}`);

            expect(response.status).toBe(404);
            expect(response.body.errors[0].error_code).toBe('POST_NOT_FOUND');
        });

        it('should deny access to other users posts', async () => {
            const response = await request(app)
                .get(`/api/v1/posts/${test_post_id}`)
                .set('Authorization', `Bearer ${normal_token}`);

            expect(response.status).toBe(403);
            expect(response.body.errors[0].error_code).toBe('POST_ACCESS_DENIED');
        });
    });

    describe('PATCH /api/v1/posts/:id', () => {
        let test_post_id;

        beforeEach(async () => {
            const response = await request(app)
                .post('/api/v1/posts')
                .set('Authorization', `Bearer ${root_token}`)
                .send({
                    title: 'Update Test Post',
                    base_content: 'Original content',
                    tags: ['original']
                });
            test_post_id = response.body.data.id;
        });

        it('should update a post', async () => {
            const response = await request(app)
                .patch(`/api/v1/posts/${test_post_id}`)
                .set('Authorization', `Bearer ${root_token}`)
                .send({
                    title: 'Updated Title',
                    base_content: 'Updated content',
                    tags: ['updated', 'new-tag']
                });

            expect(response.status).toBe(200);
            expect(response.body.data.title).toBe('Updated Title');
            expect(response.body.data.base_content).toBe('Updated content');
            expect(response.body.data.tags).toEqual(['updated', 'new-tag']);
        });

        it('should deny access to other users posts', async () => {
            const response = await request(app)
                .patch(`/api/v1/posts/${test_post_id}`)
                .set('Authorization', `Bearer ${normal_token}`)
                .send({
                    title: 'Hacked Title'
                });

            expect(response.status).toBe(403);
            expect(response.body.errors[0].error_code).toBe('POST_ACCESS_DENIED');
        });
    });

    describe('DELETE /api/v1/posts/:id', () => {
        let test_post_id;

        beforeEach(async () => {
            const response = await request(app)
                .post('/api/v1/posts')
                .set('Authorization', `Bearer ${root_token}`)
                .send({
                    title: 'Delete Test Post',
                    base_content: 'Content to delete'
                });
            test_post_id = response.body.data.id;
        });

        it('should delete a post', async () => {
            const response = await request(app)
                .delete(`/api/v1/posts/${test_post_id}`)
                .set('Authorization', `Bearer ${root_token}`);

            expect(response.status).toBe(204);

            // Verify it's deleted
            const get_response = await request(app)
                .get(`/api/v1/posts/${test_post_id}`)
                .set('Authorization', `Bearer ${root_token}`);
      
            expect(get_response.status).toBe(404);
        });

        it('should deny deletion of other users posts', async () => {
            const response = await request(app)
                .delete(`/api/v1/posts/${test_post_id}`)
                .set('Authorization', `Bearer ${normal_token}`);

            expect(response.status).toBe(403);
            expect(response.body.errors[0].error_code).toBe('POST_ACCESS_DENIED');
        });
    });
});
