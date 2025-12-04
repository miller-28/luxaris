const express = require('express');

/**
 * Create generation routes
 */
function create_generation_routes({ generation_service, auth_middleware, error_handler }) {
    const router = express.Router();

    // POST /generate - Generate content suggestions
    router.post('/generate', auth_middleware, async (req, res, next) => {
        try {
            const principal_id = req.principal.id;
            const generation_params = {
                prompt: req.body.prompt,
                template_id: req.body.template_id,
                post_id: req.body.post_id,
                channel_ids: req.body.channel_ids,
                constraints: req.body.constraints || {}
            };

            const result = await generation_service.generate_suggestions(principal_id, generation_params);

            res.status(201).json({
                data: {
                    session: result.session,
                    suggestions: result.suggestions
                }
            });
        } catch (error) {
            if (error.message === 'PROMPT_REQUIRED') {
                return res.status(400).json({
                    errors: [{
                        error_code: 'PROMPT_REQUIRED',
                        error_description: 'Prompt is required for content generation',
                        error_severity: 'error'
                    }]
                });
            }
            if (error.message === 'CHANNEL_IDS_REQUIRED') {
                return res.status(400).json({
                    errors: [{
                        error_code: 'CHANNEL_IDS_REQUIRED',
                        error_description: 'At least one channel ID is required',
                        error_severity: 'error'
                    }]
                });
            }
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
            if (error.message === 'POST_NOT_FOUND') {
                return res.status(404).json({
                    errors: [{
                        error_code: 'POST_NOT_FOUND',
                        error_description: 'Post not found',
                        error_severity: 'error'
                    }]
                });
            }
            if (error.message.startsWith('GENERATION_FAILED')) {
                return res.status(500).json({
                    errors: [{
                        error_code: 'GENERATION_FAILED',
                        error_description: error.message,
                        error_severity: 'error'
                    }]
                });
            }
            next(error);
        }
    });

    // GET /sessions - List generation sessions
    router.get('/sessions', auth_middleware, async (req, res, next) => {
        try {
            const principal_id = req.principal.id;
            const filters = {
                status: req.query.status,
                post_id: req.query.post_id,
                template_id: req.query.template_id,
                limit: req.query.limit ? parseInt(req.query.limit) : undefined,
                offset: req.query.offset ? parseInt(req.query.offset) : undefined
            };

            const result = await generation_service.list_sessions(principal_id, filters);

            res.status(200).json({
                data: result.sessions,
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

    // GET /sessions/:id - Get a specific generation session with suggestions
    router.get('/sessions/:id', auth_middleware, async (req, res, next) => {
        try {
            const principal_id = req.principal.id;
            const session_id = req.params.id;

            const result = await generation_service.get_session(principal_id, session_id);

            res.status(200).json({
                data: {
                    session: result.session,
                    suggestions: result.suggestions
                }
            });
        } catch (error) {
            if (error.message === 'SESSION_NOT_FOUND') {
                return res.status(404).json({
                    errors: [{
                        error_code: 'SESSION_NOT_FOUND',
                        error_description: 'Generation session not found',
                        error_severity: 'error'
                    }]
                });
            }
            if (error.message === 'SESSION_ACCESS_DENIED') {
                return res.status(403).json({
                    errors: [{
                        error_code: 'SESSION_ACCESS_DENIED',
                        error_description: 'You do not have access to this generation session',
                        error_severity: 'error'
                    }]
                });
            }
            next(error);
        }
    });

    // POST /suggestions/:id/accept - Accept a suggestion and create post/variant
    router.post('/suggestions/:id/accept', auth_middleware, async (req, res, next) => {
        try {
            const principal_id = req.principal.id;
            const suggestion_id = req.params.id;
            const options = {
                title: req.body.title,
                tags: req.body.tags,
                tone: req.body.tone,
                media: req.body.media
            };

            const result = await generation_service.accept_suggestion(principal_id, suggestion_id, options);

            res.status(201).json({
                data: {
                    suggestion: result.suggestion,
                    post: result.post,
                    variant: result.variant
                }
            });
        } catch (error) {
            if (error.message === 'SUGGESTION_NOT_FOUND') {
                return res.status(404).json({
                    errors: [{
                        error_code: 'SUGGESTION_NOT_FOUND',
                        error_description: 'Suggestion not found',
                        error_severity: 'error'
                    }]
                });
            }
            if (error.message === 'SUGGESTION_ACCESS_DENIED') {
                return res.status(403).json({
                    errors: [{
                        error_code: 'SUGGESTION_ACCESS_DENIED',
                        error_description: 'You do not have access to this suggestion',
                        error_severity: 'error'
                    }]
                });
            }
            if (error.message === 'SUGGESTION_ALREADY_ACCEPTED') {
                return res.status(400).json({
                    errors: [{
                        error_code: 'SUGGESTION_ALREADY_ACCEPTED',
                        error_description: 'This suggestion has already been accepted',
                        error_severity: 'error'
                    }]
                });
            }
            next(error);
        }
    });

    // DELETE /sessions/:id - Delete a generation session
    router.delete('/sessions/:id', auth_middleware, async (req, res, next) => {
        try {
            const principal_id = req.principal.id;
            const session_id = req.params.id;

            await generation_service.delete_session(principal_id, session_id);

            res.status(204).send();
        } catch (error) {
            if (error.message === 'SESSION_NOT_FOUND') {
                return res.status(404).json({
                    errors: [{
                        error_code: 'SESSION_NOT_FOUND',
                        error_description: 'Generation session not found',
                        error_severity: 'error'
                    }]
                });
            }
            if (error.message === 'SESSION_ACCESS_DENIED') {
                return res.status(403).json({
                    errors: [{
                        error_code: 'SESSION_ACCESS_DENIED',
                        error_description: 'You do not have access to this generation session',
                        error_severity: 'error'
                    }]
                });
            }
            next(error);
        }
    });

    return router;
}

module.exports = create_generation_routes;
