const TestServer = require('../helpers/test-server');
const DbCleaner = require('../helpers/db-cleaner');
const request = require('supertest');
const { get_logger } = require('../../src/core/logging/system_logger');
const EventRegistry = require('../../src/core/events/event-registry');
const { get_request_logger } = require('../../src/core/http/middleware/request_logger');
const { get_audit_service } = require('../../src/core/audit/audit_service');
const crypto = require('crypto');

describe('Observability Layer', () => {
    let test_server;
    let app;
    let db_pool;
    let db_cleaner;
    let system_logger;
    let event_registry;
    let request_logger;
    let audit_service;

    beforeAll(async () => {
        // Start test server
        test_server = new TestServer();
        app = await test_server.start();
        db_pool = test_server.db_pool;
        
        // Initialize database cleaner
        db_cleaner = new DbCleaner(db_pool);

        // Initialize observability components
        system_logger = get_logger(db_pool);
        event_registry = new EventRegistry(db_pool, system_logger);
        request_logger = get_request_logger(db_pool);
        audit_service = get_audit_service(db_pool);
    });

    afterAll(async () => {
        await test_server.stop();
    });

    beforeEach(async () => {
        // Clean up observability tables
        await db_cleaner.clean_tables([
            'audit_logs',
            'request_logs',
            'system_events',
            'system_logs',
            'sessions',
            'users'
        ]);
    });

    afterEach(async () => {
        // Clean up after tests
        await db_cleaner.clean_tables([
            'audit_logs',
            'request_logs',
            'system_events',
            'system_logs',
            'users'
        ]);
    });

    describe('SystemLogger', () => {
        test('should log INFO messages to database', async () => {
            await system_logger.info(
                'TestComponent',
                'Test info message',
                { test_key: 'test_value', user_id: '123' }
            );

            // Wait a moment for async DB write
            await new Promise(resolve => setTimeout(resolve, 100));

            const result = await db_pool.query(
                "SELECT * FROM system_logs WHERE logger = 'TestComponent' AND level = 'INFO'"
            );

            expect(result.rows.length).toBe(1);
            expect(result.rows[0].message).toBe('Test info message');
            expect(result.rows[0].context.test_key).toBe('test_value');
            expect(result.rows[0].context.user_id).toBe('123');
        });

        test('should log WARNING messages to database', async () => {
            await system_logger.warning(
                'TestComponent',
                'Test warning message',
                { warning_type: 'rate_limit' }
            );

            await new Promise(resolve => setTimeout(resolve, 100));

            const result = await db_pool.query(
                "SELECT * FROM system_logs WHERE logger = 'TestComponent' AND level = 'WARNING'"
            );

            expect(result.rows.length).toBe(1);
            expect(result.rows[0].message).toBe('Test warning message');
            expect(result.rows[0].context.warning_type).toBe('rate_limit');
        });

        test('should log ERROR messages with stack trace', async () => {
            const test_error = new Error('Test error occurred');
			
            await system_logger.error(
                'TestComponent',
                'Test error message',
                test_error,
                { error_context: 'testing' }
            );

            await new Promise(resolve => setTimeout(resolve, 100));

            const result = await db_pool.query(
                "SELECT * FROM system_logs WHERE logger = 'TestComponent' AND level = 'ERROR'"
            );

            expect(result.rows.length).toBe(1);
            expect(result.rows[0].message).toBe('Test error message');
            expect(result.rows[0].context.error_message).toBe('Test error occurred');
            expect(result.rows[0].context.stack_trace).toContain('Error: Test error occurred');
        });

        test('should log CRITICAL messages', async () => {
            const critical_error = new Error('Critical system failure');
			
            await system_logger.critical(
                'SystemCore',
                'Critical failure detected',
                critical_error,
                { system: 'database' }
            );

            await new Promise(resolve => setTimeout(resolve, 100));

            const result = await db_pool.query(
                "SELECT * FROM system_logs WHERE level = 'CRITICAL'"
            );

            expect(result.rows.length).toBe(1);
            expect(result.rows[0].message).toBe('Critical failure detected');
            expect(result.rows[0].context.error_message).toBe('Critical system failure');
        });

        test('should query logs with filters', async () => {
            // Create multiple logs
            await system_logger.info('Component1', 'Message 1', {});
            await system_logger.warning('Component2', 'Message 2', {});
            await system_logger.error('Component1', 'Message 3', new Error('Error'), {});

            await new Promise(resolve => setTimeout(resolve, 100));

            // Query by logger
            const logs_by_logger = await system_logger.query({ logger: 'Component1' });
            expect(logs_by_logger.length).toBe(2);

            // Query by level
            const logs_by_level = await system_logger.query({ level: 'WARNING' });
            expect(logs_by_level.length).toBe(1);
            expect(logs_by_level[0].message).toBe('Message 2');
        });
    });

    describe('EventRegistry', () => {
        test('should record successful events to database', async () => {
            const user_id = 12345; // Use integer ID to match database schema
			
            const event_id = await event_registry.record('auth', 'USER_REGISTERED', {
                principal_id: user_id,
                principal_type: 'user',
                resource_type: 'user',
                resource_id: user_id,
                metadata: { auth_method: 'password', is_root: false },
                ip_address: '127.0.0.1',
                user_agent: 'Test Agent'
            });

            expect(event_id).toBeDefined();

            await new Promise(resolve => setTimeout(resolve, 100));

            const result = await db_pool.query(
                "SELECT * FROM system_events WHERE event_name = 'USER_REGISTERED'"
            );

            expect(result.rows.length).toBe(1);
            expect(result.rows[0].event_type).toBe('auth');
            expect(result.rows[0].principal_id).toBe(user_id);
            expect(result.rows[0].resource_type).toBe('user');
            expect(result.rows[0].status).toBe('success');
            expect(result.rows[0].metadata.auth_method).toBe('password');
            expect(result.rows[0].ip_address).toBe('127.0.0.1');
        });

        test('should record failed events to database', async () => {
            const user_id = 12346; // Use integer ID to match database schema
            const error = new Error('Login failed');
			
            const event_id = await event_registry.record_failure('auth', 'USER_LOGIN', error, {
                principal_id: user_id,
                principal_type: 'user',
                metadata: { reason: 'invalid_password' }
            });

            expect(event_id).toBeDefined();

            await new Promise(resolve => setTimeout(resolve, 100));

            const result = await db_pool.query(
                "SELECT * FROM system_events WHERE event_name = 'USER_LOGIN' AND status = 'failed'"
            );

            expect(result.rows.length).toBe(1);
            expect(result.rows[0].event_type).toBe('auth');
            expect(result.rows[0].status).toBe('failed');
            expect(result.rows[0].metadata.error_message).toBe('Login failed');
            expect(result.rows[0].metadata.reason).toBe('invalid_password');
        });

        test('should query events with filters', async () => {
            const user_1 = 12347; // Use integer ID
            const post_1 = 101; // Use integer ID
            const post_2 = 102;
            const post_3 = 103;
			
            // Create multiple events
            await event_registry.record('auth', 'USER_REGISTERED', {
                principal_id: user_1,
                resource_type: 'user',
                resource_id: user_1
            });
            await event_registry.record('auth', 'USER_LOGIN', {
                principal_id: user_1,
                resource_type: 'user',
                resource_id: user_1
            });
            await event_registry.record('post', 'POST_CREATED', {
                principal_id: user_1,
                resource_type: 'post',
                resource_id: post_1
            });

            await new Promise(resolve => setTimeout(resolve, 100));

            // Query by event_type
            const auth_events = await event_registry.query({ event_type: 'auth' });
            expect(auth_events.length).toBe(2);

            // Query by principal_id
            const user_events = await event_registry.query({ principal_id: user_1 });
            expect(user_events.length).toBe(3);

            // Query by resource_type
            const post_events = await event_registry.query({ resource_type: 'post' });
            expect(post_events.length).toBe(1);
            expect(post_events[0].event_name).toBe('POST_CREATED');
        });
    });

    describe('RequestLogger', () => {
        test('should have query method available', () => {
            expect(typeof request_logger.query).toBe('function');
        });

        test('should have get_metrics method available', () => {
            expect(typeof request_logger.get_metrics).toBe('function');
        });
    });

    describe('AuditService', () => {
        test('should log audit events to database', async () => {
            const actor_id = 12348; // Use integer ID
            const resource_id = 12349;
			
            await audit_service.log('USER_DELETED', {
                actor_type: 'user',
                actor_id,
                resource_type: 'user',
                resource_id,
                ip_address: '192.168.1.1',
                user_agent: 'Mozilla/5.0',
                data: { reason: 'gdpr_request' }
            });

            const result = await db_pool.query(
                "SELECT * FROM audit_logs WHERE action = 'USER_DELETED'"
            );

            expect(result.rows.length).toBe(1);
            expect(result.rows[0].actor_type).toBe('user');
            expect(result.rows[0].actor_id).toBe(actor_id);
            expect(result.rows[0].resource_type).toBe('user');
            expect(result.rows[0].resource_id).toBe(resource_id);
            expect(result.rows[0].data.reason).toBe('gdpr_request');
        });

        test('should query audit logs with filters', async () => {
            const user_1 = 12350; // Use integer IDs
            const user_2 = 12351;
            const post_1 = 201;
            const post_2 = 202;
            const post_3 = 203;
			
            // Create multiple audit logs
            await audit_service.log('POST_UPDATED', {
                actor_id: user_1,
                resource_type: 'post',
                resource_id: post_1
            });
            await audit_service.log('POST_DELETED', {
                actor_id: user_1,
                resource_type: 'post',
                resource_id: post_2
            });
            await audit_service.log('POST_UPDATED', {
                actor_id: user_2,
                resource_type: 'post',
                resource_id: post_3
            });

            // Query by actor
            const user1_audits = await audit_service.query({ actor_id: user_1 });
            expect(user1_audits.length).toBe(2);

            // Query by action
            const update_audits = await audit_service.query({ action: 'POST_UPDATED' });
            expect(update_audits.length).toBe(2);

            // Query by resource_type
            const post_audits = await audit_service.query({ resource_type: 'post' });
            expect(post_audits.length).toBe(3);
        });
    });

    describe('Integration - Real User Flow', () => {
        test('should create logs and events during user registration', async () => {
            const response = await request(app)
                .post('/api/v1/auth/register')
                .send({
                    email: 'newuser@example.com',
                    password: 'SecurePass123!',
                    name: 'New User'
                })
                .expect(201);

            await new Promise(resolve => setTimeout(resolve, 200));

            // Check system logs were created
            const logs = await db_pool.query(
                "SELECT * FROM system_logs WHERE logger = 'AuthService' ORDER BY timestamp DESC"
            );
            expect(logs.rows.length).toBeGreaterThan(0);
            const registration_log = logs.rows.find(l => l.message.includes('registered'));
            expect(registration_log).toBeDefined();

            // Check system event was recorded
            const events = await db_pool.query(
                "SELECT * FROM system_events WHERE event_name = 'USER_REGISTERED' ORDER BY timestamp DESC LIMIT 1"
            );
            expect(events.rows.length).toBe(1);
            expect(events.rows[0].resource_id).toBe(response.body.user.id);
        });

        test('should track user login events', async () => {
            // Register user
            const register_response = await request(app)
                .post('/api/v1/auth/register')
                .send({
                    email: 'logintest@example.com',
                    password: 'LoginPass123!',
                    name: 'Login Test'
                });

            const user_id = register_response.body.user.id;

            // Login user
            await request(app)
                .post('/api/v1/auth/login')
                .send({
                    email: 'logintest@example.com',
                    password: 'LoginPass123!'
                })
                .expect(200);

            await new Promise(resolve => setTimeout(resolve, 200));

            // Verify USER_LOGIN event
            const login_events = await db_pool.query(
                "SELECT * FROM system_events WHERE event_name = 'USER_LOGIN' AND resource_id = $1",
                [user_id]
            );
            expect(login_events.rows.length).toBe(1);
            expect(login_events.rows[0].event_type).toBe('auth');
            expect(login_events.rows[0].status).toBe('success');
        });
    });
});
