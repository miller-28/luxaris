const { createLuminara } = require('luminara');
const crypto = require('crypto');

/**
 * LinkedIn OAuth Service
 * 
 * Handles OAuth 2.0 flow for LinkedIn platform
 * Documentation: https://learn.microsoft.com/en-us/linkedin/shared/authentication/authentication
 */
class LinkedInOAuthService {

    constructor(config, cache_service, credentials_service, system_logger) {
        this.config = config;
        this.cache_service = cache_service;
        this.credentials_service = credentials_service;
        this.logger = system_logger;
        this.logger_name = 'LinkedInOAuthService';

        // LinkedIn OAuth 2.0 endpoints
        this.authorization_url = 'https://www.linkedin.com/oauth/v2/authorization';
        this.token_url = 'https://www.linkedin.com/oauth/v2/accessToken';
        this.userinfo_url = 'https://api.linkedin.com/v2/userinfo';

        // OAuth scopes for posting content
        this.scopes = [
            'openid',
            'profile',
            'email',
            'w_member_social' // Post, comment, and engage with content
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
     * @returns {object} { url, state }
     */
    async generate_authorization_url(channel_id, user_id) {
        // Get credentials from database
        const credentials = await this.credentials_service.get_credentials(channel_id);
        
        if (!credentials) {
            throw new Error('OAuth credentials not configured for this channel');
        }
        // Generate random state for CSRF protection
        const state = crypto.randomBytes(32).toString('hex');

        // Store state in cache with metadata
        await this.cache_service.set(
            `oauth:state:${state}`,
            {
                channel_id,
                user_id,
                provider: 'linkedin',
                created_at: Date.now()
            },
            300 // 5 minutes TTL
        );

        // Build authorization URL (redirect_uri from env, credentials from DB)
        const params = new URLSearchParams({
            response_type: 'code',
            client_id: credentials.client_id,
            redirect_uri: this.config.linkedin_redirect_uri,
            state: state,
            scope: this.scopes.join(' ')
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
     * @returns {object|null} State metadata or null if invalid
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
     * @param {string} code - Authorization code from LinkedIn
     * @param {number} channel_id - Channel ID to get credentials
     * @returns {object} Token response
     */
    async exchange_code_for_token(code, channel_id) {
        // Get credentials from database
        const credentials = await this.credentials_service.get_credentials(channel_id);
        
        if (!credentials) {
            throw new Error('OAuth credentials not configured for this channel');
        }

        try {
            const params = new URLSearchParams({
                grant_type: 'authorization_code',
                code: code,
                client_id: credentials.client_id,
                client_secret: credentials.client_secret,
                redirect_uri: this.config.linkedin_redirect_uri
            });

            const response = await this.http_client.post(
                this.token_url,
                params.toString(),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
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
     * @param {string} access_token - LinkedIn access token
     * @returns {object} User profile data
     */
    async get_user_profile(access_token) {
        try {
            const response = await this.http_client.get(this.userinfo_url, {
                headers: {
                    'Authorization': `Bearer ${access_token}`
                }
            });

            return response.data;
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
                client_id: credentials.client_id,
                client_secret: credentials.client_secret
            });

            const response = await this.http_client.post(
                this.token_url,
                params.toString(),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
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
                }
            });

            await this.logger.info(this.logger_name, 'Connection test successful', {
                connection_id: connection.id,
                user_id: response.data.sub
            });

            return {
                success: true,
                message: 'LinkedIn connection is active and working',
                user_info: {
                    id: response.data.sub,
                    name: response.data.name,
                    email: response.data.email
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
                const token_error = new Error('LinkedIn access token has expired or is invalid');
                token_error.error_code = 'TOKEN_EXPIRED';
                throw token_error;
            }

            throw error;
        }
    }

    /**
     * Check if configuration is valid
     * @param {number} channel_id - Channel ID
     * @returns {boolean}
     */
    async is_configured(channel_id) {
        const has_redirect_uri = !!this.config.linkedin_redirect_uri;
        const has_credentials = await this.credentials_service.has_credentials(channel_id);
        
        return has_redirect_uri && has_credentials;
    }
}

module.exports = LinkedInOAuthService;
