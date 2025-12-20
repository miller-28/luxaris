/**
 * Channel Service
 * 
 * Business logic for channel catalog management
 */
class ChannelService {

    constructor(channel_repository, channel_connection_repository, system_logger) {
        this.channel_repo = channel_repository;
        this.connection_repo = channel_connection_repository;
        this.logger = system_logger;
        this.logger_name = 'ChannelService';
    }

    /**
     * Get all active channels available for connections
     */
    async list_available_channels() {

        await this.logger.info(this.logger_name, 'Fetching available channels');

        const channels = await this.channel_repo.list_active();

        await this.logger.info(this.logger_name, 'Available channels fetched', {
            count: channels.length
        });

        return channels;
    }

    /**
     * Get channel by ID with validation
     */
    async get_channel(channel_id) {

        const channel = await this.channel_repo.find_by_id(channel_id);

        if (!channel) {
            const error = new Error('Channel not found');
            error.status_code = 404;
            error.error_code = 'CHANNEL_NOT_FOUND';
            error.severity = 'error';
            throw error;
        }

        return channel;
    }

    /**
     * Get channel by semantic key (e.g., 'linkedin', 'x')
     */
    async get_channel_by_key(channel_key) {

        const channel = await this.channel_repo.find_by_key(channel_key);

        if (!channel) {
            const error = new Error(`Channel not found: ${channel_key}`);
            error.status_code = 404;
            error.error_code = 'CHANNEL_NOT_FOUND';
            error.severity = 'error';
            throw error;
        }

        return channel;
    }

    /**
     * Validate channel is active and available for connections
     */
    async validate_channel_active(channel_id) {
        // First check if channel exists
        const channel = await this.channel_repo.find_by_id(channel_id);
        if (!channel) {
            const error = new Error('Channel not found');
            error.status_code = 404;
            error.error_code = 'CHANNEL_NOT_FOUND';
            error.severity = 'error';
            throw error;
        }

        // Then check if it's active
        if (channel.status !== 'active') {
            const error = new Error('Channel is not active');
            error.status_code = 400;
            error.error_code = 'CHANNEL_NOT_ACTIVE';
            error.severity = 'error';
            throw error;
        }

        return true;
    }

    /**
     * Get channel limits for content validation
     */
    async get_channel_limits(channel_id) {
        const channel = await this.get_channel(channel_id);
        return channel.limits;
    }
    /**
     * Get active connection for a channel (global, platform-wide)
     * Returns the most recent active connection for the given channel
     */
    async get_active_connection_for_channel(channel_id) {
        await this.logger.info(this.logger_name, 'Getting active connection for channel', {
            channel_id
        });

        // Find all connections for this channel
        const connections = await this.connection_repo.list_by_channel(channel_id);

        // Filter to active connections only
        const active_connections = connections.filter(conn => 
            conn.status === 'connected' && !conn.deleted_at
        );

        if (active_connections.length === 0) {
            await this.logger.warning(this.logger_name, 'No active connection found', {
                channel_id
            });
            return null;
        }

        // Return the most recent active connection
        active_connections.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        
        await this.logger.info(this.logger_name, 'Active connection found', {
            channel_id,
            connection_id: active_connections[0].id
        });

        return active_connections[0];
    }}

module.exports = ChannelService;
