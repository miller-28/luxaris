/**
 * Channel Connection Handler
 * 
 * Handles HTTP requests for channel connection operations
 */
class ChannelConnectionHandler {

    constructor(channel_service, channel_connection_service, linkedin_oauth_service, x_oauth_service) {
        this.channel_service = channel_service;
        this.channel_connection_service = channel_connection_service;
        this.linkedin_oauth_service = linkedin_oauth_service;
        this.x_oauth_service = x_oauth_service;
    }

    /**
     * GET /api/v1/channels/connections
     * List user's channel connections
     */
    async list_connections(req, res, next) {
        try {
            const filters = {
                status: req.query.status,
                channel_id: req.query.channel_id,
                page: parseInt(req.query.page) || 1,
                limit: Math.min(parseInt(req.query.limit) || 20, 100)
            };

            const result = await this.channel_connection_service.list_connections(
                req.principal,
                filters
            );

            // Transform response to match API spec
            const response = {
                data: result.data.map(conn => ({
                    id: conn.id,
                    user_id: conn.owner_principal_id,
                    channel_id: conn.channel_id,
                    channel_name: conn.channel_name,
                    channel_display_name: conn.channel_name,
                    channel_icon: conn.channel_icon,
                    channel_color: conn.channel_color,
                    account_name: conn.display_name,
                    account_username: conn.account_username,
                    account_avatar: conn.account_avatar,
                    status: conn.status,
                    error_message: conn.error_message,
                    last_used_at: conn.last_used_at,
                    created_at: conn.created_at,
                    updated_at: conn.updated_at,
                    auth_state: conn.auth_state
                })),
                pagination: {
                    page: result.pagination.page,
                    limit: result.pagination.limit,
                    total: result.pagination.total,
                    total_pages: result.pagination.total_pages,
                    has_next: result.pagination.page < result.pagination.total_pages,
                    has_prev: result.pagination.page > 1
                },
                filters: {
                    status: filters.status || 'all'
                }
            };

            res.json(response);
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/channels/:channel_key/auth-url
     * Get OAuth authorization URL for a channel
     */
    async get_auth_url(req, res, next) {
        try {
            const channel_key = req.params.channel_key;

            // Validate channel exists and is active
            const channel = await this.channel_service.get_channel_by_key(channel_key);
            const channel_id = channel.id;
            
            if (channel.status !== 'active') {
                return res.status(400).json({
                    errors: [{
                        error_code: 'CHANNEL_NOT_ACTIVE',
                        error_description: 'Channel is not active',
                        error_severity: 'error'
                    }]
                });
            }

            // Check if user already has connection to this channel
            const has_connection = await this.channel_connection_service.has_connection(
                req.principal,
                channel_id
            );

            if (has_connection) {
                return res.status(409).json({
                    errors: [{
                        error_code: 'CONNECTION_ALREADY_EXISTS',
                        error_description: 'You already have a connection to this channel',
                        error_severity: 'error'
                    }]
                });
            }

            // Get appropriate OAuth service based on channel key
            let oauth_service;
            switch (channel.key) {
                case 'linkedin':
                    if (!await this.linkedin_oauth_service.is_configured(channel_id)) {
                        return res.status(503).json({
                            errors: [{
                                error_code: 'OAUTH_NOT_CONFIGURED',
                                error_description: 'LinkedIn OAuth credentials not configured. Please contact your administrator.',
                                error_severity: 'error'
                            }]
                        });
                    }
                    oauth_service = this.linkedin_oauth_service;
                    break;
                case 'x':
                    if (!await this.x_oauth_service.is_configured(channel_id)) {
                        return res.status(503).json({
                            errors: [{
                                error_code: 'OAUTH_NOT_CONFIGURED',
                                error_description: 'X (Twitter) OAuth credentials not configured. Please contact your administrator.',
                                error_severity: 'error'
                            }]
                        });
                    }
                    oauth_service = this.x_oauth_service;
                    break;
                default:
                    return res.status(400).json({
                        errors: [{
                            error_code: 'CHANNEL_NOT_SUPPORTED',
                            error_description: `Channel ${channel.key} does not support OAuth connections yet`,
                            error_severity: 'error'
                        }]
                    });
            }

            // Generate authorization URL
            const { url, state } = await oauth_service.generate_authorization_url(
                channel_id,
                req.principal.id
            );

            res.json({
                auth_url: url,
                state: state,
                channel_key: channel.key
            });
        } catch (error) {
            if (error.error_code === 'CHANNEL_NOT_FOUND') {
                return res.status(404).json({
                    errors: [{
                        error_code: 'CHANNEL_NOT_FOUND',
                        error_description: 'Channel not found',
                        error_severity: 'error'
                    }]
                });
            }
            next(error);
        }
    }

    /**
     * POST /api/v1/channels/connections/:id/test
     * Test channel connection health
     */
    async test_connection(req, res, next) {
        try {

            const connection_id = parseInt(req.params.id);

            // Get connection to determine which OAuth service to use
            const connection = await this.channel_connection_service.get_connection(
                req.principal,
                connection_id,
                false
            );

            // Determine OAuth service based on channel key
            let oauth_service;
            switch (connection.channel_key) {
                case 'linkedin':
                    oauth_service = this.linkedin_oauth_service;
                    break;
                case 'x':
                    oauth_service = this.x_oauth_service;
                    break;
                default:
                    return res.status(400).json({
                        errors: [{
                            error_code: 'UNSUPPORTED_CHANNEL',
                            error_description: `Testing is not supported for ${connection.channel_name}`,
                            error_severity: 'error'
                        }]
                    });
            }

            // Test the connection by fetching user profile
            const test_result = await oauth_service.test_connection(connection);

            res.json({
                success: test_result.success,
                message: test_result.message,
                user_info: test_result.user_info,
                tested_at: new Date().toISOString()
            });
        } catch (error) {
            if (error.error_code === 'CONNECTION_NOT_FOUND') {
                return res.status(404).json({
                    errors: [{
                        error_code: 'CONNECTION_NOT_FOUND',
                        error_description: error.message,
                        error_severity: 'error'
                    }]
                });
            }
            if (error.error_code === 'CONNECTION_NOT_OWNED') {
                return res.status(403).json({
                    errors: [{
                        error_code: 'FORBIDDEN',
                        error_description: error.message,
                        error_severity: 'error'
                    }]
                });
            }
            if (error.error_code === 'TOKEN_EXPIRED' || error.error_code === 'INVALID_TOKEN') {
                return res.status(401).json({
                    errors: [{
                        error_code: error.error_code,
                        error_description: error.message || 'Connection authentication has expired or is invalid',
                        error_severity: 'error'
                    }]
                });
            }
            next(error);
        }
    }

    /**
     * DELETE /api/v1/channels/connections/:id
     * Disconnect a channel connection
     */
    async disconnect_connection(req, res, next) {
        try {
            const connection_id = req.params.id;

            const disconnected = await this.channel_connection_service.disconnect_connection(
                req.principal,
                connection_id
            );

            res.json({
                id: disconnected.id,
                status: disconnected.status,
                disconnected_at: disconnected.disconnected_at,
                message: 'Channel connection successfully disconnected'
            });
        } catch (error) {
            if (error.error_code === 'CONNECTION_NOT_FOUND') {
                return res.status(404).json({
                    errors: [{
                        error_code: 'CONNECTION_NOT_FOUND',
                        error_description: error.message,
                        error_severity: 'error'
                    }]
                });
            }
            if (error.error_code === 'CONNECTION_NOT_OWNED') {
                return res.status(403).json({
                    errors: [{
                        error_code: 'FORBIDDEN',
                        error_description: error.message,
                        error_severity: 'error'
                    }]
                });
            }
            next(error);
        }
    }
}

module.exports = ChannelConnectionHandler;
