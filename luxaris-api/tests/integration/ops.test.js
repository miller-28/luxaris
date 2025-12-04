const TestServer = require('../helpers/test-server');
const request = require('supertest');
const { create_database_pool } = require('../../src/config/database');

describe('Operations & System Management', () => {
    let test_server;
    let app;
    let db_pool;

    beforeAll(async () => {
        db_pool = create_database_pool();
        test_server = new TestServer();
        app = await test_server.start();
    });

    afterAll(async () => {
        await test_server.stop();
        await db_pool.end();
    });

    beforeEach(async () => {
        // Clean up feature flags (except default ones)
        await db_pool.query("DELETE FROM feature_flags WHERE key NOT IN ('posts.ai_generation', 'schedules.bulk_operations', 'system.maintenance_mode')");
		
        // Clean up observability tables
        await db_pool.query('DELETE FROM audit_logs');
        await db_pool.query('DELETE FROM request_logs');
        await db_pool.query('DELETE FROM system_events');
        await db_pool.query('DELETE FROM system_logs');
        await db_pool.query('DELETE FROM sessions');
        await db_pool.query('DELETE FROM users');
    });

    afterEach(async () => {
        await db_pool.query('DELETE FROM audit_logs');
        await db_pool.query('DELETE FROM request_logs');
        await db_pool.query('DELETE FROM system_events');
        await db_pool.query('DELETE FROM system_logs');
        await db_pool.query('DELETE FROM users');
    });

    describe('Health Check', () => {
        test('GET /api/v1/ops/health should return system health status', async () => {
            const response = await request(app)
                .get('/api/v1/ops/health')
                .expect(200);

            expect(response.body).toHaveProperty('status');
            expect(response.body).toHaveProperty('checks');
            expect(['healthy', 'degraded', 'unhealthy']).toContain(response.body.status);
            expect(response.body.checks).toHaveProperty('database');
            expect(response.body.checks).toHaveProperty('cache');
        });

        test('GET /api/v1/ops/status should return detailed system status', async () => {
            const response = await request(app)
                .get('/api/v1/ops/status')
                .expect(200);

            expect(response.body).toHaveProperty('status');
            expect(response.body).toHaveProperty('version');
            expect(response.body).toHaveProperty('environment');
            expect(response.body).toHaveProperty('timestamp');
            expect(response.body).toHaveProperty('checks');
            expect(response.body.version).toBe('v1');
            expect(response.body.environment).toBe('test');
        });

        test('Health check should report database status correctly', async () => {
            const response = await request(app)
                .get('/api/v1/ops/health')
                .expect(200);

            expect(response.body.checks.database).toBe('ok');
        });
    });

    describe('Feature Flags', () => {
        test('GET /api/v1/ops/flags should return all feature flags', async () => {
            const response = await request(app)
                .get('/api/v1/ops/flags')
                .expect(200);

            expect(response.body).toHaveProperty('flags');
            expect(response.body).toHaveProperty('count');
            expect(Array.isArray(response.body.flags)).toBe(true);
            expect(response.body.flags.length).toBeGreaterThanOrEqual(3); // Default flags
			
            // Check default flags exist
            const flag_keys = response.body.flags.map(f => f.key);
            expect(flag_keys).toContain('posts.ai_generation');
            expect(flag_keys).toContain('schedules.bulk_operations');
            expect(flag_keys).toContain('system.maintenance_mode');
        });

        test('GET /api/v1/ops/flags?enabled_only=true should return only enabled flags', async () => {
            const response = await request(app)
                .get('/api/v1/ops/flags?enabled_only=true')
                .expect(200);

            expect(response.body.flags.length).toBeGreaterThanOrEqual(2);
			
            // All returned flags should be enabled
            response.body.flags.forEach(flag => {
                expect(flag.is_enabled).toBe(true);
            });
        });

        test('GET /api/v1/ops/flags/:key should return specific feature flag', async () => {
            const response = await request(app)
                .get('/api/v1/ops/flags/posts.ai_generation')
                .expect(200);

            expect(response.body).toHaveProperty('id');
            expect(response.body.key).toBe('posts.ai_generation');
            expect(response.body).toHaveProperty('value');
            expect(response.body).toHaveProperty('description');
            expect(response.body).toHaveProperty('is_enabled');
        });

        test('GET /api/v1/ops/flags/:key should return 404 for non-existent flag', async () => {
            const response = await request(app)
                .get('/api/v1/ops/flags/non.existent.flag')
                .expect(404);

            expect(response.body).toHaveProperty('errors');
            expect(response.body.errors[0].error_code).toBe('FEATURE_FLAG_NOT_FOUND');
        });

        test('GET /api/v1/ops/flags/:key/check should return flag enabled status', async () => {
            const response = await request(app)
                .get('/api/v1/ops/flags/posts.ai_generation/check')
                .expect(200);

            expect(response.body).toHaveProperty('key');
            expect(response.body).toHaveProperty('enabled');
            expect(response.body.key).toBe('posts.ai_generation');
            expect(typeof response.body.enabled).toBe('boolean');
        });

        test('Feature flag check should return false for disabled flag', async () => {
            const response = await request(app)
                .get('/api/v1/ops/flags/system.maintenance_mode/check')
                .expect(200);

            expect(response.body.enabled).toBe(false);
        });

        test('Feature flag check should return false for non-existent flag', async () => {
            const response = await request(app)
                .get('/api/v1/ops/flags/non.existent.flag/check')
                .expect(200);

            expect(response.body.enabled).toBe(false);
        });
    });

    describe('Feature Flag Service Logic', () => {
        test('Should create new feature flag in database', async () => {
            await db_pool.query(`
				INSERT INTO feature_flags (key, value, description, is_enabled)
				VALUES ('test.new_feature', 'true'::jsonb, 'Test feature', true)
			`);

            const response = await request(app)
                .get('/api/v1/ops/flags/test.new_feature')
                .expect(200);

            expect(response.body.key).toBe('test.new_feature');
            expect(response.body.description).toBe('Test feature');
        });

        test('Should handle boolean feature flag values', async () => {
            await db_pool.query(`
				INSERT INTO feature_flags (key, value, description, is_enabled)
				VALUES ('test.boolean_flag', 'true'::jsonb, 'Boolean test', true)
			`);

            const response = await request(app)
                .get('/api/v1/ops/flags/test.boolean_flag/check')
                .expect(200);

            expect(response.body.enabled).toBe(true);
        });

        test('Should handle string feature flag values', async () => {
            await db_pool.query(`
				INSERT INTO feature_flags (key, value, description, is_enabled)
				VALUES ('test.string_flag', '"my_value"'::jsonb, 'String test', true)
			`);

            const response = await request(app)
                .get('/api/v1/ops/flags/test.string_flag')
                .expect(200);

            expect(response.body.value).toBe('my_value');
        });
    });
});
