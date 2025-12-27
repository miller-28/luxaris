/**
 * Redis-based Session Service
 * Provides session storage and management using Redis
 */
class SessionService {
    
    constructor(redis_client) {
        this.redis = redis_client;
        this.session_prefix = 'session';
        this.default_ttl = parseInt(process.env.SESSION_TTL) || 86400; // From ENV or fallback to 24 hours in seconds
    }

    /**
     * Detect client type from custom header
     * @param {string} client_type_header - X-Client-Type header value
     * @returns {string} Client type (site, other)
     */
    _detect_client_type(client_type_header) {
        // If header matches our deterministic token, it's the site
        if (client_type_header === 'luxaris-site') {
            return 'site';
        }
        // Everything else is 'other'
        return 'other';
    }

    /**
     * Build session key with client type
     * @param {string} session_id - Session ID
     * @param {string} client_type - Client type
     * @returns {string} Full session key
     */
    _build_session_key(session_id, client_type = 'other') {
        return `sessions:${client_type}:${session_id}`;
    }

    /**
     * Create or update a session
     * @param {string} session_id - Session ID
     * @param {Object} session_data - Session data to store
     * @param {number} ttl - Time to live in seconds (default: 24 hours)
     * @returns {Promise<boolean>} Success status
     */
    async set(session_id, session_data, ttl = null) {
        try {
            // Detect client type from custom header
            const client_type = this._detect_client_type(session_data.client_type_header);
            const key = this._build_session_key(session_id, client_type);
            const expiration = ttl || this.default_ttl;

            // Store session data as Redis hash for better structure
            await this.redis.hSet(key, {
                user_id: session_data.user_id?.toString() || '',
                username: session_data.username || '',
                email: session_data.email || '',
                roles: JSON.stringify(session_data.roles || []),
                permissions: JSON.stringify(session_data.permissions || []),
                created_at: session_data.created_at || Date.now().toString(),
                last_activity: Date.now().toString(),
                ip_address: session_data.ip_address || '',
                user_agent: session_data.user_agent || '',
                client_type: client_type
            });

            // Set expiration
            await this.redis.expire(key, expiration);

            return true;
        } catch (error) {
            console.error('Session set error:', error);
            return false;
        }
    }

    /**
     * Get session data
     * @param {string} session_id - Session ID
     * @returns {Promise<Object|null>} Session data or null if not found
     */
    async get(session_id) {
        try {
            // Try to find session with any client type
            const client_types = ['site', 'other'];
            
            for (const client_type of client_types) {
                const key = this._build_session_key(session_id, client_type);
                const session = await this.redis.hGetAll(key);

                // If session exists with this client type, return it
                if (session && Object.keys(session).length > 0) {
                    // Parse JSON fields
                    return {
                        user_id: parseInt(session.user_id) || null,
                        username: session.username,
                        email: session.email,
                        roles: JSON.parse(session.roles || '[]'),
                        permissions: JSON.parse(session.permissions || '[]'),
                        created_at: parseInt(session.created_at),
                        last_activity: parseInt(session.last_activity),
                        ip_address: session.ip_address,
                        user_agent: session.user_agent,
                        client_type: session.client_type
                    };
                }
            }

            return null;
        } catch (error) {
            console.error('Session get error:', error);
            return null;
        }
    }

    /**
     * Update session activity timestamp
     * @param {string} session_id - Session ID
     * @param {number} ttl - Refresh TTL (default: 24 hours)
     * @returns {Promise<boolean>} Success status
     */
    async touch(session_id, ttl = null) {
        try {
            const expiration = ttl || this.default_ttl;
            
            // Find session with any client type
            const client_types = ['site', 'other'];
            
            for (const client_type of client_types) {
                const key = this._build_session_key(session_id, client_type);
                const exists = await this.redis.exists(key);
                
                if (exists) {
                    // Update last activity
                    await this.redis.hSet(key, 'last_activity', Date.now().toString());
                    
                    // Refresh expiration
                    await this.redis.expire(key, expiration);
                    
                    return true;
                }
            }

            return false;
        } catch (error) {
            console.error('Session touch error:', error);
            return false;
        }
    }

    /**
     * Delete session (logout)
     * @param {string} session_id - Session ID
     * @returns {Promise<boolean>} Success status
     */
    async delete(session_id) {
        try {
            // Delete session with any client type
            const client_types = ['site', 'other'];
            
            for (const client_type of client_types) {
                const key = this._build_session_key(session_id, client_type);
                await this.redis.del(key);
            }
            
            return true;
        } catch (error) {
            console.error('Session delete error:', error);
            return false;
        }
    }

    /**
     * Delete all sessions for a user (logout from all devices)
     * @param {number} user_id - User ID
     * @returns {Promise<number>} Number of sessions deleted
     */
    async delete_all_for_user(user_id) {
        try {
            // Find all session keys for this user
            const pattern = `${this.session_prefix}*`;
            const keys = await this.redis.keys(pattern);

            let deleted_count = 0;

            for (const key of keys) {
                const session = await this.redis.hGetAll(key);
                if (session.user_id === user_id.toString()) {
                    await this.redis.del(key);
                    deleted_count++;
                }
            }

            return deleted_count;
        } catch (error) {
            console.error('Session delete_all_for_user error:', error);
            return 0;
        }
    }

    /**
     * Get time to live for session
     * @param {string} session_id - Session ID
     * @returns {Promise<number>} TTL in seconds, -1 if no expiration, -2 if not found
     */
    async get_ttl(session_id) {
        try {
            // Find session with any client type
            const client_types = ['site', 'other'];
            
            for (const client_type of client_types) {
                const key = this._build_session_key(session_id, client_type);
                const ttl = await this.redis.ttl(key);
                if (ttl !== -2) { // -2 means key doesn't exist
                    return ttl;
                }
            }
            
            return -2;
        } catch (error) {
            console.error('Session get_ttl error:', error);
            return -2;
        }
    }

    /**
     * Check if session exists
     * @param {string} session_id - Session ID
     * @returns {Promise<boolean>} True if exists
     */
    async exists(session_id) {
        try {
            // Check if session exists with any client type
            const client_types = ['site', 'other'];
            
            for (const client_type of client_types) {
                const key = this._build_session_key(session_id, client_type);
                const result = await this.redis.exists(key);
                if (result === 1) {
                    return true;
                }
            }
            
            return false;
        } catch (error) {
            console.error('Session exists error:', error);
            return false;
        }
    }

    /**
     * Store refresh token
     * @param {string} token - Refresh token
     * @param {number} user_id - User ID
     * @param {number} ttl - Time to live in seconds (default: 7 days)
     * @returns {Promise<boolean>} Success status
     */
    async set_refresh_token(token, user_id, ttl = 604800) {
        try {
            const key = `refresh_token:${token}`;
            await this.redis.set(key, user_id.toString(), { EX: ttl });
            return true;
        } catch (error) {
            console.error('Refresh token set error:', error);
            return false;
        }
    }

    /**
     * Get user ID from refresh token
     * @param {string} token - Refresh token
     * @returns {Promise<number|null>} User ID or null if not found
     */
    async get_refresh_token(token) {
        try {
            const key = `refresh_token:${token}`;
            const user_id = await this.redis.get(key);
            return user_id ? parseInt(user_id) : null;
        } catch (error) {
            console.error('Refresh token get error:', error);
            return null;
        }
    }

    /**
     * Delete refresh token
     * @param {string} token - Refresh token
     * @returns {Promise<boolean>} Success status
     */
    async delete_refresh_token(token) {
        try {
            const key = `refresh_token:${token}`;
            await this.redis.del(key);
            return true;
        } catch (error) {
            console.error('Refresh token delete error:', error);
            return false;
        }
    }

    /**
     * Store OAuth state for CSRF protection
     * @param {string} state - OAuth state
     * @param {Object} data - State data
     * @param {number} ttl - Time to live in seconds (default: 10 minutes)
     * @returns {Promise<boolean>} Success status
     */
    async set_oauth_state(state, data, ttl = 600) {
        try {
            const key = `oauth:state:${state}`;
            await this.redis.set(key, JSON.stringify(data), { EX: ttl });
            return true;
        } catch (error) {
            console.error('OAuth state set error:', error);
            return false;
        }
    }

    /**
     * Get OAuth state data
     * @param {string} state - OAuth state
     * @returns {Promise<Object|null>} State data or null
     */
    async get_oauth_state(state) {
        try {
            const key = `oauth:state:${state}`;
            const data = await this.redis.get(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('OAuth state get error:', error);
            return null;
        }
    }

    /**
     * Delete OAuth state
     * @param {string} state - OAuth state
     * @returns {Promise<boolean>} Success status
     */
    async delete_oauth_state(state) {
        try {
            const key = `oauth:state:${state}`;
            await this.redis.del(key);
            return true;
        } catch (error) {
            console.error('OAuth state delete error:', error);
            return false;
        }
    }
}

module.exports = SessionService;
