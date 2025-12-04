const express = require('express');

/**
 * Create post template routes
 */
function create_post_template_routes({ post_template_service, auth_middleware, error_handler }) {
    const router = express.Router();

    // POST /templates - Create a new template
    router.post('/', auth_middleware, async (req, res, next) => {
        try {
            const principal_id = req.principal.id;
            const template_data = req.body;

            const template = await post_template_service.create_template(principal_id, template_data);

            res.status(201).json({
                data: template
            });
        } catch (error) {
            if (error.message === 'TEMPLATE_NAME_AND_BODY_REQUIRED') {
                return res.status(400).json({
                    errors: [{
                        error_code: 'TEMPLATE_NAME_AND_BODY_REQUIRED',
                        error_description: 'Template name and body are required',
                        error_severity: 'error'
                    }]
                });
            }
            next(error);
        }
    });

    // GET /templates - List templates with optional filters
    router.get('/', auth_middleware, async (req, res, next) => {
        try {
            const principal_id = req.principal.id;
            const filters = {
                name: req.query.name,
                default_channel_id: req.query.default_channel_id,
                limit: req.query.limit ? parseInt(req.query.limit) : undefined,
                offset: req.query.offset ? parseInt(req.query.offset) : undefined
            };

            const result = await post_template_service.list_templates(principal_id, filters);

            res.status(200).json({
                data: result.templates,
                meta: {
                    total: result.total,
                    limit: filters.limit,
                    offset: filters.offset
                }
            });
        } catch (error) {
            next(error);
        }
    });

    // GET /templates/:id - Get a specific template
    router.get('/:id', auth_middleware, async (req, res, next) => {
        try {
            const principal_id = req.principal.id;
            const template_id = req.params.id;

            const template = await post_template_service.get_template(principal_id, template_id);

            res.status(200).json({
                data: template
            });
        } catch (error) {
            if (error.message === 'TEMPLATE_NOT_FOUND') {
                return res.status(404).json({
                    errors: [{
                        error_code: 'TEMPLATE_NOT_FOUND',
                        error_description: 'Template not found',
                        error_severity: 'error'
                    }]
                });
            }
            if (error.message === 'TEMPLATE_ACCESS_DENIED') {
                return res.status(403).json({
                    errors: [{
                        error_code: 'TEMPLATE_ACCESS_DENIED',
                        error_description: 'You do not have access to this template',
                        error_severity: 'error'
                    }]
                });
            }
            next(error);
        }
    });

    // PATCH /templates/:id - Update a template
    router.patch('/:id', auth_middleware, async (req, res, next) => {
        try {
            const principal_id = req.principal.id;
            const template_id = req.params.id;
            const updates = req.body;

            const template = await post_template_service.update_template(principal_id, template_id, updates);

            res.status(200).json({
                data: template
            });
        } catch (error) {
            if (error.message === 'TEMPLATE_NOT_FOUND') {
                return res.status(404).json({
                    errors: [{
                        error_code: 'TEMPLATE_NOT_FOUND',
                        error_description: 'Template not found',
                        error_severity: 'error'
                    }]
                });
            }
            if (error.message === 'TEMPLATE_ACCESS_DENIED') {
                return res.status(403).json({
                    errors: [{
                        error_code: 'TEMPLATE_ACCESS_DENIED',
                        error_description: 'You do not have access to this template',
                        error_severity: 'error'
                    }]
                });
            }
            next(error);
        }
    });

    // DELETE /templates/:id - Delete a template
    router.delete('/:id', auth_middleware, async (req, res, next) => {
        try {
            const principal_id = req.principal.id;
            const template_id = req.params.id;

            await post_template_service.delete_template(principal_id, template_id);

            res.status(204).send();
        } catch (error) {
            if (error.message === 'TEMPLATE_NOT_FOUND') {
                return res.status(404).json({
                    errors: [{
                        error_code: 'TEMPLATE_NOT_FOUND',
                        error_description: 'Template not found',
                        error_severity: 'error'
                    }]
                });
            }
            if (error.message === 'TEMPLATE_ACCESS_DENIED') {
                return res.status(403).json({
                    errors: [{
                        error_code: 'TEMPLATE_ACCESS_DENIED',
                        error_description: 'You do not have access to this template',
                        error_severity: 'error'
                    }]
                });
            }
            next(error);
        }
    });

    // POST /templates/:id/render - Render template with placeholder values
    router.post('/:id/render', auth_middleware, async (req, res, next) => {
        try {
            const principal_id = req.principal.id;
            const template_id = req.params.id;
            const values = req.body.values || {};

            const result = await post_template_service.render_template(principal_id, template_id, values);

            res.status(200).json({
                data: result
            });
        } catch (error) {
            if (error.message === 'TEMPLATE_NOT_FOUND') {
                return res.status(404).json({
                    errors: [{
                        error_code: 'TEMPLATE_NOT_FOUND',
                        error_description: 'Template not found',
                        error_severity: 'error'
                    }]
                });
            }
            if (error.message === 'TEMPLATE_ACCESS_DENIED') {
                return res.status(403).json({
                    errors: [{
                        error_code: 'TEMPLATE_ACCESS_DENIED',
                        error_description: 'You do not have access to this template',
                        error_severity: 'error'
                    }]
                });
            }
            if (error.message.startsWith('MISSING_PLACEHOLDER_VALUES')) {
                return res.status(400).json({
                    errors: [{
                        error_code: 'MISSING_PLACEHOLDER_VALUES',
                        error_description: error.message,
                        error_severity: 'error'
                    }]
                });
            }
            next(error);
        }
    });

    return router;
}

module.exports = create_post_template_routes;
