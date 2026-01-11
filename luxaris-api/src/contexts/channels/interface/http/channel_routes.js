const express = require('express');
const ChannelCatalogHandler = require('./handlers/channel-catalog-handler');
const ChannelOAuthCredentialsHandler = require('./handlers/channel-oauth-credentials-handler');
const ChannelConnectionHandler = require('./handlers/channel-connection-handler');
const OAuthCallbackHandler = require('./handlers/oauth-callback-handler');

/**
 * Channels Routes
 * 
 * HTTP endpoints for channel catalog, connections, and OAuth management
 */
function create_channel_routes(dependencies) {

    const router = express.Router();

    const {
        channel_service,
        channel_connection_service,
        oauth_credentials_service,
        linkedin_oauth_service,
        x_oauth_service,
        auth_middleware,
        acl_middleware,
        error_handler,
        app_config
    } = dependencies;

    // Initialize handlers
    const catalog_handler = new ChannelCatalogHandler(channel_service);
    
    const oauth_credentials_handler = new ChannelOAuthCredentialsHandler(
        oauth_credentials_service
    );
    
    const connection_handler = new ChannelConnectionHandler(
        channel_service,
        channel_connection_service,
        linkedin_oauth_service,
        x_oauth_service
    );
    
    const oauth_callback_handler = new OAuthCallbackHandler(
        channel_connection_service,
        linkedin_oauth_service,
        x_oauth_service,
        app_config
    );

    // ===== Channel Catalog Routes =====
    
    /**
     * GET /api/v1/channels
     * List all available channels
     */
    router.get('/', 
        auth_middleware, 
        (req, res, next) => catalog_handler.list_channels(req, res, next));

    // ===== OAuth Credentials Management Routes (Admin) =====
    
    /**
     * GET /api/v1/channels/:channel_key/oauth-credentials
     * Get OAuth credentials (admin only)
     */
    router.get('/:channel_key/oauth-credentials', 
        auth_middleware, 
        acl_middleware({ resource: 'channels', action: 'configure' }),
        (req, res, next) => oauth_credentials_handler.get_credentials(req, res, next));

    /**
     * PUT /api/v1/channels/:channel_key/oauth-credentials
     * Save/update OAuth credentials (admin only)
     */
    router.put('/:channel_key/oauth-credentials',
        auth_middleware,
        acl_middleware({ resource: 'channels', action: 'configure' }),
        (req, res, next) => oauth_credentials_handler.save_credentials(req, res, next));

    /**
     * DELETE /api/v1/channels/:channel_key/oauth-credentials
     * Delete OAuth credentials (admin only)
     */
    router.delete('/:channel_key/oauth-credentials',
        auth_middleware,
        acl_middleware({ resource: 'channels', action: 'configure' }),
        (req, res, next) => oauth_credentials_handler.delete_credentials(req, res, next));

    // ===== Channel Connection Routes (User) =====
    
    /**
     * GET /api/v1/channels/connections
     * List user's channel connections
     */
    router.get('/connections', 
        auth_middleware, 
        (req, res, next) => connection_handler.list_connections(req, res, next));

    /**
     * GET /api/v1/channels/:channel_key/auth-url
     * Get OAuth authorization URL
     */
    router.get('/:channel_key/auth-url', 
        auth_middleware, 
        (req, res, next) => connection_handler.get_auth_url(req, res, next));

    /**
     * POST /api/v1/channels/connections/:id/test
     * Test channel connection health
     */
    router.post('/connections/:id/test', 
        auth_middleware, 
        (req, res, next) => connection_handler.test_connection(req, res, next));

    /**
     * DELETE /api/v1/channels/connections/:id
     * Disconnect a channel connection
     */
    router.delete('/connections/:id', 
        auth_middleware, 
        (req, res, next) => connection_handler.disconnect_connection(req, res, next));

    // ===== OAuth Callback Routes =====
    
    /**
     * GET /api/v1/channels/oauth/linkedin/callback
     * LinkedIn OAuth callback
     */
    router.get('/oauth/linkedin/callback', 
        (req, res, next) => oauth_callback_handler.linkedin_callback(req, res, next));

    /**
     * GET /api/v1/channels/oauth/x/callback
     * X (Twitter) OAuth callback
     */
    router.get('/oauth/x/callback', 
        (req, res, next) => oauth_callback_handler.x_callback(req, res, next));

    // Register error handler if provided
    if (error_handler) {
        router.use(error_handler);
    }

    return router;
}

module.exports = create_channel_routes;
