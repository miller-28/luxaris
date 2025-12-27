const { createLuminara } = require('luminara');
const crypto = require('crypto');

class GoogleOAuthService {
    constructor(config, session_service, system_logger) {
        this.config = config;
        this.session_service = session_service;
        this.system_logger = system_logger;

        // Google OAuth 2.0 endpoints
        this.authorization_url = 'https://accounts.google.com/o/oauth2/v2/auth';
        this.token_url = 'https://oauth2.googleapis.com/token';
        this.userinfo_url = 'https://www.googleapis.com/oauth2/v2/userinfo';

        // OAuth scopes
        this.scopes = ['openid', 'email', 'profile'];

        // Initialize Luminara HTTP client
        this.http_client = createLuminara({
            timeout: 10000,
            retry: 2,
            retryStatusCodes: [408, 429, 500, 502, 503, 504]
        });
    }

    /**
     * Generate OAuth authorization URL
     * @returns {object} { url, state } - Authorization URL and CSRF state token
     */
    async generate_authorization_url() {
        // Generate random state for CSRF protection
        const state = crypto.randomBytes(32).toString('hex');

        // Store state in Redis with 5min TTL
        await this.session_service.set_oauth_state(
            state,
            { created_at: Date.now() },
            300 // 5 minutes
        );

        // Build authorization URL
        const params = new URLSearchParams({
            client_id: this.config.google_client_id,
            redirect_uri: this.config.google_redirect_uri,
            scope: this.scopes.join(' '),
            state: state,
            response_type: 'code',
            access_type: 'offline', // Request refresh token
            prompt: 'consent' // Force consent screen to get refresh token
        });

        const url = `${this.authorization_url}?${params.toString()}`;

        await this.system_logger.info(
            'GoogleOAuthService',
            'Generated authorization URL',
            { state }
        );

        return { url, state };
    }

    /**
     * Validate OAuth state parameter
     * @param {string} state - State parameter from callback
     * @returns {boolean} True if valid
     */
    async validate_state(state) {
        if (!state) {
            return false;
        }

        const cached_state = await this.session_service.get_oauth_state(state);
        
        if (!cached_state) {
            await this.system_logger.warning(
                'GoogleOAuthService',
                'Invalid or expired OAuth state',
                { state }
            );
            return false;
        }

        // Delete state after validation (one-time use)
        await this.session_service.delete_oauth_state(state);

        return true;
    }

    /**
     * Exchange authorization code for access token
     * @param {string} code - Authorization code from Google
     * @returns {object} Token response with access_token, refresh_token, etc.
     */
    async exchange_code_for_token(code) {
        try {
            const form_data = {
                code: code,
                client_id: this.config.google_client_id,
                client_secret: this.config.google_client_secret,
                redirect_uri: this.config.google_redirect_uri,
                grant_type: 'authorization_code'
            };

            const response = await this.http_client.postForm(this.token_url, form_data);

            await this.system_logger.info(
                'GoogleOAuthService',
                'Successfully exchanged code for token',
                { has_refresh_token: !!response.data.refresh_token }
            );

            return {
                access_token: response.data.access_token,
                refresh_token: response.data.refresh_token,
                expires_in: response.data.expires_in,
                scope: response.data.scope,
                token_type: response.data.token_type
            };
        } catch (error) {
            await this.system_logger.error(
                'GoogleOAuthService',
                'Failed to exchange code for token',
                error,
                { error_message: error.message }
            );
            const err = new Error('Failed to exchange authorization code');
            err.status_code = 502;
            err.error_code = 'OAUTH_TOKEN_EXCHANGE_FAILED';
            err.severity = 'error';
            throw err;
        }
    }

    /**
     * Fetch user information from Google
     * @param {string} access_token - Google access token
     * @returns {object} User information (id, email, name, picture)
     */
    async fetch_user_info(access_token) {
        try {
            const response = await this.http_client.get(this.userinfo_url, {
                headers: {
                    'Authorization': `Bearer ${access_token}`
                }
            });

            const user_info = {
                provider_user_id: response.data.id,
                email: response.data.email,
                name: response.data.name,
                avatar_url: response.data.picture,
                email_verified: response.data.verified_email || false
            };

            await this.system_logger.info(
                'GoogleOAuthService',
                'Successfully fetched user info',
                { email: user_info.email, verified: user_info.email_verified }
            );

            return user_info;
        } catch (error) {
            await this.system_logger.error(
                'GoogleOAuthService',
                'Failed to fetch user info',
                error,
                { error_message: error.message }
            );
            const err = new Error('Failed to fetch user information from Google');
            err.status_code = 502;
            err.error_code = 'OAUTH_USER_INFO_FETCH_FAILED';
            err.severity = 'error';
            throw err;
        }
    }

    /**
     * Complete OAuth flow (exchange code and fetch user info)
     * @param {string} code - Authorization code
     * @param {string} state - State parameter for validation
     * @returns {object} { token_data, user_info }
     */
    async complete_oauth_flow(code, state) {
        // Validate state
        const is_valid_state = await this.validate_state(state);
        if (!is_valid_state) {
            const error = new Error('Invalid OAuth state parameter');
            error.status_code = 400;
            error.error_code = 'INVALID_OAUTH_STATE';
            error.severity = 'warning';
            throw error;
        }

        // Exchange code for token
        const token_data = await this.exchange_code_for_token(code);

        // Fetch user info
        const user_info = await this.fetch_user_info(token_data.access_token);

        return {
            token_data,
            user_info
        };
    }

    /**
     * Refresh access token using refresh token
     * @param {string} refresh_token - Refresh token
     * @returns {object} New token data
     */
    async refresh_access_token(refresh_token) {
        try {
            const form_data = {
                refresh_token: refresh_token,
                client_id: this.config.google_client_id,
                client_secret: this.config.google_client_secret,
                grant_type: 'refresh_token'
            };

            const response = await this.http_client.postForm(this.token_url, form_data);

            await this.system_logger.info(
                'GoogleOAuthService',
                'Successfully refreshed access token',
                {}
            );

            return {
                access_token: response.data.access_token,
                expires_in: response.data.expires_in,
                scope: response.data.scope,
                token_type: response.data.token_type
            };
        } catch (error) {
            await this.system_logger.error(
                'GoogleOAuthService',
                'Failed to refresh access token',
                error,
                { error_message: error.message }
            );
            const err = new Error('Failed to refresh access token');
            err.status_code = 502;
            err.error_code = 'OAUTH_TOKEN_REFRESH_FAILED';
            err.severity = 'error';
            throw err;
        }
    }
}

module.exports = GoogleOAuthService;
