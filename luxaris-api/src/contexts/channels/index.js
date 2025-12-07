/**
 * Channels Domain
 * 
 * Manages platform connections and OAuth integrations
 */

// Repositories
const ChannelRepository = require('./infrastructure/repositories/channel_repository');
const ChannelConnectionRepository = require('./infrastructure/repositories/channel_connection_repository');

// Services
const ChannelService = require('./application/services/channel_service');
const ChannelConnectionService = require('./application/services/channel_connection_service');

// HTTP Routes
const create_channel_routes = require('./interface/http/channel_routes');

/**
 * Initialize Channels Domain
 */
function initialize_channels_domain(dependencies) {
    const {
        db_pool,
        system_logger,
        acl_service,
        event_registry
    } = dependencies;

    // Initialize repositories
    const channel_repository = new ChannelRepository();
    const channel_connection_repository = new ChannelConnectionRepository();

    // Initialize services
    const channel_service = new ChannelService(
        channel_repository,
        system_logger
    );

    const channel_connection_service = new ChannelConnectionService(
        channel_connection_repository,
        channel_service,
        acl_service,
        event_registry,
        system_logger
    );

    return {
        // Repositories
        channel_repository,
        channel_connection_repository,

        // Services
        channel_service,
        channel_connection_service,

        // Routes factory
        create_channel_routes
    };
}

module.exports = {
    initialize_channels_domain
};
