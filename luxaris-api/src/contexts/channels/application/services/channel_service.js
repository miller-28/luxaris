/**
 * Channel Service
 * 
 * Business logic for channel catalog management
 */
class ChannelService {
    constructor(channel_repository, system_logger) {
        this.channel_repo = channel_repository;
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
}

module.exports = ChannelService;
