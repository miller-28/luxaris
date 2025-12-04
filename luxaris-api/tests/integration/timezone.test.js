/**
 * Timezone Handling Integration Tests
 * 
 * Tests for timezone defaults, validation, and UTC storage
 */

const TestServer = require('../helpers/test-server');
const request = require('supertest');
const { create_database_pool } = require('../../src/config/database');

describe('Timezone Handling', () => {
  let test_server;
  let app;
  let db_pool;
  let user_id;

  beforeAll(async () => {
    db_pool = create_database_pool();
    test_server = new TestServer();
    app = await test_server.start();
  });

  afterAll(async () => {
    await test_server.stop();
    await db_pool.end();
  });

  afterEach(async () => {
    // Cleanup test data
    if (user_id) {
      await db_pool.query('DELETE FROM users WHERE id = $1', [user_id]);
      user_id = null;
    }
  });

  describe('User Timezone Defaults', () => {
    it('should default user timezone to UTC when not provided', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: `tz-test-${Date.now()}@example.com`,
          password: 'SecurePass123!',
          name: 'Test User'
          // Note: timezone NOT provided
        })
        .expect(201);

      user_id = response.body.user.id;

      const result = await db_pool.query(
        'SELECT timezone FROM users WHERE id = $1',
        [user_id]
      );

      expect(result.rows[0].timezone).toBe('UTC');
    });

    it('should accept custom timezone during user creation', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: `tz-test-${Date.now()}@example.com`,
          password: 'SecurePass123!',
          name: 'Test User',
          timezone: 'America/New_York'
        })
        .expect(201);

      user_id = response.body.user.id;

      const result = await db_pool.query(
        'SELECT timezone FROM users WHERE id = $1',
        [user_id]
      );

      expect(result.rows[0].timezone).toBe('America/New_York');
    });

    it('should store timestamps as UTC with timezone', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: `tz-test-${Date.now()}@example.com`,
          password: 'SecurePass123!',
          name: 'Test User',
          timezone: 'Europe/London'
        })
        .expect(201);

      user_id = response.body.user.id;

      const result = await db_pool.query(
        'SELECT created_at, updated_at FROM users WHERE id = $1',
        [user_id]
      );

      // Verify timestamps are returned with timezone info
      expect(result.rows[0].created_at).toBeInstanceOf(Date);
      expect(result.rows[0].updated_at).toBeInstanceOf(Date);

      // Verify they're stored as TIMESTAMPTZ (check column type)
      const type_check = await db_pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name IN ('created_at', 'updated_at')
      `);

      expect(type_check.rows).toHaveLength(2);
      type_check.rows.forEach(row => {
        expect(row.data_type).toBe('timestamp with time zone');
      });
    });
  });

  describe('Timestamp Consistency', () => {
    it('should use TIMESTAMPTZ for all timestamp columns', async () => {
      // Check critical tables have proper timestamp columns
      const tables_to_check = [
        'users',
        'sessions',
        'system_events',
        'system_logs'
      ];

      for (const table of tables_to_check) {
        const result = await db_pool.query(`
          SELECT column_name, data_type
          FROM information_schema.columns
          WHERE table_name = $1
          AND column_name IN ('created_at', 'updated_at', 'timestamp')
          AND data_type != 'timestamp with time zone'
        `, [table]);

        // Should have no columns with plain TIMESTAMP
        expect(result.rows).toHaveLength(0);
      }
    });
  });
});
