/**
 * Posts Repository
 * Handles all API calls for posts
 */
import { AbstractRepository } from '@/shared/api/AbstractRepository';

class PostsRepository extends AbstractRepository {
    
    constructor() {
        super('/posts');
    }

    /**
     * List posts with optional filters and pagination
     * GET /api/v1/posts
     */
    async list(filters = {}, pagination = {}) {
        const query = this.buildQueryParams(filters, pagination);
        return await this.get('', { query });
    }

    /**
     * Get single post by ID
     * GET /api/v1/posts/:id
     */
    async getById(id) {
        return await this.get(`/${id}`);
    }

    /**
     * Create new post
     * POST /api/v1/posts
     */
    async create(postData) {
        return await this.post('', postData);
    }

    /**
     * Update existing post
     * PATCH /api/v1/posts/:id
     */
    async update(id, postData) {
        return await this.patch(`/${id}`, postData);
    }

    /**
     * Delete post (soft delete)
     * DELETE /api/v1/posts/:id
     */
    async remove(id) {
        return await this.delete(`/${id}`);
    }

    /**
     * Get posts statistics
     * GET /api/v1/posts/stats
     */
    async getStats() {
        return await this.get('/stats');
    }
}

export const postsRepository = new PostsRepository();
