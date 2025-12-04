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
			throw new Error('POST_NOT_FOUND');
		}

		if (post.owner_principal_id !== principal.id) {
			throw new Error('POST_ACCESS_DENIED');
		}

		// Validate channel is active
		await this.channel_service.validate_channel_active(variant_data.channel_id);

		// Validate content
		if (!variant_data.content || variant_data.content.trim().length === 0) {
			throw new Error('VARIANT_CONTENT_REQUIRED');
		}

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
			throw new Error('VARIANT_NOT_FOUND');
		}

		// Verify ownership via post
		const post = await this.post_repository.find_by_id(variant.post_id);
		if (post.owner_principal_id !== principal.id) {
			throw new Error('VARIANT_ACCESS_DENIED');
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
			throw new Error('POST_NOT_FOUND');
		}

		if (post.owner_principal_id !== principal.id) {
			throw new Error('POST_ACCESS_DENIED');
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
			throw new Error('VARIANT_ALREADY_PUBLISHED');
		}

		// Validate content if being updated
		if (updates.content !== undefined && updates.content.trim().length === 0) {
			throw new Error('VARIANT_CONTENT_REQUIRED');
		}

		// Prevent direct status updates (use dedicated methods)
		if (updates.status !== undefined) {
			delete updates.status;
		}

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
			throw new Error('VARIANT_NOT_DRAFT');
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
			throw new Error('VARIANT_ALREADY_PUBLISHED');
		}

		// Delete variant
		await this.post_variant_repository.delete(variant_id);

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
