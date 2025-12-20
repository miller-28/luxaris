/**
 * Channel Connection Service
 * 
 * Business logic for managing user channel connections
 */
class ChannelConnectionService {
    
    constructor(
        channel_connection_repository,
        channel_service,
        acl_service,
        event_registry,
        system_logger
    ) {
        this.connection_repo = channel_connection_repository;
        this.channel_service = channel_service;
        this.acl = acl_service;
        this.events = event_registry;
        this.logger = system_logger;
        this.logger_name = 'ChannelConnectionService';
    }

    /**
     * Create new channel connection (after OAuth success)
     */
    async create_connection(principal, connection_data) {
        // Validate channel exists and is active
        await this.channel_service.validate_channel_active(connection_data.channel_id);

        // Check if user already has connection to this channel
        const existing = await this.connection_repo.has_connection_to_channel(
            principal.id,
            connection_data.channel_id
        );

        if (existing) {
            const error = new Error('Connection already exists');
            error.status_code = 409;
            error.error_code = 'CONNECTION_ALREADY_EXISTS';
            error.severity = 'error';
            throw error;
        }

        // Create connection
        const connection = await this.connection_repo.create({
            owner_principal_id: principal.id,
            channel_id: connection_data.channel_id,
            display_name: connection_data.display_name,
            status: 'connected',
            auth_state: connection_data.auth_state,
            created_by_user_id: principal.id
        });

        await this.logger.info(this.logger_name, 'Channel connection created', {
            connection_id: connection.id,
            channel_id: connection.channel_id,
            owner_id: principal.id
        });

        // Record event
        await this.events.record('channel', 'CHANNEL_CONNECTED', {
            resource_type: 'channel_connection',
            resource_id: connection.id,
            principal_id: principal.id,
            principal_type: 'user',
            metadata: {
                channel_id: connection.channel_id,
                display_name: connection.display_name
            }
        });

        return connection;
    }

    /**
     * List user's channel connections with filters
     */
    async list_connections(principal, filters = {}) {
        const result = await this.connection_repo.list_by_owner(principal.id, filters);

        // Sanitize auth state - never return tokens
        result.data = result.data.map(connection => ({
            ...connection,
            auth_state: this._sanitize_auth_state(connection.auth_state)
        }));

        await this.logger.info(this.logger_name, 'Channel connections listed', {
            owner_id: principal.id,
            count: result.data.length,
            total: result.pagination.total
        });

        return result;
    }

    /**
     * Get single connection with ownership check
     */
    async get_connection(principal, connection_id, sanitize = true) {
        const connection = await this.connection_repo.find_by_id(connection_id);

        if (!connection) {
            const error = new Error('Connection not found');
            error.status_code = 404;
            error.error_code = 'CONNECTION_NOT_FOUND';
            error.severity = 'error';
            throw error;
        }

        // Check ownership
        if (connection.owner_principal_id !== principal.id) {
            const error = new Error('Access denied to this connection');
            error.status_code = 403;
            error.error_code = 'CONNECTION_NOT_OWNED';
            error.severity = 'error';
            throw error;
        }

        if (sanitize) {
            // Sanitize auth state
            connection.auth_state = this._sanitize_auth_state(connection.auth_state);
        }   
        // Sanitize auth state

        return connection;
    }

    /**
     * Disconnect channel connection
     */
    async disconnect_connection(principal, connection_id) {
        // Get connection with ownership check
        const connection = await this.get_connection(principal, connection_id);

        // TODO: Check for active schedules when scheduling is implemented
        // For now, just disconnect

        // Disconnect (soft delete approach)
        const disconnected = await this.connection_repo.disconnect(connection_id, principal.id);

        await this.logger.info(this.logger_name, 'Channel connection disconnected', {
            connection_id,
            owner_id: principal.id,
            channel_id: connection.channel_id
        });

        // Record event
        await this.events.record('channel', 'CHANNEL_DISCONNECTED', {
            resource_type: 'channel_connection',
            resource_id: connection_id,
            principal_id: principal.id,
            principal_type: 'user',
            metadata: {
                channel_id: connection.channel_id,
                display_name: connection.display_name
            }
        });

        return disconnected;
    }

    /**
     * Check if user has connection to a channel
     */
    async has_connection(principal, channel_id) {
        return await this.connection_repo.has_connection_to_channel(
            principal.id,
            channel_id
        );
    }

    /**
     * Update connection status (for error handling)
     */
    async update_connection_status(connection_id, status) {
        const updated = await this.connection_repo.update_status(connection_id, status);

        await this.logger.info(this.logger_name, 'Connection status updated', {
            connection_id,
            new_status: status
        });

        return updated;
    }

    /**
     * Sanitize auth state - remove sensitive tokens
     */
    _sanitize_auth_state(auth_state) {
        if (typeof auth_state === 'string') {
            auth_state = JSON.parse(auth_state);
        }

        const { access_token, refresh_token, ...safe_data } = auth_state;

        return safe_data;
    }
}

module.exports = ChannelConnectionService;
