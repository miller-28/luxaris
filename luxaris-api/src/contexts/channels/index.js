/**
 * Channels Domain
 * 
 * Manages platform connections and OAuth integrations
 */

// Repositories
const ChannelRepository = require('./infrastructure/repositories/channel_repository');
const ChannelConnectionRepository = require('./infrastructure/repositories/channel_connection_repository');
const ChannelOAuthCredentialsRepository = require('./infrastructure/repositories/channel_oauth_credentials_repository');

// Services
const ChannelService = require('./application/services/channel_service');
const ChannelConnectionService = require('./application/services/channel_connection_service');
const ChannelOAuthCredentialsService = require('./application/services/channel_oauth_credentials_service');

// OAuth Services
const LinkedInOAuthService = require('./application/services/oauth/linkedin-oauth-service');
const XOAuthService = require('./application/services/oauth/x-oauth-service');

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
        event_registry,
        cache_service,
        auth_config
    } = dependencies;

    // Initialize repositories
    const channel_repository = new ChannelRepository();
    const channel_connection_repository = new ChannelConnectionRepository();
    const oauth_credentials_repository = new ChannelOAuthCredentialsRepository();

    // Initialize services
    const channel_service = new ChannelService(
        channel_repository,
        channel_connection_repository,
        system_logger
    );

    const oauth_credentials_service = new ChannelOAuthCredentialsService(
        oauth_credentials_repository,
        channel_service,
        system_logger
    );

    // Initialize OAuth services (with credentials service)
    const linkedin_oauth_service = new LinkedInOAuthService(
        auth_config,
        cache_service,
        oauth_credentials_service,
        system_logger
    );

    const x_oauth_service = new XOAuthService(
        auth_config,
        cache_service,
        oauth_credentials_service,
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
        oauth_credentials_repository,

        // Services
        channel_service,
        channel_connection_service,
        oauth_credentials_service,
        
        // OAuth Services
        linkedin_oauth_service,
        x_oauth_service,

        // Routes factory
        create_channel_routes
    };
}

module.exports = {
    initialize_channels_domain
};
