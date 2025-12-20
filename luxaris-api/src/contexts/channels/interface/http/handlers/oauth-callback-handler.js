/**
 * OAuth Callback Handler
 * 
 * Handles OAuth callback requests from external providers (LinkedIn, X, etc.)
 */
class OAuthCallbackHandler {

    constructor(
        channel_connection_service,
        linkedin_oauth_service,
        x_oauth_service,
        config
    ) {
        this.channel_connection_service = channel_connection_service;
        this.linkedin_oauth_service = linkedin_oauth_service;
        this.x_oauth_service = x_oauth_service;
        this.config = config;
    }

    /**
     * GET /api/v1/channels/oauth/linkedin/callback
     * LinkedIn OAuth callback handler
     */
    async linkedin_callback(req, res, next) {
        try {
            const { code, state, error: oauth_error } = req.query;

            // Handle OAuth errors from LinkedIn
            if (oauth_error) {
                return res.redirect(
                    `${this.config.cors_origin}/dashboard/channels/connections?error=oauth_denied`
                );
            }

            if (!code || !state) {
                return res.redirect(
                    `${this.config.cors_origin}/dashboard/channels/connections?error=invalid_callback`
                );
            }

            // Validate state and get metadata
            const state_data = await this.linkedin_oauth_service.validate_state(state);
            if (!state_data) {
                return res.redirect(
                    `${this.config.cors_origin}/dashboard/channels/connections?error=invalid_state`
                );
            }

            // Exchange code for tokens (pass channel_id for credentials)
            const token_response = await this.linkedin_oauth_service.exchange_code_for_token(
                code,
                state_data.channel_id
            );

            // Get user profile
            const profile = await this.linkedin_oauth_service.get_user_profile(token_response.access_token);

            // Calculate token expiration
            const expires_at = new Date(
                Date.now() + (token_response.expires_in * 1000)
            ).toISOString();

            // Create connection record
            const principal = { id: state_data.user_id };
            const connection = await this.channel_connection_service.create_connection(principal, {
                channel_id: state_data.channel_id,
                display_name: profile.name || profile.email || 'LinkedIn Account',
                auth_state: {
                    access_token: token_response.access_token,
                    refresh_token: token_response.refresh_token,
                    expires_at: expires_at,
                    scope: token_response.scope,
                    account_id: profile.sub || profile.email
                }
            });

            // Redirect back to dashboard with success
            res.redirect(
                `${this.config.cors_origin}/dashboard/channels/connections?success=connected&connection_id=${connection.id}`
            );
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/channels/oauth/x/callback
     * X (Twitter) OAuth callback handler
     */
    async x_callback(req, res, next) {
        try {
            const { code, state, error: oauth_error } = req.query;

            // Handle OAuth errors from X
            if (oauth_error) {
                return res.redirect(
                    `${this.config.cors_origin}/dashboard/channels/connections?error=oauth_denied`
                );
            }

            if (!code || !state) {
                return res.redirect(
                    `${this.config.cors_origin}/dashboard/channels/connections?error=invalid_callback`
                );
            }

            // Validate state and get metadata (includes code_verifier for PKCE)
            const state_data = await this.x_oauth_service.validate_state(state);
            if (!state_data) {
                return res.redirect(
                    `${this.config.cors_origin}/dashboard/channels/connections?error=invalid_state`
                );
            }

            // Exchange code for tokens (with PKCE code_verifier and channel_id for credentials)
            const token_response = await this.x_oauth_service.exchange_code_for_token(
                code,
                state_data.code_verifier,
                state_data.channel_id
            );

            // Get user profile
            const profile = await this.x_oauth_service.get_user_profile(token_response.access_token);

            // Calculate token expiration
            const expires_at = new Date(
                Date.now() + (token_response.expires_in * 1000)
            ).toISOString();

            // Create connection record
            const principal = { id: state_data.user_id };
            const connection = await this.channel_connection_service.create_connection(principal, {
                channel_id: state_data.channel_id,
                display_name: profile.name || profile.username || 'X Account',
                auth_state: {
                    access_token: token_response.access_token,
                    refresh_token: token_response.refresh_token,
                    expires_at: expires_at,
                    scope: token_response.scope,
                    account_id: profile.id || profile.username
                }
            });

            // Redirect back to dashboard with success
            res.redirect(
                `${this.config.cors_origin}/dashboard/channels/connections?success=connected&connection_id=${connection.id}`
            );
        } catch (error) {
            next(error);
        }
    }
}

module.exports = OAuthCallbackHandler;
