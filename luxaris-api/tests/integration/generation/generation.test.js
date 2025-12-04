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
const { initialize_posts_domain } = require('../../../src/contexts/posts');
const { initialize_generation_domain } = require('../../../src/contexts/generation');

describe('Generation Integration Tests', () => {
  let db_pool;
  let server;
  let app;
  let auth_service;
  let root_token;
  let normal_token;
  let generation_domain;
  let x_channel_id = '7fc9150d-32f3-48ed-a600-036610ef5642';
  let linkedin_channel_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

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

    // Initialize domains in order
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

    generation_domain = initialize_generation_domain({
      db_pool,
      system_logger,
      event_registry,
      post_service: posts_domain.post_service,
      post_variant_service: posts_domain.post_variant_service,
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

    // Create server with template and generation routes
    server = new Server(app_config);
    
    const template_routes = generation_domain.create_post_template_routes({
      post_template_service: generation_domain.post_template_service,
      auth_middleware,
      error_handler: (err, req, res, next) => {
        console.error('Test error:', err);
        res.status(500).json({ errors: [{ error_code: 'INTERNAL_ERROR', error_description: err.message, error_severity: 'error' }] });
      }
    });
    server.register_routes('/api/v1/templates', template_routes);

    const generation_routes = generation_domain.create_generation_routes({
      generation_service: generation_domain.generation_service,
      auth_middleware,
      error_handler: (err, req, res, next) => {
        console.error('Test error:', err);
        res.status(500).json({ errors: [{ error_code: 'INTERNAL_ERROR', error_description: err.message, error_severity: 'error' }] });
      }
    });
    server.register_routes('/api/v1/generation', generation_routes);
    
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
    await db_pool.query('DELETE FROM generation_suggestions');
    await db_pool.query('DELETE FROM generation_sessions');
    await db_pool.query('DELETE FROM post_templates');
    await db_pool.query('DELETE FROM post_variants');
    await db_pool.query('DELETE FROM posts');
    await db_pool.query("DELETE FROM users WHERE email IN ('root@test.com', 'normal@test.com')");
    await db_pool.end();
  });

  describe('POST /api/v1/templates', () => {
    afterEach(async () => {
      await db_pool.query('DELETE FROM post_templates WHERE owner_principal_id IN (SELECT id FROM users WHERE email IN ($1, $2))', ['root@test.com', 'normal@test.com']);
    });

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

    afterEach(async () => {
      await db_pool.query('DELETE FROM post_templates WHERE owner_principal_id IN (SELECT id FROM users WHERE email IN ($1, $2))', ['root@test.com', 'normal@test.com']);
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

    afterEach(async () => {
      await db_pool.query('DELETE FROM post_templates WHERE owner_principal_id IN (SELECT id FROM users WHERE email IN ($1, $2))', ['root@test.com', 'normal@test.com']);
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

    afterEach(async () => {
      await db_pool.query('DELETE FROM post_templates WHERE owner_principal_id IN (SELECT id FROM users WHERE email IN ($1, $2))', ['root@test.com', 'normal@test.com']);
    });

    it('should delete template', async () => {
      const response = await request(app)
        .delete(`/api/v1/templates/${template_id}`)
        .set('Authorization', `Bearer ${root_token}`);

      expect(response.status).toBe(204);

      // Verify deletion
      const get_response = await request(app)
        .get(`/api/v1/templates/${template_id}`)
        .set('Authorization', `Bearer ${root_token}`);

      expect(get_response.status).toBe(404);
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

    afterEach(async () => {
      await db_pool.query('DELETE FROM post_templates WHERE owner_principal_id IN (SELECT id FROM users WHERE email IN ($1, $2))', ['root@test.com', 'normal@test.com']);
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
    afterEach(async () => {
      await db_pool.query('DELETE FROM generation_suggestions');
      await db_pool.query('DELETE FROM generation_sessions WHERE owner_principal_id IN (SELECT id FROM users WHERE email IN ($1, $2))', ['root@test.com', 'normal@test.com']);
    });

    it('should generate content suggestions', async () => {
      const response = await request(app)
        .post('/api/v1/generation/generate')
        .set('Authorization', `Bearer ${root_token}`)
        .send({
          prompt: 'Announce our new dark mode feature',
          channel_ids: [x_channel_id],
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
          channel_ids: [x_channel_id, linkedin_channel_id],
          constraints: {
            suggestions_per_channel: 3
          }
        });

      expect(response.status).toBe(201);
      expect(response.body.data.suggestions.length).toBe(6); // 3 suggestions × 2 channels
    });

    it('should require prompt', async () => {
      const response = await request(app)
        .post('/api/v1/generation/generate')
        .set('Authorization', `Bearer ${root_token}`)
        .send({
          channel_ids: [x_channel_id]
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
          channel_ids: [x_channel_id]
        });
      session_id = response.body.data.session.id;
    });

    afterEach(async () => {
      await db_pool.query('DELETE FROM generation_suggestions');
      await db_pool.query('DELETE FROM generation_sessions WHERE owner_principal_id IN (SELECT id FROM users WHERE email IN ($1, $2))', ['root@test.com', 'normal@test.com']);
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
          channel_ids: [x_channel_id]
        });
      suggestion_id = gen_response.body.data.suggestions[0].id;
    });

    afterEach(async () => {
      await db_pool.query('DELETE FROM post_variants');
      await db_pool.query('DELETE FROM posts');
      await db_pool.query('DELETE FROM generation_suggestions');
      await db_pool.query('DELETE FROM generation_sessions WHERE owner_principal_id IN (SELECT id FROM users WHERE email IN ($1, $2))', ['root@test.com', 'normal@test.com']);
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

      expect(response.status).toBe(400);
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
          channel_ids: [x_channel_id]
        });
      session_id = response.body.data.session.id;
    });

    afterEach(async () => {
      await db_pool.query('DELETE FROM generation_suggestions');
      await db_pool.query('DELETE FROM generation_sessions WHERE owner_principal_id IN (SELECT id FROM users WHERE email IN ($1, $2))', ['root@test.com', 'normal@test.com']);
    });

    it('should delete generation session', async () => {
      const response = await request(app)
        .delete(`/api/v1/generation/sessions/${session_id}`)
        .set('Authorization', `Bearer ${root_token}`);

      expect(response.status).toBe(204);

      // Verify deletion
      const get_response = await request(app)
        .get(`/api/v1/generation/sessions/${session_id}`)
        .set('Authorization', `Bearer ${root_token}`);

      expect(get_response.status).toBe(404);
    });
  });
});
