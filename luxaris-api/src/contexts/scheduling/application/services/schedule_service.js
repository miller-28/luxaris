const Schedule = require('../../infrastructure/models/schedule');

class ScheduleService {
    constructor(
        schedule_repository,
        publish_event_repository,
        post_variant_service,
        post_repository,
        system_logger,
        event_registry
    ) {
        this.schedule_repository = schedule_repository;
        this.publish_event_repository = publish_event_repository;
        this.variant_service = post_variant_service;
        this.post_repository = post_repository;
        this.logger = system_logger;
        this.event_registry = event_registry;
    }

    /**
   * Create a new schedule
   * @param {Object} principal - Operating principal (user or service account)
   * @param {Object} schedule_data - Schedule data
   * @param {string} schedule_data.post_variant_id - Variant to publish
   * @param {string} schedule_data.channel_connection_id - Channel to publish to
   * @param {string} schedule_data.run_at - Local datetime in specified timezone
   * @param {string} [schedule_data.timezone] - IANA timezone (defaults to principal's timezone)
   */
    async create_schedule(principal, schedule_data) {
        this.logger.info('Creating schedule', { principal_id: principal.id });

        // Validate required fields
        if (!schedule_data.post_variant_id || !schedule_data.channel_connection_id || !schedule_data.run_at) {
            const error = new Error('Required fields missing: post_variant_id, channel_connection_id, run_at');
            error.status_code = 400;
            error.error_code = 'SCHEDULE_REQUIRED_FIELDS_MISSING';
            error.severity = 'error';
            throw error;
        }

        // Use principal's timezone if not explicitly provided
        const timezone = schedule_data.timezone || principal.timezone || 'UTC';

        // Verify ownership of post_variant
        const variant = await this.variant_service.get_variant(principal, schedule_data.post_variant_id);
        if (!variant) {
            const error = new Error('Variant not found');
            error.status_code = 404;
            error.error_code = 'VARIANT_NOT_FOUND';
            error.severity = 'error';
            throw error;
        }

        // Validate timezone is valid IANA timezone string
        // TODO: Add proper timezone validation using moment-timezone or similar
        if (!timezone) {
            const error = new Error('Timezone is required');
            error.status_code = 400;
            error.error_code = 'SCHEDULE_TIMEZONE_REQUIRED';
            error.severity = 'error';
            throw error;
        }

        // Parse run_at as local time in specified timezone
        // For now, treat as UTC-based timestamp (proper timezone conversion to be added with moment-timezone)
        const run_at_date = new Date(schedule_data.run_at);
        const now = new Date();
    
        // Validate run_at is in the future
        if (run_at_date <= now) {
            const error = new Error('Schedule time must be in the future');
            error.status_code = 400;
            error.error_code = 'SCHEDULE_TIME_MUST_BE_FUTURE';
            error.severity = 'error';
            throw error;
        }

        // Validate not too far in the future (90 days max)
        const max_future = new Date(now.getTime() + (90 * 24 * 60 * 60 * 1000));
        if (run_at_date > max_future) {
            const error = new Error('Schedule time too far in the future (90 days max)');
            error.status_code = 400;
            error.error_code = 'SCHEDULE_TIME_TOO_FAR';
            error.severity = 'error';
            throw error;
        }

        // Create schedule with timezone from principal or explicit selection
        const schedule = await this.schedule_repository.create({
            post_variant_id: schedule_data.post_variant_id,
            channel_connection_id: schedule_data.channel_connection_id,
            run_at: run_at_date.toISOString(), // Store as UTC
            timezone: timezone, // Store original timezone for display/audit
            status: 'pending',
            attempt_count: 0
        });

        // Update post status to 'scheduled' if not already published
        const post_id = variant.post_id;
        const post = await this.post_repository.find_by_id(post_id);
        if (post && post.status === 'draft') {
            await this.post_repository.update(post_id, { status: 'scheduled' });
        }

        // Record event
        await this.event_registry.record_event({
            event_type: 'schedule',
            event_name: 'SCHEDULE_CREATED',
            entity_type: 'schedule',
            entity_id: schedule.id,
            principal_id: principal.id,
            metadata: {
                post_variant_id: schedule.post_variant_id,
                channel_connection_id: schedule.channel_connection_id,
                run_at: schedule.run_at,
                timezone: schedule.timezone,
                timezone_source: schedule_data.timezone ? 'explicit' : 'principal_default'
            }
        });

        this.logger.info('Schedule created', { schedule_id: schedule.id });
        return schedule;
    }

    /**
   * Get schedule by ID
   */
    async get_schedule(principal, schedule_id) {
        this.logger.info('Getting schedule', { principal_id: principal.id, schedule_id });

        const schedule = await this.schedule_repository.find_by_id(schedule_id);
        if (!schedule) {
            const error = new Error('Schedule not found');
            error.status_code = 404;
            error.error_code = 'SCHEDULE_NOT_FOUND';
            error.severity = 'error';
            throw error;
        }

        // Verify ownership through post_variant
        const variant = await this.variant_service.get_variant(principal, schedule.post_variant_id);
        if (!variant) {
            const error = new Error('Access denied to this schedule');
            error.status_code = 403;
            error.error_code = 'SCHEDULE_ACCESS_DENIED';
            error.severity = 'error';
            throw error;
        }

        // Get publish events
        const publish_events = await this.publish_event_repository.list_by_schedule(schedule_id);

        this.logger.info('Schedule retrieved', { schedule_id });
        return { schedule, publish_events };
    }

    /**
   * List schedules with filters
   */
    async list_schedules(principal, filters = {}, pagination = {}) {
        this.logger.info('Listing schedules', { principal_id: principal.id, filters });

        // Note: This is a simplified version. In production, you'd want to join with
        // post_variants and posts to filter by ownership via principal_id
        // For now, we'll list all and filter in memory (not efficient for production)
    
        const schedules = await this.schedule_repository.list(filters, pagination);
        const total = await this.schedule_repository.count(filters);

        this.logger.info('Schedules listed', { count: schedules.length, total });
        return { schedules, total };
    }

    /**
   * Update schedule (reschedule)
   */
    async update_schedule(principal, schedule_id, updates) {
        this.logger.info('Updating schedule', { principal_id: principal.id, schedule_id });

        const schedule = await this.schedule_repository.find_by_id(schedule_id);
        if (!schedule) {
            const error = new Error('Schedule not found');
            error.status_code = 404;
            error.error_code = 'SCHEDULE_NOT_FOUND';
            error.severity = 'error';
            throw error;
        }

        // Verify ownership
        const variant = await this.variant_service.get_variant(principal, schedule.post_variant_id);
        if (!variant) {
            const error = new Error('Access denied to this schedule');
            error.status_code = 403;
            error.error_code = 'SCHEDULE_ACCESS_DENIED';
            error.severity = 'error';
            throw error;
        }

        // Check if schedule can be modified
        if (!schedule.can_reschedule()) {
            const error = new Error('Schedule cannot be modified');
            error.status_code = 409;
            error.error_code = 'SCHEDULE_CANNOT_BE_MODIFIED';
            error.severity = 'error';
            throw error;
        }

        // Validate new run_at if provided
        if (updates.run_at) {
            const run_at_date = new Date(updates.run_at);
            const now = new Date();
            if (run_at_date <= now) {
                const error = new Error('Schedule time must be in the future');
                error.status_code = 400;
                error.error_code = 'SCHEDULE_TIME_MUST_BE_FUTURE';
                error.severity = 'error';
                throw error;
            }
            const max_future = new Date(now.getTime() + (90 * 24 * 60 * 60 * 1000));
            if (run_at_date > max_future) {
                const error = new Error('Schedule time too far in the future (90 days max)');
                error.status_code = 400;
                error.error_code = 'SCHEDULE_TIME_TOO_FAR';
                error.severity = 'error';
                throw error;
            }
        }

        // Update schedule
        const updated_schedule = await this.schedule_repository.update(schedule_id, updates);

        // Record event
        await this.event_registry.record_event({
            event_type: 'schedule',
            event_name: 'SCHEDULE_UPDATED',
            entity_type: 'schedule',
            entity_id: schedule_id,
            principal_id: principal.id,
            metadata: {
                updated_fields: Object.keys(updates)
            }
        });

        this.logger.info('Schedule updated', { schedule_id });
        return updated_schedule;
    }

    /**
   * Cancel schedule
   */
    async cancel_schedule(principal, schedule_id) {
        this.logger.info('Cancelling schedule', { principal_id: principal.id, schedule_id });

        const schedule = await this.schedule_repository.find_by_id(schedule_id);
        if (!schedule) {
            const error = new Error('Schedule not found');
            error.status_code = 404;
            error.error_code = 'SCHEDULE_NOT_FOUND';
            error.severity = 'error';
            throw error;
        }

        // Verify ownership
        const variant = await this.variant_service.get_variant(principal, schedule.post_variant_id);
        if (!variant) {
            const error = new Error('Access denied to this schedule');
            error.status_code = 403;
            error.error_code = 'SCHEDULE_ACCESS_DENIED';
            error.severity = 'error';
            throw error;
        }

        // Check if schedule can be cancelled
        if (!schedule.can_cancel()) {
            const error = new Error('Schedule cannot be cancelled');
            error.status_code = 409;
            error.error_code = 'SCHEDULE_CANNOT_BE_CANCELLED';
            error.severity = 'error';
            throw error;
        }

        // Update status to cancelled
        const cancelled_schedule = await this.schedule_repository.update_status(schedule_id, 'cancelled');

        // Record event
        await this.event_registry.record_event({
            event_type: 'schedule',
            event_name: 'SCHEDULE_CANCELLED',
            entity_type: 'schedule',
            entity_id: schedule_id,
            principal_id: principal.id,
            metadata: {
                previous_status: schedule.status
            }
        });

        this.logger.info('Schedule cancelled', { schedule_id });
        return cancelled_schedule;
    }

    /**
   * Delete schedule
   */
    async delete_schedule(principal, schedule_id) {
        this.logger.info('Deleting schedule', { principal_id: principal.id, schedule_id });

        const schedule = await this.schedule_repository.find_by_id(schedule_id);
        if (!schedule) {
            const error = new Error('Schedule not found');
            error.status_code = 404;
            error.error_code = 'SCHEDULE_NOT_FOUND';
            error.severity = 'error';
            throw error;
        }

        // Verify ownership
        const variant = await this.variant_service.get_variant(principal, schedule.post_variant_id);
        if (!variant) {
            const error = new Error('Access denied to this schedule');
            error.status_code = 403;
            error.error_code = 'SCHEDULE_ACCESS_DENIED';
            error.severity = 'error';
            throw error;
        }

        // Delete schedule (will cascade to publish_events)
        await this.schedule_repository.delete(schedule_id);

        // Record event
        await this.event_registry.record_event({
            event_type: 'schedule',
            event_name: 'SCHEDULE_DELETED',
            entity_type: 'schedule',
            entity_id: schedule_id,
            principal_id: principal.id,
            metadata: {
                status: schedule.status
            }
        });

        this.logger.info('Schedule deleted', { schedule_id });
    }

    /**
   * List schedules by date range (for calendar view)
   */
    async list_by_date_range(principal, from_date, to_date, filters = {}) {
        this.logger.info('Listing schedules by date range', { principal_id: principal.id, from_date, to_date });

        const range_filters = {
            ...filters,
            run_at_from: from_date,
            run_at_to: to_date
        };

        const schedules = await this.schedule_repository.list(range_filters, { limit: 1000 });

        this.logger.info('Schedules by date range listed', { count: schedules.length });
        return schedules;
    }
}

module.exports = ScheduleService;
