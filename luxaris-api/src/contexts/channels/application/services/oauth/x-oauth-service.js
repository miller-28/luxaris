const { createLuminara } = require('luminara');
const crypto = require('crypto');

/**
 * X (Twitter) OAuth Service
 * 
 * Handles OAuth 2.0 flow for X platform (formerly Twitter)
 * Documentation: https://developer.twitter.com/en/docs/authentication/oauth-2-0/authorization-code
 */
class XOAuthService {

    constructor(config, cache_service, credentials_service, system_logger) {
        this.config = config;
        this.cache_service = cache_service;
        this.credentials_service = credentials_service;
        this.logger = system_logger;
        this.logger_name = 'XOAuthService';

        // X OAuth 2.0 endpoints
        this.authorization_url = 'https://twitter.com/i/oauth2/authorize';
        this.token_url = 'https://api.twitter.com/2/oauth2/token';
        this.userinfo_url = 'https://api.twitter.com/2/users/me';

        // OAuth scopes for posting content
        this.scopes = [
            'tweet.read',
            'tweet.write',
            'users.read',
            'offline.access' // For refresh token
        ];

        // Initialize HTTP client
        this.http_client = createLuminara({
            timeout: 10000,
            retry: 2,
            retryStatusCodes: [408, 429, 500, 502, 503, 504]
        });
    }

    /**
     * Generate OAuth authorization URL
     * @param {number} channel_id - Channel ID
     * @param {number} user_id - User ID
     * @returns {object} { url, state, code_verifier }
     */
    async generate_authorization_url(channel_id, user_id) {
        // Get credentials from database
        const credentials = await this.credentials_service.get_credentials(channel_id);
        
        if (!credentials) {
            throw new Error('OAuth credentials not configured for this channel');
        }

        // Generate random state for CSRF protection
        const state = crypto.randomBytes(32).toString('hex');

        // Generate PKCE code verifier and challenge (required by X OAuth 2.0)
        const code_verifier = this._generate_code_verifier();
        const code_challenge = this._generate_code_challenge(code_verifier);

        // Store state and code_verifier in cache
        await this.cache_service.set(
            `oauth:state:${state}`,
            {
                channel_id,
                user_id,
                provider: 'x',
                code_verifier,
                created_at: Date.now()
            },
            300 // 5 minutes TTL
        );

        // Build authorization URL (redirect_uri from env, credentials from DB)
        const params = new URLSearchParams({
            response_type: 'code',
            client_id: credentials.client_id,
            redirect_uri: this.config.x_redirect_uri,
            scope: this.scopes.join(' '),
            state: state,
            code_challenge: code_challenge,
            code_challenge_method: 'S256'
        });

        const url = `${this.authorization_url}?${params.toString()}`;

        await this.logger.info(this.logger_name, 'Generated authorization URL', {
            channel_id,
            user_id,
            state
        });

        return { url, state };
    }

    /**
     * Validate OAuth state parameter
     * @param {string} state - State parameter from callback
     * @returns {object|null} State metadata (including code_verifier) or null if invalid
     */
    async validate_state(state) {
        if (!state) {
            return null;
        }

        const cached_state = await this.cache_service.get(`oauth:state:${state}`);
        
        if (!cached_state) {
            await this.logger.warning(this.logger_name, 'Invalid or expired OAuth state', {
                state
            });
            return null;
        }

        // Delete state after validation (one-time use)
        await this.cache_service.delete(`oauth:state:${state}`);

        return cached_state;
    }

    /**
     * Exchange authorization code for access token
     * @param {string} code - Authorization code from X
     * @param {string} code_verifier - PKCE code verifier
     * @param {number} channel_id - Channel ID to get credentials
     * @returns {object} Token response
     */
    async exchange_code_for_token(code, code_verifier, channel_id) {
        // Get credentials from database
        const credentials = await this.credentials_service.get_credentials(channel_id);
        
        if (!credentials) {
            throw new Error('OAuth credentials not configured for this channel');
        }

        try {
            const params = new URLSearchParams({
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: this.config.x_redirect_uri,
                code_verifier: code_verifier,
                client_id: credentials.client_id
            });

            // X requires Basic Auth with client credentials
            const auth_header = Buffer.from(
                `${credentials.client_id}:${credentials.client_secret}`
            ).toString('base64');

            const response = await this.http_client.post(
                this.token_url,
                params.toString(),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Authorization': `Basic ${auth_header}`
                    }
                }
            );

            await this.logger.info(this.logger_name, 'Token exchange successful');

            return response.data;
        } catch (error) {
            await this.logger.error(this.logger_name, 'Token exchange failed', {
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Get user profile information
     * @param {string} access_token - X access token
     * @returns {object} User profile data
     */
    async get_user_profile(access_token) {
        try {
            const response = await this.http_client.get(this.userinfo_url, {
                headers: {
                    'Authorization': `Bearer ${access_token}`
                },
                params: {
                    'user.fields': 'id,name,username'
                }
            });

            return response.data.data;
        } catch (error) {
            await this.logger.error(this.logger_name, 'Failed to fetch user profile', {
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Refresh access token using refresh token
     * @param {string} refresh_token - Refresh token
     * @param {number} channel_id - Channel ID to get credentials
     * @returns {object} New token response
     */
    async refresh_access_token(refresh_token, channel_id) {
        // Get credentials from database
        const credentials = await this.credentials_service.get_credentials(channel_id);
        
        if (!credentials) {
            throw new Error('OAuth credentials not configured for this channel');
        }

        try {
            const params = new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: refresh_token,
                client_id: credentials.client_id
            });

            const auth_header = Buffer.from(
                `${credentials.client_id}:${credentials.client_secret}`
            ).toString('base64');

            const response = await this.http_client.post(
                this.token_url,
                params.toString(),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Authorization': `Basic ${auth_header}`
                    }
                }
            );

            await this.logger.info(this.logger_name, 'Token refresh successful');

            return response.data;
        } catch (error) {
            await this.logger.error(this.logger_name, 'Token refresh failed', {
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Test connection by fetching user profile
     * @param {object} connection - Connection object with auth_state
     * @returns {object} Test result
     */
    async test_connection(connection) {
        try {
            const auth_state = connection.auth_state;
            
            if (!auth_state || !auth_state.access_token) {
                const error = new Error('No access token found in connection');
                error.error_code = 'INVALID_TOKEN';
                throw error;
            }

            // Fetch user profile to verify token is valid
            const response = await this.http_client.get(this.userinfo_url, {
                headers: {
                    'Authorization': `Bearer ${auth_state.access_token}`
                },
                query: {
                    'user.fields': 'id,name,username'
                }
            });

            await this.logger.info(this.logger_name, 'Connection test successful', {
                connection_id: connection.id,
                user_id: response.data.data.id
            });

            return {
                success: true,
                message: 'X (Twitter) connection is active and working',
                user_info: {
                    id: response.data.data.id,
                    name: response.data.data.name,
                    username: response.data.data.username
                }
            };
        } catch (error) {
            await this.logger.error(this.logger_name, 'Connection test failed', {
                connection_id: connection.id,
                error: error.message,
                status: error.status
            });

            // Handle expired/invalid token
            if (error.status === 401) {
                const token_error = new Error('X (Twitter) access token has expired or is invalid');
                token_error.error_code = 'TOKEN_EXPIRED';
                throw token_error;
            }

            throw error;
        }
    }

    /**
     * Generate PKCE code verifier
     * @private
     */
    _generate_code_verifier() {
        return crypto.randomBytes(32).toString('base64url');
    }

    /**
     * Generate PKCE code challenge from verifier
     * @private
     */
    _generate_code_challenge(verifier) {
        return crypto
            .createHash('sha256')
            .update(verifier)
            .digest('base64url');
    }

    /**
     * Check if configuration is valid
     * @param {number} channel_id - Channel ID
     * @returns {boolean}
     */
    async is_configured(channel_id) {
        const has_redirect_uri = !!this.config.x_redirect_uri;
        const has_credentials = await this.credentials_service.has_credentials(channel_id);
        
        return has_redirect_uri && has_credentials;
    }
}

module.exports = XOAuthService;
