/**
 * Generation Domain
 * 
 * Manages AI-powered content creation and templates
 */

// Repositories
const PostTemplateRepository = require('./infrastructure/repositories/post_template_repository');
const GenerationSessionRepository = require('./infrastructure/repositories/generation_session_repository');
const GenerationSuggestionRepository = require('./infrastructure/repositories/generation_suggestion_repository');

// Services
const PostTemplateService = require('./application/services/post_template_service');
const GenerationService = require('./application/services/generation_service');

// Adapters
const MockGeneratorAdapter = require('./infrastructure/adapters/mock_generator_adapter');

// HTTP Routes
const create_post_template_routes = require('./interface/http/post_template_routes');
const create_generation_routes = require('./interface/http/generation_routes');

/**
 * Initialize Generation Domain
 */
function initialize_generation_domain(dependencies) {
    const {
        db_pool,
        system_logger,
        event_registry,
        post_service,
        post_variant_service,
        channel_service
    } = dependencies;

    // Initialize repositories
    const post_template_repository = new PostTemplateRepository(db_pool);
    const generation_session_repository = new GenerationSessionRepository(db_pool);
    const generation_suggestion_repository = new GenerationSuggestionRepository(db_pool);

    // Initialize generator adapter (use mock for now)
    const generator_adapter = new MockGeneratorAdapter();

    // Initialize services
    const post_template_service = new PostTemplateService(
        post_template_repository,
        system_logger,
        event_registry
    );

    const generation_service = new GenerationService(
        generation_session_repository,
        generation_suggestion_repository,
        post_template_repository,
        post_service,
        post_variant_service,
        channel_service,
        generator_adapter,
        system_logger,
        event_registry
    );

    return {
        // Repositories
        post_template_repository,
        generation_session_repository,
        generation_suggestion_repository,

        // Services
        post_template_service,
        generation_service,

        // Routes factory
        create_post_template_routes,
        create_generation_routes
    };
}

module.exports = {
    initialize_generation_domain
};
