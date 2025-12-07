/**
 * Scheduling Domain
 * 
 * Manages time-based publishing and event tracking
 */

// Repositories
const ScheduleRepository = require('./infrastructure/repositories/schedule_repository');
const PublishEventRepository = require('./infrastructure/repositories/publish_event_repository');

// Services
const ScheduleService = require('./application/services/schedule_service');

// HTTP Routes
const create_schedule_routes = require('./interface/http/schedule_routes');

/**
 * Initialize Scheduling Domain
 */
function initialize_scheduling_domain(dependencies) {
    const {
        db_pool,
        system_logger,
        event_registry,
        post_variant_service,
        post_repository
    } = dependencies;

    // Initialize repositories
    const schedule_repository = new ScheduleRepository();
    const publish_event_repository = new PublishEventRepository();

    // Initialize services
    const schedule_service = new ScheduleService(
        schedule_repository,
        publish_event_repository,
        post_variant_service,
        post_repository,
        system_logger,
        event_registry
    );

    return {
        // Repositories
        schedule_repository,
        publish_event_repository,

        // Services
        schedule_service,

        // Routes factory
        create_schedule_routes
    };
}

module.exports = {
    initialize_scheduling_domain
};
