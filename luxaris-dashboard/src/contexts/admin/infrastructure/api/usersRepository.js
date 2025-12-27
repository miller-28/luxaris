/**
 * Users Repository
 * Handles all API calls for user management (admin)
 */
import { AbstractRepository } from '@/shared/api/AbstractRepository';

class UsersRepository extends AbstractRepository {
    
    constructor() {
        super('/system/users');
    }

    /**
     * List all users with optional filters and pagination
     * GET /api/v1/system/users
     */
    async list(filters = {}, pagination = {}) {
        const query = this.buildQueryParams(filters, pagination);
        return await this.get('', { query });
    }

    /**
     * Get single user by ID
     * GET /api/v1/system/users/:id
     */
    async getById(id) {
        return await this.get(`/${id}`);
    }

    /**
     * Approve a pending user
     * POST /api/v1/system/users/:id/approve
     */
    async approve(id) {
        return await this.post(`/${id}/approve`);
    }

    /**
     * Disable a user account
     * POST /api/v1/system/users/:id/disable
     */
    async disable(id) {
        return await this.post(`/${id}/disable`);
    }

    /**
     * Enable a disabled user account
     * POST /api/v1/system/users/:id/enable
     */
    async enable(id) {
        return await this.post(`/${id}/enable`);
    }

    /**
     * Delete user (soft delete)
     * DELETE /api/v1/system/users/:id
     */
    async remove(id) {
        return await this.delete(`/${id}`);
    }

    /**
     * Update user
     * PATCH /api/v1/system/users/:id
     */
    async update(id, updateData) {
        return await this.patch(`/${id}`, updateData);
    }
}

export const usersRepository = new UsersRepository();
