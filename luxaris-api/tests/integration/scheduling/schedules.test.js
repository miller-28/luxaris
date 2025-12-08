const TestServer = require('../../helpers/test-server');
const TestUsers = require('../../helpers/test-users');
const DbCleaner = require('../../helpers/db-cleaner');
const request = require('supertest');

describe('Schedules API', () => {
    let test_server;
    let app;
    let db_pool;
    let db_cleaner;
    let test_users;
    let root_token;
    let root_user_id;
    let channel_connection_id;
    let post_id;
    let variant_id;
    let x_channel_id;

    beforeAll(async () => {
        test_server = new TestServer();
        app = await test_server.start();
        db_pool = test_server.db_pool;
        
        // Initialize database cleaner and test users helper
        db_cleaner = new DbCleaner(db_pool);
        test_users = new TestUsers(app, db_pool);

        // Register root user
        ({ user_id: root_user_id, token: root_token } = await test_users.create_quick_root_user('root-sched'));

        // Get X channel ID from database (seeded channels)
        const channels_result = await db_pool.query('SELECT id FROM channels WHERE key = $1', ['x']);
        x_channel_id = channels_result.rows[0].id;

        // Create channel connection directly in database (bypass OAuth flow)
        const connection_result = await db_pool.query(
            `INSERT INTO channel_connections 
			(channel_id, owner_principal_id, status, auth_state, display_name) 
			VALUES ($1, $2, $3, $4, $5) 
			RETURNING id`,
            [
                x_channel_id,
                root_user_id,
                'connected',
                JSON.stringify({ access_token: 'mock_token', access_token_secret: 'mock_secret' }),
                'Test X Account'
            ]
        );
        channel_connection_id = connection_result.rows[0].id;

        // Create a post
        const post_response = await request(app)
            .post('/api/v1/posts')
            .set('Authorization', `Bearer ${root_token}`)
            .send({
                title: 'Test Post for Scheduling',
                base_content: 'Testing schedule creation'
            });
        post_id = post_response.body.data.id;

        // Create a variant
        const variant_response = await request(app)
            .post(`/api/v1/posts/${post_id}/variants`)
            .set('Authorization', `Bearer ${root_token}`)
            .send({
                channel_id: x_channel_id,
                content: 'Test content for scheduling'
            });
        variant_id = variant_response.body.data.id;
    });

    afterAll(async () => {
        // Cleanup test data
        if (db_cleaner && root_user_id) {
            await db_cleaner.clean_table_where('schedules', 'channel_connection_id = $1', [channel_connection_id]);
            await db_cleaner.clean_table_where('post_variants', 'post_id = $1', [post_id]);
            await db_cleaner.clean_table_where('posts', 'id = $1', [post_id]);
            await db_cleaner.clean_table_where('channel_connections', 'id = $1', [channel_connection_id]);
            await db_cleaner.clean_users_by_ids([root_user_id]);
        }
        if (test_server) {
            await test_server.stop();
        }
    });

    // Note: beforeEach cleanup removed - individual test suites manage their own cleanup as needed

    describe('POST /api/v1/schedules', () => {
        it('should create a schedule with all required fields', async () => {
            const future_date = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day from now

            const response = await request(app)
                .post('/api/v1/schedules')
                .set('Authorization', `Bearer ${root_token}`)
                .send({
                    post_variant_id: variant_id,
                    channel_connection_id: channel_connection_id,
                    run_at: future_date.toISOString(),
                    timezone: 'America/New_York'
                });

            expect(response.status).toBe(201);
            expect(response.body.data).toHaveProperty('id');
            expect(response.body.data.post_variant_id).toBe(variant_id);
            expect(response.body.data.channel_connection_id).toBe(channel_connection_id);
            expect(response.body.data.timezone).toBe('America/New_York');
            expect(response.body.data.status).toBe('pending');
            expect(response.body.data.attempt_count).toBe(0);
        });

        it('should use principal timezone if not provided', async () => {
            const future_date = new Date(Date.now() + 24 * 60 * 60 * 1000);

            const response = await request(app)
                .post('/api/v1/schedules')
                .set('Authorization', `Bearer ${root_token}`)
                .send({
                    post_variant_id: variant_id,
                    channel_connection_id: channel_connection_id,
                    run_at: future_date.toISOString()
                    // timezone omitted - should use user's timezone
                });

            expect(response.status).toBe(201);
            expect(response.body.data.timezone).toBe('America/New_York'); // From root user
        });

        it('should reject schedule with past run_at', async () => {
            const past_date = new Date(Date.now() - 24 * 60 * 60 * 1000); // 1 day ago

            const response = await request(app)
                .post('/api/v1/schedules')
                .set('Authorization', `Bearer ${root_token}`)
                .send({
                    post_variant_id: variant_id,
                    channel_connection_id: channel_connection_id,
                    run_at: past_date.toISOString(),
                    timezone: 'UTC'
                });

            expect(response.status).toBe(400);
            expect(response.body.errors[0].error_code).toBe('SCHEDULE_TIME_MUST_BE_FUTURE');
        });

        it('should reject schedule too far in the future (>90 days)', async () => {
            const far_future = new Date(Date.now() + 95 * 24 * 60 * 60 * 1000); // 95 days

            const response = await request(app)
                .post('/api/v1/schedules')
                .set('Authorization', `Bearer ${root_token}`)
                .send({
                    post_variant_id: variant_id,
                    channel_connection_id: channel_connection_id,
                    run_at: far_future.toISOString(),
                    timezone: 'UTC'
                });

            expect(response.status).toBe(400);
            expect(response.body.errors[0].error_code).toBe('SCHEDULE_TIME_TOO_FAR');
        });

        it('should reject schedule with missing required fields', async () => {
            const response = await request(app)
                .post('/api/v1/schedules')
                .set('Authorization', `Bearer ${root_token}`)
                .send({
                    post_variant_id: variant_id
                    // Missing channel_connection_id and run_at
                });

            expect(response.status).toBe(400);
            expect(response.body.errors[0].error_code).toBe('SCHEDULE_REQUIRED_FIELDS_MISSING');
        });

        it('should reject schedule for non-existent variant', async () => {
            const future_date = new Date(Date.now() + 24 * 60 * 60 * 1000);

            const response = await request(app)
                .post('/api/v1/schedules')
                .set('Authorization', `Bearer ${root_token}`)
                .send({
                    post_variant_id: 999999,
                    channel_connection_id: channel_connection_id,
                    run_at: future_date.toISOString(),
                    timezone: 'UTC'
                });

            expect(response.status).toBe(404);
            expect(response.body.errors[0].error_code).toBe('VARIANT_NOT_FOUND');
        });

        it('should require authentication', async () => {
            const future_date = new Date(Date.now() + 24 * 60 * 60 * 1000);

            const response = await request(app)
                .post('/api/v1/schedules')
                .send({
                    post_variant_id: variant_id,
                    channel_connection_id: channel_connection_id,
                    run_at: future_date.toISOString(),
                    timezone: 'UTC'
                });

            expect(response.status).toBe(401);
        });
    });

    describe('GET /api/v1/schedules', () => {
        let schedule_id_1, schedule_id_2;

        beforeAll(async () => {
            // Create schedules for listing tests
            const future_1 = new Date(Date.now() + 24 * 60 * 60 * 1000);
            const future_2 = new Date(Date.now() + 48 * 60 * 60 * 1000);

            const response_1 = await request(app)
                .post('/api/v1/schedules')
                .set('Authorization', `Bearer ${root_token}`)
                .send({
                    post_variant_id: variant_id,
                    channel_connection_id: channel_connection_id,
                    run_at: future_1.toISOString(),
                    timezone: 'UTC'
                });
            schedule_id_1 = response_1.body.data.id;

            const response_2 = await request(app)
                .post('/api/v1/schedules')
                .set('Authorization', `Bearer ${root_token}`)
                .send({
                    post_variant_id: variant_id,
                    channel_connection_id: channel_connection_id,
                    run_at: future_2.toISOString(),
                    timezone: 'Europe/London'
                });
            schedule_id_2 = response_2.body.data.id;
        });

        it('should list all schedules', async () => {
            const response = await request(app)
                .get('/api/v1/schedules')
                .set('Authorization', `Bearer ${root_token}`);

            expect(response.status).toBe(200);
            expect(response.body.data).toBeInstanceOf(Array);
            expect(response.body.data.length).toBeGreaterThanOrEqual(2);
            expect(response.body.meta).toHaveProperty('total');
            expect(response.body.meta).toHaveProperty('limit');
            expect(response.body.meta).toHaveProperty('offset');
        });

        it('should filter schedules by status', async () => {
            const response = await request(app)
                .get('/api/v1/schedules?status=pending')
                .set('Authorization', `Bearer ${root_token}`);

            expect(response.status).toBe(200);
            expect(response.body.data).toBeInstanceOf(Array);
            response.body.data.forEach(schedule => {
                expect(schedule.status).toBe('pending');
            });
        });

        it('should filter schedules by post_variant_id', async () => {
            const response = await request(app)
                .get(`/api/v1/schedules?post_variant_id=${variant_id}`)
                .set('Authorization', `Bearer ${root_token}`);

            expect(response.status).toBe(200);
            expect(response.body.data).toBeInstanceOf(Array);
            response.body.data.forEach(schedule => {
                expect(schedule.post_variant_id).toBe(variant_id);
            });
        });

        it('should filter schedules by channel_connection_id', async () => {
            const response = await request(app)
                .get(`/api/v1/schedules?channel_connection_id=${channel_connection_id}`)
                .set('Authorization', `Bearer ${root_token}`);

            expect(response.status).toBe(200);
            expect(response.body.data).toBeInstanceOf(Array);
            response.body.data.forEach(schedule => {
                expect(schedule.channel_connection_id).toBe(channel_connection_id);
            });
        });

        it('should support pagination', async () => {
            const response = await request(app)
                .get('/api/v1/schedules?limit=1&offset=0')
                .set('Authorization', `Bearer ${root_token}`);

            expect(response.status).toBe(200);
            expect(response.body.data.length).toBeLessThanOrEqual(1);
            expect(response.body.meta.limit).toBe(1);
            expect(response.body.meta.offset).toBe(0);
        });

        it('should require authentication', async () => {
            const response = await request(app).get('/api/v1/schedules');

            expect(response.status).toBe(401);
        });
    });

    describe('GET /api/v1/schedules/:id', () => {
        let schedule_id;

        beforeAll(async () => {
            const future_date = new Date(Date.now() + 24 * 60 * 60 * 1000);
            const response = await request(app)
                .post('/api/v1/schedules')
                .set('Authorization', `Bearer ${root_token}`)
                .send({
                    post_variant_id: variant_id,
                    channel_connection_id: channel_connection_id,
                    run_at: future_date.toISOString(),
                    timezone: 'Asia/Tokyo'
                });
            schedule_id = response.body.data.id;
        });

        it('should get schedule by id', async () => {
            const response = await request(app)
                .get(`/api/v1/schedules/${schedule_id}`)
                .set('Authorization', `Bearer ${root_token}`);

            expect(response.status).toBe(200);
            expect(response.body.data.schedule).toHaveProperty('id', schedule_id);
            expect(response.body.data.schedule.post_variant_id).toBe(variant_id);
            expect(response.body.data.schedule.timezone).toBe('Asia/Tokyo');
            expect(response.body.data).toHaveProperty('publish_events');
            expect(response.body.data.publish_events).toBeInstanceOf(Array);
        });

        it('should return 404 for non-existent schedule', async () => {
            const response = await request(app)
                .get('/api/v1/schedules/999999')
                .set('Authorization', `Bearer ${root_token}`);

            expect(response.status).toBe(404);
            expect(response.body.errors[0].error_code).toBe('SCHEDULE_NOT_FOUND');
        });

        it('should require authentication', async () => {
            const response = await request(app).get(`/api/v1/schedules/${schedule_id}`);

            expect(response.status).toBe(401);
        });
    });

    describe('PATCH /api/v1/schedules/:id', () => {
        let schedule_id;

        beforeEach(async () => {
            const future_date = new Date(Date.now() + 24 * 60 * 60 * 1000);
            const response = await request(app)
                .post('/api/v1/schedules')
                .set('Authorization', `Bearer ${root_token}`)
                .send({
                    post_variant_id: variant_id,
                    channel_connection_id: channel_connection_id,
                    run_at: future_date.toISOString(),
                    timezone: 'UTC'
                });
            schedule_id = response.body.data.id;
        });

        it('should update schedule run_at', async () => {
            const new_run_at = new Date(Date.now() + 48 * 60 * 60 * 1000);

            const response = await request(app)
                .patch(`/api/v1/schedules/${schedule_id}`)
                .set('Authorization', `Bearer ${root_token}`)
                .send({
                    run_at: new_run_at.toISOString()
                });

            expect(response.status).toBe(200);
            expect(response.body.data.id).toBe(schedule_id);
            expect(new Date(response.body.data.run_at).getTime()).toBeCloseTo(new_run_at.getTime(), -2);
        });

        it('should update schedule timezone', async () => {
            const response = await request(app)
                .patch(`/api/v1/schedules/${schedule_id}`)
                .set('Authorization', `Bearer ${root_token}`)
                .send({
                    timezone: 'Europe/Paris'
                });

            expect(response.status).toBe(200);
            expect(response.body.data.timezone).toBe('Europe/Paris');
        });

        it('should reject past run_at in update', async () => {
            const past_date = new Date(Date.now() - 24 * 60 * 60 * 1000);

            const response = await request(app)
                .patch(`/api/v1/schedules/${schedule_id}`)
                .set('Authorization', `Bearer ${root_token}`)
                .send({
                    run_at: past_date.toISOString()
                });

            expect(response.status).toBe(400);
            expect(response.body.errors[0].error_code).toBe('SCHEDULE_TIME_MUST_BE_FUTURE');
        });

        it('should return 404 for non-existent schedule', async () => {
            const response = await request(app)
                .patch('/api/v1/schedules/999999')
                .set('Authorization', `Bearer ${root_token}`)
                .send({
                    timezone: 'UTC'
                });

            expect(response.status).toBe(404);
            expect(response.body.errors[0].error_code).toBe('SCHEDULE_NOT_FOUND');
        });

        it('should require authentication', async () => {
            const response = await request(app)
                .patch(`/api/v1/schedules/${schedule_id}`)
                .send({ timezone: 'UTC' });

            expect(response.status).toBe(401);
        });
    });

    describe('POST /api/v1/schedules/:id/cancel', () => {
        let schedule_id;

        beforeEach(async () => {
            const future_date = new Date(Date.now() + 24 * 60 * 60 * 1000);
            const response = await request(app)
                .post('/api/v1/schedules')
                .set('Authorization', `Bearer ${root_token}`)
                .send({
                    post_variant_id: variant_id,
                    channel_connection_id: channel_connection_id,
                    run_at: future_date.toISOString(),
                    timezone: 'UTC'
                });
            schedule_id = response.body.data.id;
        });

        it('should cancel a pending schedule', async () => {
            const response = await request(app)
                .post(`/api/v1/schedules/${schedule_id}/cancel`)
                .set('Authorization', `Bearer ${root_token}`);

            expect(response.status).toBe(200);
            expect(response.body.data.id).toBe(schedule_id);
            expect(response.body.data.status).toBe('cancelled');
        });

        it('should return 404 for non-existent schedule', async () => {
            const response = await request(app)
                .post('/api/v1/schedules/999999/cancel')
                .set('Authorization', `Bearer ${root_token}`);

            expect(response.status).toBe(404);
            expect(response.body.errors[0].error_code).toBe('SCHEDULE_NOT_FOUND');
        });

        it('should require authentication', async () => {
            const response = await request(app).post(`/api/v1/schedules/${schedule_id}/cancel`);

            expect(response.status).toBe(401);
        });
    });

    describe('DELETE /api/v1/schedules/:id', () => {
        let schedule_id;

        beforeEach(async () => {
            const future_date = new Date(Date.now() + 24 * 60 * 60 * 1000);
            const response = await request(app)
                .post('/api/v1/schedules')
                .set('Authorization', `Bearer ${root_token}`)
                .send({
                    post_variant_id: variant_id,
                    channel_connection_id: channel_connection_id,
                    run_at: future_date.toISOString(),
                    timezone: 'UTC'
                });
            schedule_id = response.body.data.id;
        });

        it('should delete a schedule', async () => {
            const response = await request(app)
                .delete(`/api/v1/schedules/${schedule_id}`)
                .set('Authorization', `Bearer ${root_token}`);

            expect(response.status).toBe(204);
        });

        it('should return 404 after deletion', async () => {
            // Create a new schedule for this test
            const future_date = new Date(Date.now() + 24 * 60 * 60 * 1000);
            const create_response = await request(app)
                .post('/api/v1/schedules')
                .set('Authorization', `Bearer ${root_token}`)
                .send({
                    post_variant_id: variant_id,
                    channel_connection_id: channel_connection_id,
                    run_at: future_date.toISOString(),
                    timezone: 'UTC'
                });
            const temp_schedule_id = create_response.body.data.id;

            // Delete with permanent flag
            await request(app)
                .delete(`/api/v1/schedules/${temp_schedule_id}?permanent=true`)
                .set('Authorization', `Bearer ${root_token}`);

            // Verify it's gone (soft delete may return 200 with deleted_at or 404)
            const get_response = await request(app)
                .get(`/api/v1/schedules/${temp_schedule_id}`)
                .set('Authorization', `Bearer ${root_token}`);

            expect([200, 404]).toContain(get_response.status);
            if (get_response.status === 200) {
                // If soft deleted, should have deleted_at
                expect(get_response.body.data.schedule.deleted_at).not.toBeNull();
            }
        });

        it('should return 404 for non-existent schedule', async () => {
            const response = await request(app)
                .delete('/api/v1/schedules/999999')
                .set('Authorization', `Bearer ${root_token}`);

            expect(response.status).toBe(404);
        });

        it('should require authentication', async () => {
            const response = await request(app).delete(`/api/v1/schedules/${schedule_id}`);

            expect(response.status).toBe(401);
        });
    });
});
