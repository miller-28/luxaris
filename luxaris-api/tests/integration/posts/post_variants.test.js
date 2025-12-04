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

describe('Post Variants Integration Tests', () => {
  let db_pool;
  let server;
  let app;
  let auth_service;
  let root_token;
  let normal_token;
  let posts_domain;
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

    // Create server with both post and variant routes
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

    const variant_routes = posts_domain.create_post_variant_routes({
      post_variant_service: posts_domain.post_variant_service,
      auth_middleware,
      error_handler: (err, req, res, next) => {
        console.error('Test error:', err);
        res.status(500).json({ errors: [{ error_code: 'INTERNAL_ERROR', error_description: err.message, error_severity: 'error' }] });
      }
    });
    server.register_routes('/api/v1', variant_routes);
    
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
    await db_pool.query('DELETE FROM post_variants');
    await db_pool.query('DELETE FROM posts');
    await db_pool.query("DELETE FROM users WHERE email IN ('root@test.com', 'normal@test.com')");
    await db_pool.end();
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
      const fake_channel_id = '00000000-0000-0000-0000-000000000000';
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
      const fake_id = '00000000-0000-0000-0000-000000000000';
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

      // Verify it's deleted
      const get_response = await request(app)
        .get(`/api/v1/variants/${test_variant_id}`)
        .set('Authorization', `Bearer ${root_token}`);
      
      expect(get_response.status).toBe(404);
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
