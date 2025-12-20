/**
 * PostVariantService
 * 
 * Business logic for managing post variants.
 */
class PostVariantService {

    constructor(post_variant_repository, post_repository, channel_service, event_registry, logger) {
        this.post_variant_repository = post_variant_repository;
        this.post_repository = post_repository;
        this.channel_service = channel_service;
        this.event_registry = event_registry;
        this.logger = logger;
    }

    /**
	 * Create a new post variant
	 */
    async create_variant(principal, variant_data) {
        
        this.logger.info('Creating post variant', { 
            principal_id: principal.id,
            post_id: variant_data.post_id,
            channel_id: variant_data.channel_id
        });

        // Verify post exists and ownership
        const post = await this.post_repository.find_by_id(variant_data.post_id);
        if (!post) {
            const error = new Error('Post not found');
            error.status_code = 404;
            error.error_code = 'POST_NOT_FOUND';
            error.severity = 'error';
            throw error;
        }

        if (post.owner_principal_id !== principal.id) {
            const error = new Error('Access denied to this post');
            error.status_code = 403;
            error.error_code = 'POST_ACCESS_DENIED';
            error.severity = 'error';
            throw error;
        }

        // Validate channel is active
        await this.channel_service.validate_channel_active(variant_data.channel_id);

        // Resolve active connection for this channel (global platform connection)
        const active_connection = await this.channel_service.get_active_connection_for_channel(variant_data.channel_id);
        
        if (!active_connection) {
            const error = new Error('No active connection found for this channel. Please connect your account first.');
            error.status_code = 400;
            error.error_code = 'NO_ACTIVE_CONNECTION';
            error.severity = 'error';
            throw error;
        }

        // Check if an active variant already exists for this post and channel
        const existing_variant = await this.post_variant_repository.find_by_post_and_channel(
            variant_data.post_id,
            variant_data.channel_id
        );

        if (existing_variant) {
            const error = new Error('An active variant already exists for this channel. Only one variant per channel is allowed.');
            error.status_code = 409;
            error.error_code = 'VARIANT_ALREADY_EXISTS';
            error.severity = 'error';
            throw error;
        }

        // Connection will be resolved dynamically at publish time
        // No need to store it in the variant

        // Validate content
        if (!variant_data.content || variant_data.content.trim().length === 0) {
            const error = new Error('Variant content is required');
            error.status_code = 400;
            error.error_code = 'VARIANT_CONTENT_REQUIRED';
            error.severity = 'error';
            throw error;
        }

        // Set creator
        variant_data.created_by_user_id = principal.id;

        // Create variant
        const variant = await this.post_variant_repository.create(variant_data);

        // Record event
        await this.event_registry.record('post', 'VARIANT_CREATED', {
            resource_type: 'post_variant',
            resource_id: variant.id,
            principal_id: principal.id,
            principal_type: 'user',
            metadata: {
                post_id: variant.post_id,
                channel_id: variant.channel_id,
                status: variant.status
            }
        });

        this.logger.info('Post variant created', { 
            variant_id: variant.id,
            post_id: variant.post_id,
            channel_id: variant.channel_id,
            owner_id: principal.id
        });

        return variant;
    }

    /**
	 * Get a variant by ID
	 */
    async get_variant(principal, variant_id) {
        const variant = await this.post_variant_repository.find_by_id(variant_id);

        if (!variant) {
            const error = new Error('Variant not found');
            error.status_code = 404;
            error.error_code = 'VARIANT_NOT_FOUND';
            error.severity = 'error';
            throw error;
        }

        // Verify ownership via post
        const post = await this.post_repository.find_by_id(variant.post_id);
        if (post.owner_principal_id !== principal.id) {
            const error = new Error('Access denied to this variant');
            error.status_code = 403;
            error.error_code = 'VARIANT_ACCESS_DENIED';
            error.severity = 'error';
            throw error;
        }

        return variant;
    }

    /**
	 * List variants by post
	 */
    async list_variants_by_post(principal, post_id) {
        // Verify post exists and ownership
        const post = await this.post_repository.find_by_id(post_id);
        if (!post) {
            const error = new Error('Post not found');
            error.status_code = 404;
            error.error_code = 'POST_NOT_FOUND';
            error.severity = 'error';
            throw error;
        }

        if (post.owner_principal_id !== principal.id) {
            const error = new Error('Access denied to this post');
            error.status_code = 403;
            error.error_code = 'POST_ACCESS_DENIED';
            error.severity = 'error';
            throw error;
        }

        this.logger.info('Listing variants by post', { 
            principal_id: principal.id,
            post_id
        });

        const variants = await this.post_variant_repository.list_by_post(post_id);

        this.logger.info('Variants listed', { 
            principal_id: principal.id,
            post_id,
            count: variants.length
        });

        return variants;
    }

    /**
	 * List variants for a principal
	 */
    async list_variants(principal, filters = {}) {
        this.logger.info('Listing variants', { 
            principal_id: principal.id,
            filters
        });

        const variants = await this.post_variant_repository.list_by_owner(principal.id, filters);
        const total = await this.post_variant_repository.count_by_owner(principal.id, filters);

        this.logger.info('Variants listed', { 
            principal_id: principal.id,
            count: variants.length,
            total
        });

        return {
            variants,
            total,
            limit: filters.limit || 50,
            offset: filters.offset || 0
        };
    }

    /**
	 * Update a variant
	 */
    async update_variant(principal, variant_id, updates) {
        // Get variant and verify ownership
        const variant = await this.get_variant(principal, variant_id);

        this.logger.info('Updating variant', { 
            variant_id: variant.id,
            owner_id: principal.id
        });

        // Prevent updating published variants
        if (variant.status === 'published') {
            const error = new Error('Variant already published');
            error.status_code = 409;
            error.error_code = 'VARIANT_ALREADY_PUBLISHED';
            error.severity = 'error';
            throw error;
        }

        // Validate content if being updated
        if (updates.content !== undefined && updates.content.trim().length === 0) {
            const error = new Error('Variant content is required');
            error.status_code = 400;
            error.error_code = 'VARIANT_CONTENT_REQUIRED';
            error.severity = 'error';
            throw error;
        }

        // Prevent direct status updates (use dedicated methods)
        if (updates.status !== undefined) {
            delete updates.status;
        }

        // Set updater
        updates.updated_by_user_id = principal.id;

        // Update variant
        const updated_variant = await this.post_variant_repository.update(variant_id, updates);

        // Record event
        await this.event_registry.record('post', 'VARIANT_UPDATED', {
            resource_type: 'post_variant',
            resource_id: updated_variant.id,
            principal_id: principal.id,
            principal_type: 'user',
            metadata: {
                post_id: updated_variant.post_id,
                status: updated_variant.status
            }
        });

        this.logger.info('Variant updated', { 
            variant_id: updated_variant.id,
            owner_id: principal.id
        });

        return updated_variant;
    }

    /**
	 * Mark variant as ready for scheduling
	 */
    async mark_as_ready(principal, variant_id) {
        // Get variant and verify ownership
        const variant = await this.get_variant(principal, variant_id);

        this.logger.info('Marking variant as ready', { 
            variant_id: variant.id,
            owner_id: principal.id
        });

        // Can only mark draft variants as ready
        if (variant.status !== 'draft') {
            const error = new Error('Only draft variants can be marked as ready');
            error.status_code = 400;
            error.error_code = 'VARIANT_NOT_DRAFT';
            error.severity = 'error';
            throw error;
        }

        // Update status to ready
        const updated_variant = await this.post_variant_repository.update_status(variant_id, 'ready');

        // Record event
        await this.event_registry.record('post', 'VARIANT_READY', {
            resource_type: 'post_variant',
            resource_id: updated_variant.id,
            principal_id: principal.id,
            principal_type: 'user',
            metadata: {
                post_id: updated_variant.post_id,
                channel_id: updated_variant.channel_id
            }
        });

        this.logger.info('Variant marked as ready', { 
            variant_id: updated_variant.id,
            owner_id: principal.id
        });

        return updated_variant;
    }

    /**
	 * Delete a variant
	 */
    async delete_variant(principal, variant_id) {
        // Get variant and verify ownership
        const variant = await this.get_variant(principal, variant_id);

        this.logger.info('Deleting variant', { 
            variant_id: variant.id,
            owner_id: principal.id
        });

        // Cannot delete published variants
        if (variant.status === 'published') {
            const error = new Error('Cannot delete published variant');
            error.status_code = 409;
            error.error_code = 'VARIANT_ALREADY_PUBLISHED';
            error.severity = 'error';
            throw error;
        }

        // Delete variant
        await this.post_variant_repository.delete(variant_id, principal.id);

        // Record event
        await this.event_registry.record('post', 'VARIANT_DELETED', {
            resource_type: 'post_variant',
            resource_id: variant.id,
            principal_id: principal.id,
            principal_type: 'user',
            metadata: {
                post_id: variant.post_id,
                channel_id: variant.channel_id
            }
        });

        this.logger.info('Variant deleted', { 
            variant_id: variant.id,
            owner_id: principal.id
        });

        return true;
    }
}

module.exports = PostVariantService;
