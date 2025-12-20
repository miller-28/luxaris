/**
 * Posts Domain
 * 
 * Manages content creation and post lifecycle
 */

// Repositories
const PostRepository = require('./infrastructure/repositories/post_repository');
const PostVariantRepository = require('./infrastructure/repositories/post_variant_repository');

// Services
const PostService = require('./application/services/post_service');
const PostVariantService = require('./application/services/post_variant_service');

// HTTP Routes and Handlers
const { 
    create_post_routes, 
    create_post_variant_routes,
    PostHandler,
    PostVariantHandler
} = require('./interface/http/routes');

/**
 * Initialize Posts Domain
 */
function initialize_posts_domain(dependencies) {
    const {
        db_pool,
        system_logger,
        event_registry,
        channel_service
    } = dependencies;

    // Initialize repositories
    const post_repository = new PostRepository();
    const post_variant_repository = new PostVariantRepository();

    // Initialize services
    const post_service = new PostService(
        post_repository,
        event_registry,
        system_logger
    );

    const post_variant_service = new PostVariantService(
        post_variant_repository,
        post_repository,
        channel_service,
        event_registry,
        system_logger
    );

    // Initialize handlers
    const post_handler = new PostHandler(post_service);
    const post_variant_handler = new PostVariantHandler(post_variant_service);

    return {
        // Repositories
        post_repository,
        post_variant_repository,

        // Services
        post_service,
        post_variant_service,

        // Handlers
        post_handler,
        post_variant_handler,

        // Routes factory
        create_post_routes,
        create_post_variant_routes
    };
}

module.exports = {
    initialize_posts_domain
};
