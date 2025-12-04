const express = require('express');

/**
 * Channels Routes
 * 
 * HTTP endpoints for channel catalog and connections
 */
function create_channel_routes(dependencies) {
  const router = express.Router();
  const {
    channel_service,
    channel_connection_service,
    auth_middleware,
    error_handler
  } = dependencies;

  /**
   * GET /api/v1/channels
   * List all available channels (catalog)
   */
  router.get('/', auth_middleware, async (req, res, next) => {
    try {
      const channels = await channel_service.list_available_channels();

      res.json({
        data: channels
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /api/v1/channels/connections
   * List user's channel connections
   */
  router.get('/connections', auth_middleware, async (req, res, next) => {
    try {
      const filters = {
        status: req.query.status,
        channel_id: req.query.channel_id,
        page: parseInt(req.query.page) || 1,
        limit: Math.min(parseInt(req.query.limit) || 20, 100)
      };

      const result = await channel_connection_service.list_connections(
        req.principal,
        filters
      );

      // Transform response to match API spec
      const response = {
        data: result.data.map(conn => ({
          id: conn.id,
          channel_id: conn.channel_id,
          display_name: conn.display_name,
          status: conn.status,
          created_at: conn.created_at,
          updated_at: conn.updated_at,
          last_used_at: conn.last_used_at,
          auth_state: conn.auth_state,
          channel: {
            id: conn.channel_id,
            key: conn.channel_key,
            name: conn.channel_name
          }
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
  });

  /**
   * POST /api/v1/channels/connect
   * Initiate OAuth connection flow (returns authorization URL)
   * 
   * Note: Actual OAuth implementation requires external provider setup.
   * For now, this is a placeholder that creates a mock connection.
   */
  router.post('/connect', auth_middleware, async (req, res, next) => {
    try {
      const { channel_id, display_name, mock_connection } = req.body;

      if (!channel_id) {
        return res.status(400).json({
          errors: [{
            error_code: 'VALIDATION_ERROR',
            error_description: 'channel_id is required',
            error_severity: 'error'
          }]
        });
      }

      // Validate channel exists and is active
      try {
        await channel_service.validate_channel_active(channel_id);
      } catch (error) {
        if (error.message === 'CHANNEL_NOT_FOUND') {
          return res.status(404).json({
            errors: [{
              error_code: 'CHANNEL_NOT_FOUND',
              error_description: 'Channel does not exist',
              error_severity: 'error'
            }]
          });
        }
        if (error.message === 'CHANNEL_NOT_ACTIVE') {
          return res.status(400).json({
            errors: [{
              error_code: 'CHANNEL_NOT_ACTIVE',
              error_description: 'Channel is not active',
              error_severity: 'error'
            }]
          });
        }
        throw error;
      }

      // For testing/development: allow direct connection with mock data
      if (mock_connection) {
        const connection = await channel_connection_service.create_connection(
          req.principal,
          {
            channel_id,
            display_name: display_name || 'Mock Account',
            auth_state: {
              access_token: 'mock_access_token',
              refresh_token: 'mock_refresh_token',
              expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
              scope: ['read', 'write'],
              account_id: 'mock_account_id'
            }
          }
        );

        return res.status(201).json({
          id: connection.id,
          channel_id: connection.channel_id,
          display_name: connection.display_name,
          status: connection.status,
          created_at: connection.created_at
        });
      }

      // TODO: Implement real OAuth flow
      // 1. Generate state token
      // 2. Store state in cache
      // 3. Return OAuth authorization URL
      res.status(501).json({
        errors: [{
          error_code: 'NOT_IMPLEMENTED',
          error_description: 'OAuth flow not yet implemented. Use mock_connection: true for testing.',
          error_severity: 'error'
        }]
      });
    } catch (error) {
      if (error.message === 'CONNECTION_ALREADY_EXISTS') {
        return res.status(400).json({
          errors: [{
            error_code: 'CONNECTION_ALREADY_EXISTS',
            error_description: 'You already have a connection to this channel',
            error_severity: 'error'
          }]
        });
      }
      next(error);
    }
  });

  /**
   * DELETE /api/v1/channels/connections/:id
   * Disconnect a channel connection
   */
  router.delete('/connections/:id', auth_middleware, async (req, res, next) => {
    try {
      const connection_id = req.params.id;

      const disconnected = await channel_connection_service.disconnect_connection(
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
      if (error.message === 'CONNECTION_NOT_FOUND') {
        return res.status(404).json({
          errors: [{
            error_code: 'CONNECTION_NOT_FOUND',
            error_description: 'Channel connection not found',
            error_severity: 'error'
          }]
        });
      }
      if (error.message === 'CONNECTION_NOT_OWNED') {
        return res.status(403).json({
          errors: [{
            error_code: 'FORBIDDEN',
            error_description: 'You do not have permission to disconnect this connection',
            error_severity: 'error'
          }]
        });
      }
      next(error);
    }
  });

  // Register error handler if provided
  if (error_handler) {
    router.use(error_handler);
  }

  return router;
}

module.exports = create_channel_routes;
