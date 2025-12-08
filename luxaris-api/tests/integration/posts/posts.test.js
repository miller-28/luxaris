const TestServer = require('../../helpers/test-server');
const TestUsers = require('../../helpers/test-users');
const DbCleaner = require('../../helpers/db-cleaner');
const request = require('supertest');

describe('Posts Integration Tests', () => {
    let test_server;
    let app;
    let db_pool;
    let db_cleaner;
    let test_users;
    let root_token;
    let normal_token;

    beforeAll(async () => {
        // Start test server
        test_server = new TestServer();
        app = await test_server.start();
        db_pool = test_server.db_pool;

        // Initialize database cleaner and test users helper
        db_cleaner = new DbCleaner(db_pool);
        test_users = new TestUsers(app, db_pool);

        // Register users
        ({ token: root_token } = await test_users.create_quick_root_user('root-posts'));
        ({ token: normal_token } = await test_users.create_quick_normal_user('normal-posts'));
    });

    afterAll(async () => {
        await test_server.stop();
    });

    beforeEach(async () => {
        // Clean up test data before each test
        await db_cleaner.clean_table('posts');
    });

    afterEach(async () => {
        // Clean up test data
        await db_cleaner.clean_table('posts');
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
            const fake_id = 999999;
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

            // Verify it's deleted (soft delete - returns 404 or shows as deleted)
            const get_response = await request(app)
                .get(`/api/v1/posts/${test_post_id}`)
                .set('Authorization', `Bearer ${root_token}`);
      
            // Soft delete may return 404 or 200 with deleted status
            expect([200, 404]).toContain(get_response.status);
            if (get_response.status === 200) {
                expect(get_response.body.data.deleted_at).not.toBeNull();
            }
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
