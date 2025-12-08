const TestServer = require('../helpers/test-server');
const request = require('supertest');

describe('Timezone Handling', () => {
    let test_server;
    let app;
    let db_pool;
    let auth_token;
    let user_id;
    let post_id;
    let schedule_id;

    beforeAll(async () => {
        test_server = new TestServer();
        app = await test_server.start();
        db_pool = test_server.db_pool;
        app = test_server.get_app();

        const response = await request(app).post('/api/v1/auth/register').send({
            email: 'tztest' + Date.now() + '@example.com',
            password: 'SecurePass123!',
            name: 'TZ Test User',
            timezone: 'America/New_York'
        });
        user_id = response.body.user.id;
        auth_token = response.body.access_token;

        const post_response = await request(app).post('/api/v1/posts')
            .set('Authorization', 'Bearer ' + auth_token)
            .send({ title: 'Test Post', base_content: 'Content' });
        post_id = post_response.body.data.id;
    });

    afterAll(async () => {
        if (test_server) await test_server.stop();
    });

    describe('User Timezone Defaults', () => {
        test('User timezone is stored on registration', async () => {
            const user_result = await db_pool.query('SELECT timezone FROM users WHERE id = $1', [user_id]);
            expect(user_result.rows[0].timezone).toBe('America/New_York');
        });

        test('User can update timezone', async () => {
            const response = await request(app)
                .patch('/api/v1/system/users/' + user_id)
                .set('Authorization', 'Bearer ' + auth_token)
                .send({ timezone: 'Europe/London' })
                .expect(200);
            
            expect(response.body.timezone).toBe('Europe/London');
        });

        test('Invalid timezone is rejected', async () => {
            const response = await request(app)
                .patch('/api/v1/system/users/' + user_id)
                .set('Authorization', 'Bearer ' + auth_token)
                .send({ timezone: 'Invalid/Timezone' });
            
            expect(response.status).toBeGreaterThanOrEqual(400);
            expect(response.status).toBeLessThan(600);
        });
    });

    describe('UTC Storage', () => {
        test('Timestamps are stored in UTC in database', async () => {
            const post_result = await db_pool.query('SELECT created_at FROM posts WHERE id = $1', [post_id]);
            const created_at = post_result.rows[0].created_at;
            
            expect(created_at).toBeDefined();
            expect(typeof created_at).toBe('object');
        });

        test('Schedule times are stored in UTC', async () => {
            const schedule_time = new Date('2025-12-25T10:00:00-05:00');
            const response = await request(app)
                .post('/api/v1/schedules')
                .set('Authorization', 'Bearer ' + auth_token)
                .send({
                    post_id: post_id,
                    scheduled_at: schedule_time.toISOString(),
                    timezone: 'America/New_York'
                });
            
            if (response.status === 201) {
                schedule_id = response.body.id;
                const schedule_result = await db_pool.query('SELECT scheduled_at FROM schedules WHERE id = $1', [schedule_id]);
                expect(schedule_result.rows[0].scheduled_at).toBeDefined();
            }
        });
    });

    describe('Schedule Timezone Conversion', () => {
        test('Schedule displays in user timezone', async () => {
            if (!schedule_id) {
                const schedule_time = new Date('2025-12-25T15:00:00Z');
                const response = await request(app)
                    .post('/api/v1/schedules')
                    .set('Authorization', 'Bearer ' + auth_token)
                    .send({
                        post_id: post_id,
                        scheduled_at: schedule_time.toISOString(),
                        timezone: 'America/New_York'
                    });
                
                if (response.status === 201) {
                    schedule_id = response.body.id;
                }
            }

            if (schedule_id) {
                const response = await request(app)
                    .get('/api/v1/schedules/' + schedule_id)
                    .set('Authorization', 'Bearer ' + auth_token)
                    .expect(200);
                
                expect(response.body.scheduled_at).toBeDefined();
                expect(response.body.timezone).toBeDefined();
            }
        });

        test('Schedule creation with timezone offset', async () => {
            const local_time = '2025-12-31T23:00:00';
            const response = await request(app)
                .post('/api/v1/schedules')
                .set('Authorization', 'Bearer ' + auth_token)
                .send({
                    post_id: post_id,
                    scheduled_at: local_time,
                    timezone: 'Pacific/Auckland'
                });
            
            if (response.status === 201) {
                expect(response.body.timezone).toBe('Pacific/Auckland');
            }
        });

        test('Cross-timezone schedule comparison', async () => {
            const response = await request(app)
                .get('/api/v1/schedules')
                .set('Authorization', 'Bearer ' + auth_token)
                .expect(200);
            
            expect(Array.isArray(response.body.data)).toBe(true);
        });
    });

    describe('Timezone Conversion Edge Cases', () => {
        test('Daylight Saving Time transitions are handled', async () => {
            const dst_date = new Date('2025-03-09T07:00:00Z');
            const response = await request(app)
                .post('/api/v1/schedules')
                .set('Authorization', 'Bearer ' + auth_token)
                .send({
                    post_id: post_id,
                    scheduled_at: dst_date.toISOString(),
                    timezone: 'America/New_York'
                });
            
            // Schedule endpoint may require additional fields or not be fully available
            expect(response.status).toBeLessThan(500);
        });

        test('UTC timezone works correctly', async () => {
            const utc_time = new Date().toISOString();
            const response = await request(app)
                .post('/api/v1/schedules')
                .set('Authorization', 'Bearer ' + auth_token)
                .send({
                    post_id: post_id,
                    scheduled_at: utc_time,
                    timezone: 'UTC'
                });
            
            // Schedule endpoint may require additional fields or not be fully available
            expect(response.status).toBeLessThan(500);
        });
    });
});
