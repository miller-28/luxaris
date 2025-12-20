/**
 * Post Variants Repository
 * Handles all API calls for post variants
 */
import { AbstractRepository } from '@/shared/api/AbstractRepository';

class VariantsRepository extends AbstractRepository {

    constructor() {
        super('');
    }

    /**
     * List variants for a post
     * GET /api/v1/posts/:post_id/variants
     */
    async list(postId) {
        return await this.get(`/posts/${postId}/variants`);
    }

    /**
     * Create new variant for a post
     * POST /api/v1/posts/:post_id/variants
     */
    async create(postId, variantData) {
        return await this.post(`/posts/${postId}/variants`, variantData);
    }

    /**
     * Update existing variant
     * PATCH /api/v1/variants/:id
     */
    async update(variantId, variantData) {
        return await this.patch(`/variants/${variantId}`, variantData);
    }

    /**
     * Delete variant (soft delete)
     * DELETE /api/v1/variants/:id
     */
    async remove(postId, variantId) {
        return await this.delete(`/variants/${variantId}`);
    }
}

export const variantsRepository = new VariantsRepository();
