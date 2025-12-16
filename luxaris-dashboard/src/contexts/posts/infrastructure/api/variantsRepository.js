/**
 * Post Variants Repository
 * Handles all API calls for post variants
 */
import { AbstractRepository } from '@/shared/api/AbstractRepository';

class VariantsRepository extends AbstractRepository {

    constructor() {
        super('/posts');
    }

    /**
     * List variants for a post
     * GET /api/v1/posts/:post_id/variants
     */
    async list(postId) {
        return await this.get(`/${postId}/variants`);
    }

    /**
     * Create new variant for a post
     * POST /api/v1/posts/:post_id/variants
     */
    async create(postId, variantData) {
        return await this.post(`/${postId}/variants`, variantData);
    }

    /**
     * Update existing variant
     * PATCH /api/v1/posts/:post_id/variants/:id
     */
    async update(postId, variantId, variantData) {
        return await this.patch(`/${postId}/variants/${variantId}`, variantData);
    }

    /**
     * Delete variant (soft delete)
     * DELETE /api/v1/posts/:post_id/variants/:id
     */
    async remove(postId, variantId) {
        return await this.delete(`/${postId}/variants/${variantId}`);
    }
}

export const variantsRepository = new VariantsRepository();
