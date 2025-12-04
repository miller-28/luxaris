const request = require('supertest');
const { create_database_pool } = require('../../../src/config/database');
const Server = require('../../../src/core/http/server');
const { get_app_config } = require('../../../src/config/app');
const { get_auth_config } = require('../../../src/config/auth');
const { get_logger } = require('../../../src/core/logging/system_logger');
const EventRegistry = require('../../../src/core/events/event-registry');
const UserRepository = require('../../../src/contexts/system/infrastructure/repositories/user-repository');
const AuthService = require('../../../src/contexts/system/application/services/auth-service');
const LoginUserUseCase = require('../../../src/contexts/system/application/use_cases/login-user');
const error_handler = require('../../../src/core/http/middleware/error-handler');
const not_found_handler = require('../../../src/core/http/middleware/not-found-handler');
const { initialize_channels_domain } = require('../../../src/contexts/channels');
const { initialize_posts_domain } = require('../../../src/contexts/posts');
const { initialize_scheduling_domain } = require('../../../src/contexts/scheduling');

describe('Schedules API', () => {
	let db_pool;
	let server;
	let app;
	let auth_service;
	let root_token;
	let root_user_id;
	let channel_connection_id;
	let post_id;
	let variant_id;
	let x_channel_id;

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

		const posts_domain = initialize_posts_domain({
			db_pool,
			system_logger,
			event_registry,
			channel_service: channels_domain.channel_service
		});

		const scheduling_domain = initialize_scheduling_domain({
			db_pool,
			system_logger,
			event_registry,
			post_variant_service: posts_domain.post_variant_service,
			post_repository: posts_domain.post_repository
		});

		// Initialize HTTP server
		server = new Server(app_config);

		// Create authentication middleware
		const auth_middleware = (req, res, next) => {
			const auth_header = req.headers.authorization;
			if (!auth_header || !auth_header.startsWith('Bearer ')) {
				return res.status(401).json({
					errors: [{
						error_code: 'UNAUTHORIZED',
						error_description: 'Missing or invalid authorization header',
						error_severity: 'error'
					}]
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
					timezone: payload.timezone || 'UTC',
					is_root: payload.is_root,
					roles: payload.roles || []
				};
				next();
			} catch (error) {
				return res.status(401).json({
					errors: [{
						error_code: 'INVALID_TOKEN',
						error_description: 'Token is invalid or expired',
						error_severity: 'error'
					}]
				});
			}
		};

		// Register routes
		const channel_routes = channels_domain.create_channel_routes({
			channel_service: channels_domain.channel_service,
			channel_connection_service: channels_domain.channel_connection_service,
			auth_middleware,
			error_handler
		});
		server.register_routes(`/api/${app_config.api_version}/channels`, channel_routes);

		const post_routes = posts_domain.create_post_routes({
			post_service: posts_domain.post_service,
			auth_middleware,
			error_handler
		});
		server.register_routes(`/api/${app_config.api_version}/posts`, post_routes);

		const post_variant_routes = posts_domain.create_post_variant_routes({
			post_variant_service: posts_domain.post_variant_service,
			auth_middleware,
			error_handler
		});
		server.register_routes(`/api/${app_config.api_version}`, post_variant_routes);

		const schedule_routes = scheduling_domain.create_schedule_routes(
			scheduling_domain.schedule_service,
			auth_middleware
		);
		server.register_routes(`/api/${app_config.api_version}/schedules`, schedule_routes);

		// Register error handlers
		server.register_middleware(not_found_handler);
		server.register_error_handler(error_handler);

		// Start server
		await server.start();
		app = server.app;

		// Register root user and get token directly via service
		const root_user = await auth_service.register_user({
			email: 'root@test.com',
			password: 'SecurePassword123!',
			name: 'Root User',
			timezone: 'America/New_York',
			is_root: true
		});
		root_user_id = root_user.id;

		const root_login = await login_use_case.execute({
			email: 'root@test.com',
			password: 'SecurePassword123!'
		});
		root_token = root_login.access_token;

		// Get X channel ID from database (seeded channels)
		const channels_result = await db_pool.query('SELECT id FROM luxaris.channels WHERE key = $1', ['x']);
		x_channel_id = channels_result.rows[0].id;

		// Create channel connection directly in database (bypass OAuth flow)
		const connection_result = await db_pool.query(
			`INSERT INTO luxaris.channel_connections 
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
		await db_pool.query('DELETE FROM luxaris.schedules WHERE channel_connection_id = $1', [channel_connection_id]);
		await db_pool.query('DELETE FROM luxaris.post_variants WHERE post_id = $1', [post_id]);
		await db_pool.query('DELETE FROM luxaris.posts WHERE id = $1', [post_id]);
		await db_pool.query('DELETE FROM luxaris.channel_connections WHERE id = $1', [channel_connection_id]);
		await db_pool.query('DELETE FROM luxaris.users WHERE email = $1', ['root@test.com']);
		await db_pool.end();
	});

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
					post_variant_id: '00000000-0000-0000-0000-000000000000',
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
				.get('/api/v1/schedules/00000000-0000-0000-0000-000000000000')
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
				.patch('/api/v1/schedules/00000000-0000-0000-0000-000000000000')
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
				.post('/api/v1/schedules/00000000-0000-0000-0000-000000000000/cancel')
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

			// Verify it's gone
			const get_response = await request(app)
				.get(`/api/v1/schedules/${temp_schedule_id}`)
				.set('Authorization', `Bearer ${root_token}`);

			expect(get_response.status).toBe(404);
		});

		it('should return 404 for non-existent schedule', async () => {
			const response = await request(app)
				.delete('/api/v1/schedules/00000000-0000-0000-0000-000000000000')
				.set('Authorization', `Bearer ${root_token}`);

			expect(response.status).toBe(404);
		});

		it('should require authentication', async () => {
			const response = await request(app).delete(`/api/v1/schedules/${schedule_id}`);

			expect(response.status).toBe(401);
		});
	});
});
