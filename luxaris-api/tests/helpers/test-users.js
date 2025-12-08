const request = require('supertest');

/**
 * Test Users Helper
 * Centralized user creation and authentication for integration tests
 */
class TestUsers {
    constructor(app, db_pool) {
        this.app = app;
        this.db_pool = db_pool;
    }

    /**
     * Create a root user (first user in system)
     * @param {Object} options - User options
     * @param {string} options.email - User email (default: 'root@test.com')
     * @param {string} options.password - User password (default: 'SecurePassword123!')
     * @param {string} options.name - User name (default: 'Root User')
     * @param {string} options.timezone - User timezone (default: 'UTC')
     * @returns {Promise<Object>} { user, access_token, refresh_token, user_id }
     */
    async create_root_user(options = {}) {
        const {
            email = 'root@test.com',
            password = 'SecurePassword123!',
            name = 'Root User',
            timezone = 'UTC'
        } = options;

        const response = await request(this.app)
            .post('/api/v1/auth/register')
            .send({ email, password, name, timezone });

        if (response.status !== 201) {
            throw new Error(`Root user creation failed: ${JSON.stringify(response.body)}`);
        }

        return {
            user: response.body.user,
            access_token: response.body.access_token,
            refresh_token: response.body.refresh_token,
            user_id: response.body.user.id
        };
    }

    /**
     * Create a normal user (non-root)
     * @param {Object} options - User options
     * @param {string} options.email - User email (default: 'user@test.com')
     * @param {string} options.password - User password (default: 'SecurePassword123!')
     * @param {string} options.name - User name (default: 'Normal User')
     * @param {string} options.timezone - User timezone (default: 'UTC')
     * @param {boolean} options.approve - Auto-approve user (default: false)
     * @returns {Promise<Object>} { user, access_token, refresh_token, user_id }
     */
    async create_normal_user(options = {}) {
        const {
            email = 'user@test.com',
            password = 'SecurePassword123!',
            name = 'Normal User',
            timezone = 'UTC',
            approve = false
        } = options;

        const response = await request(this.app)
            .post('/api/v1/auth/register')
            .send({ email, password, name, timezone });

        if (response.status !== 201) {
            throw new Error(`User creation failed: ${JSON.stringify(response.body)}`);
        }

        const user_id = response.body.user.id;

        // Auto-approve if requested
        if (approve) {
            await this.db_pool.query(
                "UPDATE users SET status = 'active' WHERE id = $1",
                [user_id]
            );
        }

        return {
            user: response.body.user,
            access_token: response.body.access_token,
            refresh_token: response.body.refresh_token,
            user_id
        };
    }

    /**
     * Login an existing user
     * @param {string} email - User email
     * @param {string} password - User password
     * @returns {Promise<Object>} { user, access_token, refresh_token }
     */
    async login_user(email, password) {
        const response = await request(this.app)
            .post('/api/v1/auth/login')
            .send({ email, password });

        if (response.status !== 200) {
            throw new Error(`Login failed: ${JSON.stringify(response.body)}`);
        }

        return {
            user: response.body.user,
            access_token: response.body.access_token,
            refresh_token: response.body.refresh_token
        };
    }

    /**
     * Create root and normal users for testing
     * @param {Object} options - Options for both users
     * @param {Object} options.root - Root user options
     * @param {Object} options.normal - Normal user options
     * @param {boolean} options.approve_normal - Auto-approve normal user (default: true)
     * @returns {Promise<Object>} { root: {...}, normal: {...} }
     */
    async create_user_pair(options = {}) {
        const {
            root = {},
            normal = {},
            approve_normal = true
        } = options;

        const root_user = await this.create_root_user({
            email: 'root@test.com',
            password: 'SecurePassword123!',
            name: 'Root User',
            ...root
        });

        const normal_user = await this.create_normal_user({
            email: 'normal@test.com',
            password: 'SecurePassword123!',
            name: 'Normal User',
            approve: approve_normal,
            ...normal
        });

        // If normal user was approved, login to get fresh token
        if (approve_normal) {
            const login_result = await this.login_user(
                normal.email || 'normal@test.com',
                normal.password || 'SecurePassword123!'
            );
            normal_user.access_token = login_result.access_token;
            normal_user.refresh_token = login_result.refresh_token;
        }

        return {
            root: root_user,
            normal: normal_user
        };
    }

    /**
     * Approve a pending user
     * @param {number} user_id - User ID to approve
     */
    async approve_user(user_id) {
        await this.db_pool.query(
            "UPDATE luxaris.users SET status = 'active' WHERE id = $1",
            [user_id]
        );
    }

    /**
     * Make a user root (admin)
     * @param {number} user_id - User ID to make root
     */
    async make_user_root(user_id) {
        await this.db_pool.query(
            "UPDATE luxaris.users SET is_root = true, status = 'active' WHERE id = $1",
            [user_id]
        );
    }

    /**
     * Create a user with dynamic email (using timestamp)
     * @param {string} prefix - Email prefix (e.g., 'testuser')
     * @param {Object} options - User options
     * @returns {Promise<Object>} { user, access_token, refresh_token, user_id, email }
     */
    async create_user_with_unique_email(prefix, options = {}) {
        const {
            password = 'SecurePassword123!',
            name = 'Test User',
            timezone = 'America/New_York',
            make_root = false
        } = options;

        const email = `${prefix}-${Date.now()}@test.com`;

        const response = await request(this.app)
            .post('/api/v1/auth/register')
            .send({ email, password, name, timezone });

        if (response.status !== 201) {
            throw new Error(`User creation failed: ${JSON.stringify(response.body)}`);
        }

        const user_id = response.body.user.id;

        // Make root if requested
        if (make_root) {
            await this.make_user_root(user_id);
        }

        return {
            user: response.body.user,
            access_token: response.body.access_token,
            refresh_token: response.body.refresh_token,
            user_id,
            email
        };
    }

    /**
     * Quick helper to create root user with standard settings
     * @param {string} prefix - Email prefix (e.g., 'root-gen')
     * @returns {Promise<Object>} { user_id, token }
     */
    async create_quick_root_user(prefix) {
        const result = await this.create_user_with_unique_email(prefix, {
            password: 'SecurePassword123!',
            name: 'Root User',
            timezone: 'America/New_York',
            make_root: true
        });
        return {
            user_id: result.user_id,
            token: result.access_token
        };
    }

    /**
     * Quick helper to create normal user with standard settings
     * @param {string} prefix - Email prefix (e.g., 'normal-gen')
     * @returns {Promise<Object>} { user_id, token }
     */
    async create_quick_normal_user(prefix) {
        const result = await this.create_user_with_unique_email(prefix, {
            password: 'SecurePassword123!',
            name: 'Normal User',
            timezone: 'America/New_York'
        });
        return {
            user_id: result.user_id,
            token: result.access_token
        };
    }
}

module.exports = TestUsers;
