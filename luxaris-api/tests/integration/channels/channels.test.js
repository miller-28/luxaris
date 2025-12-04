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
const { initialize_channels_domain } = require('../../../src/contexts/channels');

describe('Channels Integration Tests', () => {
  let db_pool;
  let server;
  let app;
  let auth_service;
  let root_token;
  let root_user_id;
  let normal_token;
  let normal_user_id;
  let x_channel_id;
  let linkedin_channel_id;

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

    // Initialize channels domain
    const channels_domain = initialize_channels_domain({
      db_pool,
      system_logger,
      acl_service: auth_service.acl_service,
      event_registry
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
    const channel_routes = channels_domain.create_channel_routes({
      channel_service: channels_domain.channel_service,
      channel_connection_service: channels_domain.channel_connection_service,
      auth_middleware,
      error_handler: (err, req, res, next) => {
        console.error('Test error:', err);
        res.status(500).json({ errors: [{ error_code: 'INTERNAL_ERROR', error_description: err.message, error_severity: 'error' }] });
      }
    });
    server.register_routes('/api/v1/channels', channel_routes);
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
    root_user_id = root_user.id;

    // Register normal user and get token
    const normal_user = await auth_service.register_user({
      email: 'normal@test.com',
      password: 'SecurePassword123!',
      name: 'Normal User',
      is_root: false
    });
    // Approve the normal user
    await db_pool.query("UPDATE users SET status = 'active' WHERE id = $1", [normal_user.id]);
    const normal_login = await login_use_case.execute({ 
      email: 'normal@test.com', 
      password: 'SecurePassword123!'
    });
    normal_token = normal_login.access_token;
    normal_user_id = normal_user.id;

    // Get channel IDs
    const channels_result = await db_pool.query('SELECT id, key FROM luxaris.channels');
    x_channel_id = channels_result.rows.find(c => c.key === 'x').id;
    linkedin_channel_id = channels_result.rows.find(c => c.key === 'linkedin').id;
  });

  afterAll(async () => {
    // Clean up test data
    await db_pool.query('DELETE FROM luxaris.channel_connections WHERE owner_principal_id = $1', [root_user_id]);
    await db_pool.query('DELETE FROM luxaris.channel_connections WHERE owner_principal_id = $1', [normal_user_id]);
    await db_pool.query('DELETE FROM luxaris.users WHERE email = $1', ['root@test.com']);
    await db_pool.query('DELETE FROM luxaris.users WHERE email = $1', ['normal@test.com']);
    await db_pool.end();
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
      const response = await request(app)
        .post('/api/v1/channels/connect')
        .set('Authorization', `Bearer ${root_token}`)
        .send({
          channel_id: x_channel_id,
          display_name: '@test_user_2',
          mock_connection: true
        });

      expect(response.status).toBe(400);
      expect(response.body.errors[0].error_code).toBe('CONNECTION_ALREADY_EXISTS');
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
      const response = await request(app)
        .post('/api/v1/channels/connect')
        .set('Authorization', `Bearer ${root_token}`)
        .send({
          channel_id: '00000000-0000-0000-0000-000000000000',
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
      expect(response.body.data.length).toBe(1);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.total).toBe(1);

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
      // Get normal user's connection ID
      const normal_response = await request(app)
        .get('/api/v1/channels/connections')
        .set('Authorization', `Bearer ${normal_token}`);
      const normal_connection_id = normal_response.body.data[0].id;

      // Try to disconnect with root token
      const response = await request(app)
        .delete(`/api/v1/channels/connections/${normal_connection_id}`)
        .set('Authorization', `Bearer ${root_token}`);

      expect(response.status).toBe(403);
      expect(response.body.errors[0].error_code).toBe('FORBIDDEN');
    });

    it('should return 404 for non-existent connection', async () => {
      const response = await request(app)
        .delete('/api/v1/channels/connections/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${root_token}`);

      expect(response.status).toBe(404);
      expect(response.body.errors[0].error_code).toBe('CONNECTION_NOT_FOUND');
    });
  });
});
