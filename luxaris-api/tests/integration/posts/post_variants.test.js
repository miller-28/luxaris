const TestServer = require('../../helpers/test-server');
const request = require('supertest');

describe('Post Variants Integration Tests', () => {
    let test_server;
    let app;
    let db_pool;
    let root_token;
    let normal_token;
    let x_channel_id;
    let linkedin_channel_id;

    beforeAll(async () => {
        // Start test server
        test_server = new TestServer();
        app = await test_server.start();
        db_pool = test_server.db_pool;

        // Register root user and get token
        const root_response = await request(app)
            .post('/api/v1/auth/register')
            .send({
                email: `root-variants-${Date.now()}@test.com`,
                password: 'SecurePassword123!',
                name: 'Root User',
                timezone: 'America/New_York'
            });
        root_token = root_response.body.access_token;

        // Register normal user and get token
        const normal_response = await request(app)
            .post('/api/v1/auth/register')
            .send({
                email: `normal-variants-${Date.now()}@test.com`,
                password: 'SecurePassword123!',
                name: 'Normal User',
                timezone: 'America/New_York'
            });
        normal_token = normal_response.body.access_token;

        // Get channel IDs
        const channels_result = await db_pool.query('SELECT id, key FROM luxaris.channels');
        const x_channel = channels_result.rows.find(c => c.key === 'x');
        const linkedin_channel = channels_result.rows.find(c => c.key === 'linkedin');
        
        if (!x_channel || !linkedin_channel) {
            throw new Error(`Channels not found. Available: ${JSON.stringify(channels_result.rows)}`);
        }
        
        x_channel_id = x_channel.id;
        linkedin_channel_id = linkedin_channel.id;
    });

    afterAll(async () => {
        await test_server.stop();
    });

    beforeEach(async () => {
        // Clean up test data before each test
        await db_pool.query('DELETE FROM post_variants');
        await db_pool.query('DELETE FROM posts');
    });

    afterEach(async () => {
        // Clean up test data
        await db_pool.query('DELETE FROM post_variants');
        await db_pool.query('DELETE FROM posts');
    });

    describe('POST /api/v1/posts/:post_id/variants', () => {
        let test_post_id;

        beforeEach(async () => {
            // Create a test post
            const response = await request(app)
                .post('/api/v1/posts')
                .set('Authorization', `Bearer ${root_token}`)
                .send({
                    title: 'Post for Variants',
                    base_content: 'Base content for creating variants'
                });
            test_post_id = response.body.data.id;
        });

        afterEach(async () => {
            // Clean up variants and posts after each test
            await db_pool.query('DELETE FROM post_variants WHERE post_id = $1', [test_post_id]);
            await db_pool.query('DELETE FROM posts WHERE id = $1', [test_post_id]);
        });

        it('should create a variant for a post', async () => {
            const response = await request(app)
                .post(`/api/v1/posts/${test_post_id}/variants`)
                .set('Authorization', `Bearer ${root_token}`)
                .send({
                    channel_id: x_channel_id,
                    content: 'X-optimized content with hashtags #tech #launch',
                    media: {
                        images: [{ url: 'https://example.com/image.jpg', alt_text: 'Product' }]
                    },
                    tone: 'professional'
                });

            expect(response.status).toBe(201);
            expect(response.body.data).toHaveProperty('id');
            expect(response.body.data.post_id).toBe(test_post_id);
            expect(response.body.data.channel_id).toBe(x_channel_id);
            expect(response.body.data.content).toBe('X-optimized content with hashtags #tech #launch');
            expect(response.body.data.status).toBe('draft');
            expect(response.body.data.source).toBe('manual');
        });

        it('should require content', async () => {
            const response = await request(app)
                .post(`/api/v1/posts/${test_post_id}/variants`)
                .set('Authorization', `Bearer ${root_token}`)
                .send({
                    channel_id: x_channel_id
                });

            expect(response.status).toBe(400);
            expect(response.body.errors[0].error_code).toBe('VARIANT_CONTENT_REQUIRED');
        });

        it('should validate channel exists', async () => {
            const fake_channel_id = 999999;
            const response = await request(app)
                .post(`/api/v1/posts/${test_post_id}/variants`)
                .set('Authorization', `Bearer ${root_token}`)
                .send({
                    channel_id: fake_channel_id,
                    content: 'Content for non-existent channel'
                });

            expect(response.status).toBe(400);
            expect(response.body.errors[0].error_code).toBe('CHANNEL_NOT_FOUND');
        });

        it('should deny creating variant for other users post', async () => {
            const response = await request(app)
                .post(`/api/v1/posts/${test_post_id}/variants`)
                .set('Authorization', `Bearer ${normal_token}`)
                .send({
                    channel_id: x_channel_id,
                    content: 'Unauthorized variant'
                });

            expect(response.status).toBe(403);
            expect(response.body.errors[0].error_code).toBe('POST_ACCESS_DENIED');
        });
    });

    describe('GET /api/v1/posts/:post_id/variants', () => {
        let test_post_id;
        let variant_ids = [];

        beforeEach(async () => {
            // Create a test post
            const post_response = await request(app)
                .post('/api/v1/posts')
                .set('Authorization', `Bearer ${root_token}`)
                .send({
                    title: 'Post with Multiple Variants',
                    base_content: 'Base content for listing variants'
                });
            test_post_id = post_response.body.data.id;

            // Create multiple variants
            const x_response = await request(app)
                .post(`/api/v1/posts/${test_post_id}/variants`)
                .set('Authorization', `Bearer ${root_token}`)
                .send({
                    channel_id: x_channel_id,
                    content: 'X variant content'
                });
            variant_ids.push(x_response.body.data.id);

            const linkedin_response = await request(app)
                .post(`/api/v1/posts/${test_post_id}/variants`)
                .set('Authorization', `Bearer ${root_token}`)
                .send({
                    channel_id: linkedin_channel_id,
                    content: 'LinkedIn variant content'
                });
            variant_ids.push(linkedin_response.body.data.id);
        });

        afterEach(async () => {
            await db_pool.query('DELETE FROM post_variants WHERE post_id = $1', [test_post_id]);
            await db_pool.query('DELETE FROM posts WHERE id = $1', [test_post_id]);
            variant_ids = [];
        });

        it('should list all variants for a post', async () => {
            const response = await request(app)
                .get(`/api/v1/posts/${test_post_id}/variants`)
                .set('Authorization', `Bearer ${root_token}`);

            expect(response.status).toBe(200);
            expect(response.body.data).toBeInstanceOf(Array);
            expect(response.body.data.length).toBe(2);
            expect(response.body.data[0]).toHaveProperty('id');
            expect(response.body.data[0]).toHaveProperty('post_id', test_post_id);
            expect(response.body.data[0]).toHaveProperty('channel_id');
            expect(response.body.data[0]).toHaveProperty('content');
        });

        it('should deny access to other users post variants', async () => {
            const response = await request(app)
                .get(`/api/v1/posts/${test_post_id}/variants`)
                .set('Authorization', `Bearer ${normal_token}`);

            expect(response.status).toBe(403);
            expect(response.body.errors[0].error_code).toBe('POST_ACCESS_DENIED');
        });
    });

    describe('GET /api/v1/variants/:id', () => {
        let test_post_id;
        let test_variant_id;

        beforeEach(async () => {
            const post_response = await request(app)
                .post('/api/v1/posts')
                .set('Authorization', `Bearer ${root_token}`)
                .send({
                    title: 'Post for Get Variant',
                    base_content: 'Base content'
                });
            test_post_id = post_response.body.data.id;

            const variant_response = await request(app)
                .post(`/api/v1/posts/${test_post_id}/variants`)
                .set('Authorization', `Bearer ${root_token}`)
                .send({
                    channel_id: x_channel_id,
                    content: 'X variant to retrieve'
                });
            test_variant_id = variant_response.body.data.id;
        });

        afterEach(async () => {
            await db_pool.query('DELETE FROM post_variants WHERE post_id = $1', [test_post_id]);
            await db_pool.query('DELETE FROM posts WHERE id = $1', [test_post_id]);
        });

        it('should get a variant by ID', async () => {
            const response = await request(app)
                .get(`/api/v1/variants/${test_variant_id}`)
                .set('Authorization', `Bearer ${root_token}`);

            expect(response.status).toBe(200);
            expect(response.body.data.id).toBe(test_variant_id);
            expect(response.body.data.post_id).toBe(test_post_id);
            expect(response.body.data.content).toBe('X variant to retrieve');
        });

        it('should return 404 for non-existent variant', async () => {
            const fake_id = 999999;
            const response = await request(app)
                .get(`/api/v1/variants/${fake_id}`)
                .set('Authorization', `Bearer ${root_token}`);

            expect(response.status).toBe(404);
            expect(response.body.errors[0].error_code).toBe('VARIANT_NOT_FOUND');
        });

        it('should deny access to other users variants', async () => {
            const response = await request(app)
                .get(`/api/v1/variants/${test_variant_id}`)
                .set('Authorization', `Bearer ${normal_token}`);

            expect(response.status).toBe(403);
            expect(response.body.errors[0].error_code).toBe('VARIANT_ACCESS_DENIED');
        });
    });

    describe('PATCH /api/v1/variants/:id', () => {
        let test_post_id;
        let test_variant_id;

        beforeEach(async () => {
            const post_response = await request(app)
                .post('/api/v1/posts')
                .set('Authorization', `Bearer ${root_token}`)
                .send({
                    title: 'Post for Update Variant',
                    base_content: 'Base content'
                });
            test_post_id = post_response.body.data.id;

            const variant_response = await request(app)
                .post(`/api/v1/posts/${test_post_id}/variants`)
                .set('Authorization', `Bearer ${root_token}`)
                .send({
                    channel_id: x_channel_id,
                    content: 'Original variant content'
                });
            test_variant_id = variant_response.body.data.id;
        });

        afterEach(async () => {
            await db_pool.query('DELETE FROM post_variants WHERE post_id = $1', [test_post_id]);
            await db_pool.query('DELETE FROM posts WHERE id = $1', [test_post_id]);
        });

        it('should update a variant', async () => {
            const response = await request(app)
                .patch(`/api/v1/variants/${test_variant_id}`)
                .set('Authorization', `Bearer ${root_token}`)
                .send({
                    content: 'Updated variant content',
                    tone: 'casual',
                    media: {
                        images: [{ url: 'https://example.com/new.jpg' }]
                    }
                });

            expect(response.status).toBe(200);
            expect(response.body.data.content).toBe('Updated variant content');
            expect(response.body.data.tone).toBe('casual');
            expect(response.body.data.media.images[0].url).toBe('https://example.com/new.jpg');
        });

        it('should not allow updating published variants', async () => {
            // Mark as published
            await db_pool.query(
                "UPDATE post_variants SET status = 'published', published_at = CURRENT_TIMESTAMP WHERE id = $1",
                [test_variant_id]
            );

            const response = await request(app)
                .patch(`/api/v1/variants/${test_variant_id}`)
                .set('Authorization', `Bearer ${root_token}`)
                .send({
                    content: 'Trying to update published variant'
                });

            expect(response.status).toBe(400);
            expect(response.body.errors[0].error_code).toBe('VARIANT_ALREADY_PUBLISHED');
        });

        it('should deny updating other users variants', async () => {
            const response = await request(app)
                .patch(`/api/v1/variants/${test_variant_id}`)
                .set('Authorization', `Bearer ${normal_token}`)
                .send({
                    content: 'Unauthorized update'
                });

            expect(response.status).toBe(403);
            expect(response.body.errors[0].error_code).toBe('VARIANT_ACCESS_DENIED');
        });
    });

    describe('POST /api/v1/variants/:id/mark-ready', () => {
        let test_post_id;
        let test_variant_id;

        beforeEach(async () => {
            const post_response = await request(app)
                .post('/api/v1/posts')
                .set('Authorization', `Bearer ${root_token}`)
                .send({
                    title: 'Post for Mark Ready',
                    base_content: 'Base content'
                });
            test_post_id = post_response.body.data.id;

            const variant_response = await request(app)
                .post(`/api/v1/posts/${test_post_id}/variants`)
                .set('Authorization', `Bearer ${root_token}`)
                .send({
                    channel_id: x_channel_id,
                    content: 'Variant to mark as ready'
                });
            test_variant_id = variant_response.body.data.id;
        });

        afterEach(async () => {
            await db_pool.query('DELETE FROM post_variants WHERE post_id = $1', [test_post_id]);
            await db_pool.query('DELETE FROM posts WHERE id = $1', [test_post_id]);
        });

        it('should mark a draft variant as ready', async () => {
            const response = await request(app)
                .post(`/api/v1/variants/${test_variant_id}/mark-ready`)
                .set('Authorization', `Bearer ${root_token}`)
                .send();

            expect(response.status).toBe(200);
            expect(response.body.data.id).toBe(test_variant_id);
            expect(response.body.data.status).toBe('ready');
        });

        it('should not allow marking non-draft variants as ready', async () => {
            // First mark as ready
            await request(app)
                .post(`/api/v1/variants/${test_variant_id}/mark-ready`)
                .set('Authorization', `Bearer ${root_token}`)
                .send();

            // Try to mark again
            const response = await request(app)
                .post(`/api/v1/variants/${test_variant_id}/mark-ready`)
                .set('Authorization', `Bearer ${root_token}`)
                .send();

            expect(response.status).toBe(400);
            expect(response.body.errors[0].error_code).toBe('VARIANT_NOT_DRAFT');
        });

        it('should deny marking other users variants as ready', async () => {
            const response = await request(app)
                .post(`/api/v1/variants/${test_variant_id}/mark-ready`)
                .set('Authorization', `Bearer ${normal_token}`)
                .send();

            expect(response.status).toBe(403);
            expect(response.body.errors[0].error_code).toBe('VARIANT_ACCESS_DENIED');
        });
    });

    describe('DELETE /api/v1/variants/:id', () => {
        let test_post_id;
        let test_variant_id;

        beforeEach(async () => {
            const post_response = await request(app)
                .post('/api/v1/posts')
                .set('Authorization', `Bearer ${root_token}`)
                .send({
                    title: 'Post for Delete Variant',
                    base_content: 'Base content'
                });
            test_post_id = post_response.body.data.id;

            const variant_response = await request(app)
                .post(`/api/v1/posts/${test_post_id}/variants`)
                .set('Authorization', `Bearer ${root_token}`)
                .send({
                    channel_id: x_channel_id,
                    content: 'Variant to delete'
                });
            test_variant_id = variant_response.body.data.id;
        });

        afterEach(async () => {
            await db_pool.query('DELETE FROM post_variants WHERE post_id = $1', [test_post_id]);
            await db_pool.query('DELETE FROM posts WHERE id = $1', [test_post_id]);
        });

        it('should delete a variant', async () => {
            const response = await request(app)
                .delete(`/api/v1/variants/${test_variant_id}`)
                .set('Authorization', `Bearer ${root_token}`);

            expect(response.status).toBe(204);

            // Verify it's deleted (soft delete - returns 404 or shows as deleted)
            const get_response = await request(app)
                .get(`/api/v1/variants/${test_variant_id}`)
                .set('Authorization', `Bearer ${root_token}`);
      
            // Soft delete may return 404 or 200 with deleted status
            expect([200, 404]).toContain(get_response.status);
            if (get_response.status === 200) {
                expect(get_response.body.data.deleted_at).not.toBeNull();
            }
        });

        it('should not allow deleting published variants', async () => {
            // Mark as published
            await db_pool.query(
                "UPDATE post_variants SET status = 'published', published_at = CURRENT_TIMESTAMP WHERE id = $1",
                [test_variant_id]
            );

            const response = await request(app)
                .delete(`/api/v1/variants/${test_variant_id}`)
                .set('Authorization', `Bearer ${root_token}`);

            expect(response.status).toBe(400);
            expect(response.body.errors[0].error_code).toBe('VARIANT_ALREADY_PUBLISHED');
        });

        it('should deny deleting other users variants', async () => {
            const response = await request(app)
                .delete(`/api/v1/variants/${test_variant_id}`)
                .set('Authorization', `Bearer ${normal_token}`);

            expect(response.status).toBe(403);
            expect(response.body.errors[0].error_code).toBe('VARIANT_ACCESS_DENIED');
        });
    });
});
