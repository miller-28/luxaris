/**
 * PostService
 * 
 * Business logic for managing posts.
 */
class PostService {
    constructor(post_repository, event_registry, logger) {
        this.post_repository = post_repository;
        this.event_registry = event_registry;
        this.logger = logger;
    }

    /**
	 * Create a new post
	 */
    async create_post(principal, post_data) {
        this.logger.info('Creating post', { principal_id: principal.id });

        // Set owner
        post_data.owner_principal_id = principal.id;

        // Validate base content
        if (!post_data.base_content || post_data.base_content.trim().length === 0) {
            const error = new Error('Base content is required');
            error.status_code = 400;
            error.error_code = 'BASE_CONTENT_REQUIRED';
            error.severity = 'error';
            throw error;
        }

        // Create post
        const post = await this.post_repository.create(post_data);

        // Record event
        await this.event_registry.record('post', 'POST_CREATED', {
            resource_type: 'post',
            resource_id: post.id,
            principal_id: principal.id,
            principal_type: 'user',
            metadata: {
                status: post.status,
                tags: post.tags
            }
        });

        this.logger.info('Post created', { 
            post_id: post.id, 
            owner_id: principal.id,
            status: post.status
        });

        return post;
    }

    /**
	 * Get a post by ID
	 */
    async get_post(principal, post_id) {
        const post = await this.post_repository.find_by_id(post_id);

        if (!post) {
            const error = new Error('Post not found');
            error.status_code = 404;
            error.error_code = 'POST_NOT_FOUND';
            error.severity = 'error';
            throw error;
        }

        // Verify ownership
        if (post.owner_principal_id !== principal.id) {
            const error = new Error('Access denied to this post');
            error.status_code = 403;
            error.error_code = 'POST_ACCESS_DENIED';
            error.severity = 'error';
            throw error;
        }

        return post;
    }

    /**
	 * List posts for a principal
	 */
    async list_posts(principal, filters = {}) {
        this.logger.info('Listing posts', { 
            principal_id: principal.id,
            filters
        });

        const posts = await this.post_repository.list_by_owner(principal.id, filters);
        const total = await this.post_repository.count_by_owner(principal.id, filters);

        this.logger.info('Posts listed', { 
            principal_id: principal.id,
            count: posts.length,
            total
        });

        return {
            posts,
            total,
            limit: filters.limit || 50,
            offset: filters.offset || 0
        };
    }

    /**
	 * Update a post
	 */
    async update_post(principal, post_id, updates) {
        // Get post and verify ownership
        const post = await this.get_post(principal, post_id);

        this.logger.info('Updating post', { 
            post_id: post.id, 
            owner_id: principal.id
        });

        // Validate updates
        if (updates.base_content !== undefined && updates.base_content.trim().length === 0) {
            const error = new Error('Base content is required');
            error.status_code = 400;
            error.error_code = 'BASE_CONTENT_REQUIRED';
            error.severity = 'error';
            throw error;
        }

        // Prevent direct status updates (use dedicated methods)
        if (updates.status !== undefined) {
            delete updates.status;
        }

        // Update post
        const updated_post = await this.post_repository.update(post_id, updates);

        // Record event
        await this.event_registry.record('post', 'POST_UPDATED', {
            resource_type: 'post',
            resource_id: updated_post.id,
            principal_id: principal.id,
            principal_type: 'user',
            metadata: {
                status: updated_post.status
            }
        });

        this.logger.info('Post updated', { 
            post_id: updated_post.id, 
            owner_id: principal.id
        });

        return updated_post;
    }

    /**
	 * Delete a post
	 */
    async delete_post(principal, post_id) {
        // Get post and verify ownership
        const post = await this.get_post(principal, post_id);

        this.logger.info('Deleting post', { 
            post_id: post.id, 
            owner_id: principal.id
        });

        // Delete post (will cascade to variants)
        await this.post_repository.delete(post_id);

        // Record event
        await this.event_registry.record('post', 'POST_DELETED', {
            resource_type: 'post',
            resource_id: post.id,
            principal_id: principal.id,
            principal_type: 'user',
            metadata: {
                status: post.status
            }
        });

        this.logger.info('Post deleted', { 
            post_id: post.id, 
            owner_id: principal.id
        });

        return true;
    }

    /**
	 * Update post status
	 */
    async update_post_status(post_id, status) {
        const post = await this.post_repository.update_status(post_id, status);

        this.logger.info('Post status updated', { 
            post_id: post.id,
            old_status: post.status,
            new_status: status
        });

        return post;
    }
}

module.exports = PostService;
