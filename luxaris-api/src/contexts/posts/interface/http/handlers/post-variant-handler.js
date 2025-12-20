/**
 * Post Variant Handler
 * 
 * Handles HTTP requests for post variant operations
 */
class PostVariantHandler {
    
    constructor(post_variant_service) {
        this.post_variant_service = post_variant_service;
    }

    /**
     * POST /api/v1/posts/:post_id/variants
     * Create a new variant for a post
     */
    async create_variant(req, res, next) {
        try {
            const variant_data = {
                post_id: req.params.post_id,
                channel_id: req.body.channel_id,
                content: req.body.content,
                media: req.body.media || {},
                tone: req.body.tone,
                metadata: req.body.metadata || {}
            };

            const variant = await this.post_variant_service.create_variant(req.principal, variant_data);

            res.status(201).json({
                data: {
                    id: variant.id,
                    post_id: variant.post_id,
                    channel_id: variant.channel_id,
                    content: variant.content,
                    media: variant.media,
                    tone: variant.tone,
                    source: variant.source,
                    status: variant.status,
                    metadata: variant.metadata,
                    created_at: variant.created_at,
                    updated_at: variant.updated_at
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
                        error_description: 'You do not have permission to create variants for this post',
                        error_severity: 'error'
                    }]
                });
            }
            if (error.error_code === 'CHANNEL_NOT_FOUND') {
                return res.status(404).json({
                    errors: [{
                        error_code: error.error_code,
                        error_description: error.message,
                        error_severity: 'error'
                    }]
                });
            }
            if (error.error_code === 'CHANNEL_NOT_ACTIVE') {
                return res.status(400).json({
                    errors: [{
                        error_code: error.error_code,
                        error_description: error.message,
                        error_severity: 'error'
                    }]
                });
            }
            if (error.error_code === 'VARIANT_CONTENT_REQUIRED') {
                return res.status(400).json({
                    errors: [{
                        error_code: 'VARIANT_CONTENT_REQUIRED',
                        error_description: 'Variant content is required',
                        error_severity: 'error'
                    }]
                });
            }
            if (error.error_code === 'NO_ACTIVE_CONNECTION') {
                return res.status(400).json({
                    errors: [{
                        error_code: 'NO_ACTIVE_CONNECTION',
                        error_description: error.message,
                        error_severity: 'error'
                    }]
                });
            }
            if (error.error_code === 'VARIANT_ALREADY_EXISTS') {
                return res.status(409).json({
                    errors: [{
                        error_code: 'VARIANT_ALREADY_EXISTS',
                        error_description: error.message,
                        error_severity: 'error'
                    }]
                });
            }
            next(error);
        }
    }

    /**
     * GET /api/v1/posts/:post_id/variants
     * List variants for a post
     */
    async list_variants(req, res, next) {
        try {
            const variants = await this.post_variant_service.list_variants_by_post(req.principal, req.params.post_id);

            res.json({
                data: variants.map(variant => ({
                    id: variant.id,
                    post_id: variant.post_id,
                    channel_id: variant.channel_id,
                    channel_connection_id: variant.channel_connection_id,
                    content: variant.content,
                    media: variant.media,
                    tone: variant.tone,
                    source: variant.source,
                    status: variant.status,
                    metadata: variant.metadata,
                    created_at: variant.created_at,
                    updated_at: variant.updated_at,
                    published_at: variant.published_at,
                    channel: variant.channel
                }))
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
                        error_description: 'You do not have permission to access variants for this post',
                        error_severity: 'error'
                    }]
                });
            }
            next(error);
        }
    }

    /**
     * GET /api/v1/variants/:id
     * Get a specific variant
     */
    async get_variant(req, res, next) {
        try {
            const variant = await this.post_variant_service.get_variant(req.principal, req.params.id);

            res.json({
                data: {
                    id: variant.id,
                    post_id: variant.post_id,
                    channel_id: variant.channel_id,

                    content: variant.content,
                    media: variant.media,
                    tone: variant.tone,
                    source: variant.source,
                    status: variant.status,
                    metadata: variant.metadata,
                    created_at: variant.created_at,
                    updated_at: variant.updated_at,
                    published_at: variant.published_at
                }
            });
        } catch (error) {
            if (error.error_code === 'VARIANT_NOT_FOUND') {
                return res.status(404).json({
                    errors: [{
                        error_code: 'VARIANT_NOT_FOUND',
                        error_description: 'Variant not found',
                        error_severity: 'error'
                    }]
                });
            }
            if (error.error_code === 'VARIANT_ACCESS_DENIED') {
                return res.status(403).json({
                    errors: [{
                        error_code: 'VARIANT_ACCESS_DENIED',
                        error_description: 'You do not have permission to access this variant',
                        error_severity: 'error'
                    }]
                });
            }
            next(error);
        }
    }

    /**
     * PATCH /api/v1/variants/:id
     * Update a variant
     */
    async update_variant(req, res, next) {
        try {
            const updates = {};
      
            if (req.body.content !== undefined) {
                updates.content = req.body.content;
            }
            if (req.body.media !== undefined) {
                updates.media = req.body.media;
            }
            if (req.body.tone !== undefined) {
                updates.tone = req.body.tone;
            }
            if (req.body.metadata !== undefined) {
                updates.metadata = req.body.metadata;
            }

            const variant = await this.post_variant_service.update_variant(req.principal, req.params.id, updates);

            res.json({
                data: {
                    id: variant.id,
                    post_id: variant.post_id,
                    channel_id: variant.channel_id,
                    channel_connection_id: variant.channel_connection_id,
                    content: variant.content,
                    media: variant.media,
                    tone: variant.tone,
                    source: variant.source,
                    status: variant.status,
                    metadata: variant.metadata,
                    created_at: variant.created_at,
                    updated_at: variant.updated_at,
                    published_at: variant.published_at
                }
            });
        } catch (error) {
            if (error.error_code === 'VARIANT_NOT_FOUND') {
                return res.status(404).json({
                    errors: [{
                        error_code: 'VARIANT_NOT_FOUND',
                        error_description: 'Variant not found',
                        error_severity: 'error'
                    }]
                });
            }
            if (error.error_code === 'VARIANT_ACCESS_DENIED') {
                return res.status(403).json({
                    errors: [{
                        error_code: 'VARIANT_ACCESS_DENIED',
                        error_description: 'You do not have permission to update this variant',
                        error_severity: 'error'
                    }]
                });
            }
            if (error.error_code === 'VARIANT_ALREADY_PUBLISHED') {
                return res.status(409).json({
                    errors: [{
                        error_code: 'VARIANT_ALREADY_PUBLISHED',
                        error_description: error.message,
                        error_severity: 'error'
                    }]
                });
            }
            if (error.error_code === 'VARIANT_CONTENT_REQUIRED') {
                return res.status(400).json({
                    errors: [{
                        error_code: 'VARIANT_CONTENT_REQUIRED',
                        error_description: 'Variant content cannot be empty',
                        error_severity: 'error'
                    }]
                });
            }
            next(error);
        }
    }

    /**
     * POST /api/v1/variants/:id/mark-ready
     * Mark variant as ready for scheduling
     */
    async mark_ready(req, res, next) {
        try {
            const variant = await this.post_variant_service.mark_as_ready(req.principal, req.params.id);

            res.json({
                data: {
                    id: variant.id,
                    post_id: variant.post_id,
                    channel_id: variant.channel_id,
                    channel_connection_id: variant.channel_connection_id,
                    content: variant.content,
                    media: variant.media,
                    tone: variant.tone,
                    source: variant.source,
                    status: variant.status,
                    metadata: variant.metadata,
                    created_at: variant.created_at,
                    updated_at: variant.updated_at,
                    published_at: variant.published_at
                }
            });
        } catch (error) {
            if (error.error_code === 'VARIANT_NOT_FOUND') {
                return res.status(404).json({
                    errors: [{
                        error_code: 'VARIANT_NOT_FOUND',
                        error_description: 'Variant not found',
                        error_severity: 'error'
                    }]
                });
            }
            if (error.error_code === 'VARIANT_ACCESS_DENIED') {
                return res.status(403).json({
                    errors: [{
                        error_code: 'VARIANT_ACCESS_DENIED',
                        error_description: 'You do not have permission to mark this variant as ready',
                        error_severity: 'error'
                    }]
                });
            }
            if (error.error_code === 'VARIANT_NOT_DRAFT') {
                return res.status(400).json({
                    errors: [{
                        error_code: 'VARIANT_NOT_DRAFT',
                        error_description: 'Only draft variants can be marked as ready',
                        error_severity: 'error'
                    }]
                });
            }
            next(error);
        }
    }

    /**
     * DELETE /api/v1/variants/:id
     * Delete a variant
     */
    async delete_variant(req, res, next) {
        try {
            await this.post_variant_service.delete_variant(req.principal, req.params.id);

            res.status(204).send();
        } catch (error) {
            if (error.error_code === 'VARIANT_NOT_FOUND') {
                return res.status(404).json({
                    errors: [{
                        error_code: 'VARIANT_NOT_FOUND',
                        error_description: 'Variant not found',
                        error_severity: 'error'
                    }]
                });
            }
            if (error.error_code === 'VARIANT_ACCESS_DENIED') {
                return res.status(403).json({
                    errors: [{
                        error_code: 'VARIANT_ACCESS_DENIED',
                        error_description: 'You do not have permission to delete this variant',
                        error_severity: 'error'
                    }]
                });
            }
            if (error.error_code === 'VARIANT_ALREADY_PUBLISHED') {
                return res.status(409).json({
                    errors: [{
                        error_code: 'VARIANT_ALREADY_PUBLISHED',
                        error_description: error.message,
                        error_severity: 'error'
                    }]
                });
            }
            next(error);
        }
    }
}

module.exports = PostVariantHandler;
