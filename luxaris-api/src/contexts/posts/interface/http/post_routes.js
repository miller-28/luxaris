const express = require('express');

/**
 * Post Routes
 * 
 * HTTP endpoints for posts management
 */
function create_post_routes(dependencies) {
    const router = express.Router();
    const {
        post_service,
        auth_middleware,
        error_handler
    } = dependencies;

    /**
   * POST /api/v1/posts
   * Create a new post
   */
    router.post('/', auth_middleware, async (req, res, next) => {
        try {
            const post_data = {
                title: req.body.title,
                base_content: req.body.base_content,
                tags: req.body.tags || [],
                metadata: req.body.metadata || {}
            };

            const post = await post_service.create_post(req.principal, post_data);

            res.status(201).json({
                data: {
                    id: post.id,
                    title: post.title,
                    base_content: post.base_content,
                    tags: post.tags,
                    status: post.status,
                    metadata: post.metadata,
                    created_at: post.created_at,
                    updated_at: post.updated_at
                }
            });
        } catch (error) {
            if (error.error_code === 'BASE_CONTENT_REQUIRED') {
                return res.status(400).json({
                    errors: [{
                        error_code: 'BASE_CONTENT_REQUIRED',
                        error_description: 'Base content is required',
                        error_severity: 'error'
                    }]
                });
            }
            next(error);
        }
    });

    /**
   * GET /api/v1/posts
   * List user's posts
   */
    router.get('/', auth_middleware, async (req, res, next) => {
        try {
            const filters = {
                status: req.query.status,
                tags: req.query.tags ? req.query.tags.split(',') : undefined,
                limit: Math.min(parseInt(req.query.limit) || 50, 100),
                offset: parseInt(req.query.offset) || 0
            };

            const result = await post_service.list_posts(req.principal, filters);

            res.json({
                data: result.posts.map(post => ({
                    id: post.id,
                    title: post.title,
                    base_content: post.base_content,
                    tags: post.tags,
                    status: post.status,
                    metadata: post.metadata,
                    created_at: post.created_at,
                    updated_at: post.updated_at,
                    published_at: post.published_at
                })),
                pagination: {
                    limit: result.limit,
                    offset: result.offset,
                    total: result.total
                }
            });
        } catch (error) {
            next(error);
        }
    });

    /**
   * GET /api/v1/posts/:id
   * Get a specific post
   */
    router.get('/:id', auth_middleware, async (req, res, next) => {
        try {
            const post = await post_service.get_post(req.principal, req.params.id);

            res.json({
                data: {
                    id: post.id,
                    title: post.title,
                    base_content: post.base_content,
                    tags: post.tags,
                    status: post.status,
                    metadata: post.metadata,
                    created_at: post.created_at,
                    updated_at: post.updated_at,
                    published_at: post.published_at
                }
            });
        } catch (error) {
            if (error.error_code === 'POST_NOT_FOUND') {
                return res.status(404).json({
                    errors: [{
                        error_code: 'POST_NOT_FOUND',
                        error_description: 'Post not found',
                        error_severity: 'error'
                    }]
                });
            }
            if (error.error_code === 'POST_ACCESS_DENIED') {
                return res.status(403).json({
                    errors: [{
                        error_code: 'POST_ACCESS_DENIED',
                        error_description: 'You do not have permission to access this post',
                        error_severity: 'error'
                    }]
                });
            }
            next(error);
        }
    });

    /**
   * PATCH /api/v1/posts/:id
   * Update a post
   */
    router.patch('/:id', auth_middleware, async (req, res, next) => {
        try {
            const updates = {};
      
            if (req.body.title !== undefined) {
                updates.title = req.body.title;
            }
            if (req.body.base_content !== undefined) {
                updates.base_content = req.body.base_content;
            }
            if (req.body.tags !== undefined) {
                updates.tags = req.body.tags;
            }
            if (req.body.metadata !== undefined) {
                updates.metadata = req.body.metadata;
            }

            const post = await post_service.update_post(req.principal, req.params.id, updates);

            res.json({
                data: {
                    id: post.id,
                    title: post.title,
                    base_content: post.base_content,
                    tags: post.tags,
                    status: post.status,
                    metadata: post.metadata,
                    created_at: post.created_at,
                    updated_at: post.updated_at,
                    published_at: post.published_at
                }
            });
        } catch (error) {
            if (error.error_code === 'POST_NOT_FOUND') {
                return res.status(404).json({
                    errors: [{
                        error_code: 'POST_NOT_FOUND',
                        error_description: 'Post not found',
                        error_severity: 'error'
                    }]
                });
            }
            if (error.error_code === 'POST_ACCESS_DENIED') {
                return res.status(403).json({
                    errors: [{
                        error_code: 'POST_ACCESS_DENIED',
                        error_description: 'You do not have permission to update this post',
                        error_severity: 'error'
                    }]
                });
            }
            if (error.error_code === 'BASE_CONTENT_REQUIRED') {
                return res.status(400).json({
                    errors: [{
                        error_code: 'BASE_CONTENT_REQUIRED',
                        error_description: 'Base content cannot be empty',
                        error_severity: 'error'
                    }]
                });
            }
            next(error);
        }
    });

    /**
   * DELETE /api/v1/posts/:id
   * Delete a post
   */
    router.delete('/:id', auth_middleware, async (req, res, next) => {
        try {
            await post_service.delete_post(req.principal, req.params.id);

            res.status(204).send();
        } catch (error) {
            if (error.error_code === 'POST_NOT_FOUND') {
                return res.status(404).json({
                    errors: [{
                        error_code: 'POST_NOT_FOUND',
                        error_description: 'Post not found',
                        error_severity: 'error'
                    }]
                });
            }
            if (error.error_code === 'POST_ACCESS_DENIED') {
                return res.status(403).json({
                    errors: [{
                        error_code: 'POST_ACCESS_DENIED',
                        error_description: 'You do not have permission to delete this post',
                        error_severity: 'error'
                    }]
                });
            }
            next(error);
        }
    });

    // Register error handler
    router.use(error_handler);

    return router;
}

module.exports = create_post_routes;
