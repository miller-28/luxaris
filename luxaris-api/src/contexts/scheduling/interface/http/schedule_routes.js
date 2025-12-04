const express = require('express');
const router = express.Router();

function create_schedule_routes(schedule_service, auth_middleware) {
    // Apply authentication middleware to all schedule routes
    router.use(auth_middleware);

    /**
   * POST /schedules - Create a new schedule
   */
    router.post('/', async (req, res, next) => {
        try {
            const principal = req.principal;
            const schedule_data = req.body;

            const schedule = await schedule_service.create_schedule(principal, schedule_data);

            res.status(201).json({
                data: schedule
            });
        } catch (error) {
            // Handle known validation errors
            if (error.message === 'SCHEDULE_REQUIRED_FIELDS_MISSING') {
                return res.status(400).json({
                    errors: [{
                        error_code: 'SCHEDULE_REQUIRED_FIELDS_MISSING',
                        error_description: 'Required fields missing: post_variant_id, channel_connection_id, run_at',
                        error_severity: 'error'
                    }]
                });
            }
            if (error.message === 'VARIANT_NOT_FOUND') {
                return res.status(404).json({
                    errors: [{
                        error_code: 'VARIANT_NOT_FOUND',
                        error_description: 'Post variant not found',
                        error_severity: 'error'
                    }]
                });
            }
            if (error.message === 'SCHEDULE_TIME_MUST_BE_FUTURE') {
                return res.status(400).json({
                    errors: [{
                        error_code: 'SCHEDULE_TIME_MUST_BE_FUTURE',
                        error_description: 'Schedule time must be in the future',
                        error_severity: 'error'
                    }]
                });
            }
            if (error.message === 'SCHEDULE_TIME_TOO_FAR') {
                return res.status(400).json({
                    errors: [{
                        error_code: 'SCHEDULE_TIME_TOO_FAR',
                        error_description: 'Schedule time cannot be more than 90 days in the future',
                        error_severity: 'error'
                    }]
                });
            }
            next(error);
        }
    });

    /**
   * GET /schedules - List schedules
   */
    router.get('/', async (req, res, next) => {
        try {
            const principal = req.principal;
      
            // Extract filters
            const filters = {};
            if (req.query.post_variant_id) {
                filters.post_variant_id = req.query.post_variant_id;
            }
            if (req.query.channel_connection_id) {
                filters.channel_connection_id = req.query.channel_connection_id;
            }
            if (req.query.status) {
                filters.status = req.query.status;
            }
            if (req.query.run_at_from) {
                filters.run_at_from = req.query.run_at_from;
            }
            if (req.query.run_at_to) {
                filters.run_at_to = req.query.run_at_to;
            }

            // Extract pagination
            const pagination = {
                limit: parseInt(req.query.limit) || 50,
                offset: parseInt(req.query.offset) || 0
            };

            const result = await schedule_service.list_schedules(principal, filters, pagination);

            res.json({
                data: result.schedules,
                meta: {
                    total: result.total,
                    limit: pagination.limit,
                    offset: pagination.offset
                }
            });
        } catch (error) {
            next(error);
        }
    });

    /**
   * GET /schedules/calendar - Calendar view
   */
    router.get('/calendar', async (req, res, next) => {
        try {
            const principal = req.principal;
            const from_date = req.query.from_date;
            const to_date = req.query.to_date;

            if (!from_date || !to_date) {
                return res.status(400).json({
                    errors: [{
                        error_code: 'MISSING_DATE_RANGE',
                        error_description: 'from_date and to_date are required',
                        error_severity: 'error'
                    }]
                });
            }

            const filters = {};
            if (req.query.status) {
                filters.status = req.query.status;
            }
            if (req.query.channel_connection_id) {
                filters.channel_connection_id = req.query.channel_connection_id;
            }

            const schedules = await schedule_service.list_by_date_range(
                principal,
                from_date,
                to_date,
                filters
            );

            res.json({
                data: schedules
            });
        } catch (error) {
            next(error);
        }
    });

    /**
   * GET /schedules/:id - Get schedule by ID
   */
    router.get('/:id', async (req, res, next) => {
        try {
            const principal = req.principal;
            const schedule_id = req.params.id;

            const result = await schedule_service.get_schedule(principal, schedule_id);

            res.json({
                data: result
            });
        } catch (error) {
            if (error.message === 'SCHEDULE_NOT_FOUND') {
                return res.status(404).json({
                    errors: [{
                        error_code: 'SCHEDULE_NOT_FOUND',
                        error_description: 'Schedule not found',
                        error_severity: 'error'
                    }]
                });
            }
            if (error.message === 'SCHEDULE_ACCESS_DENIED' || error.message === 'VARIANT_NOT_FOUND') {
                return res.status(403).json({
                    errors: [{
                        error_code: 'SCHEDULE_ACCESS_DENIED',
                        error_description: 'Access denied to this schedule',
                        error_severity: 'error'
                    }]
                });
            }
            next(error);
        }
    });

    /**
   * PATCH /schedules/:id - Update schedule (reschedule)
   */
    router.patch('/:id', async (req, res, next) => {
        try {
            const principal = req.principal;
            const schedule_id = req.params.id;
            const updates = req.body;

            const schedule = await schedule_service.update_schedule(principal, schedule_id, updates);

            res.json({
                data: schedule
            });
        } catch (error) {
            if (error.message === 'SCHEDULE_NOT_FOUND') {
                return res.status(404).json({
                    errors: [{
                        error_code: 'SCHEDULE_NOT_FOUND',
                        error_description: 'Schedule not found',
                        error_severity: 'error'
                    }]
                });
            }
            if (error.message === 'SCHEDULE_ACCESS_DENIED' || error.message === 'VARIANT_NOT_FOUND') {
                return res.status(403).json({
                    errors: [{
                        error_code: 'SCHEDULE_ACCESS_DENIED',
                        error_description: 'Access denied to this schedule',
                        error_severity: 'error'
                    }]
                });
            }
            if (error.message === 'SCHEDULE_TIME_MUST_BE_FUTURE') {
                return res.status(400).json({
                    errors: [{
                        error_code: 'SCHEDULE_TIME_MUST_BE_FUTURE',
                        error_description: 'Schedule time must be in the future',
                        error_severity: 'error'
                    }]
                });
            }
            if (error.message === 'SCHEDULE_TIME_TOO_FAR') {
                return res.status(400).json({
                    errors: [{
                        error_code: 'SCHEDULE_TIME_TOO_FAR',
                        error_description: 'Schedule time cannot be more than 90 days in the future',
                        error_severity: 'error'
                    }]
                });
            }
            next(error);
        }
    });

    /**
   * POST /schedules/:id/cancel - Cancel a schedule
   */
    router.post('/:id/cancel', async (req, res, next) => {
        try {
            const principal = req.principal;
            const schedule_id = req.params.id;

            const schedule = await schedule_service.cancel_schedule(principal, schedule_id);

            res.json({
                data: schedule
            });
        } catch (error) {
            if (error.message === 'SCHEDULE_NOT_FOUND') {
                return res.status(404).json({
                    errors: [{
                        error_code: 'SCHEDULE_NOT_FOUND',
                        error_description: 'Schedule not found',
                        error_severity: 'error'
                    }]
                });
            }
            if (error.message === 'SCHEDULE_ACCESS_DENIED' || error.message === 'VARIANT_NOT_FOUND') {
                return res.status(403).json({
                    errors: [{
                        error_code: 'SCHEDULE_ACCESS_DENIED',
                        error_description: 'Access denied to this schedule',
                        error_severity: 'error'
                    }]
                });
            }
            next(error);
        }
    });

    /**
   * DELETE /schedules/:id - Cancel or delete schedule
   */
    router.delete('/:id', async (req, res, next) => {
        try {
            const principal = req.principal;
            const schedule_id = req.params.id;
            const permanent = req.query.permanent === 'true';

            if (permanent) {
                await schedule_service.delete_schedule(principal, schedule_id);
            } else {
                await schedule_service.cancel_schedule(principal, schedule_id);
            }
            res.status(204).send();
        } catch (error) {
            if (error.message === 'SCHEDULE_NOT_FOUND') {
                return res.status(404).json({
                    errors: [{
                        error_code: 'SCHEDULE_NOT_FOUND',
                        error_description: 'Schedule not found',
                        error_severity: 'error'
                    }]
                });
            }
            if (error.message === 'SCHEDULE_ACCESS_DENIED' || error.message === 'VARIANT_NOT_FOUND') {
                return res.status(403).json({
                    errors: [{
                        error_code: 'SCHEDULE_ACCESS_DENIED',
                        error_description: 'Access denied to this schedule',
                        error_severity: 'error'
                    }]
                });
            }
            next(error);
        }
    });

    return router;
}

module.exports = create_schedule_routes;
