const { createUserUpdateSchema, UserStatus } = require('../../domain/models/user');

class UserService {
    
    constructor(user_repository, acl_service = null, app_data_service = null) {
        this.user_repository = user_repository;
        this.acl_service = acl_service;
        this.app_data_service = app_data_service;
    }

    /**
     * Update user profile (self or admin)
     */
    async update_user(user_id, updates) {
        // Validate updates with timezone validation if app_data_service is available
        let validated_updates;
        if (this.app_data_service) {
            const schema = createUserUpdateSchema(this.app_data_service);
            validated_updates = await schema.parseAsync(updates);
        } else {
            // Fallback to basic validation without timezone check
            const { UserUpdateSchema } = require('../../domain/models/user');
            validated_updates = UserUpdateSchema.parse(updates);
        }

        // Update user in repository
        const updated_user = await this.user_repository.update(user_id, validated_updates);

        if (!updated_user) {
            const error = new Error('User not found');
            error.status_code = 404;
            error.error_code = 'USER_NOT_FOUND';
            error.severity = 'warning';
            throw error;
        }

        return updated_user;
    }

    /**
     * Get user by ID
     */
    async get_user_by_id(user_id) {
        return await this.user_repository.find_by_id(user_id);
    }

    /**
     * List all users with pagination and filters (admin only)
     */
    async list_users(filters = {}, pagination = {}) {
        const { page = 1, per_page = 10 } = pagination;
        const offset = (page - 1) * per_page;

        // Get total count
        const total = await this.user_repository.count_all(filters);

        // Get users
        const users = await this.user_repository.find_all({
            ...filters,
            limit: per_page,
            offset
        });

        return {
            users,
            pagination: {
                total,
                page,
                per_page,
                total_pages: Math.ceil(total / per_page)
            }
        };
    }

    /**
     * Approve a pending user (admin only)
     */
    async approve_user(user_id, approved_by_user_id) {
        const user = await this.user_repository.find_by_id(user_id);

        if (!user) {
            const error = new Error('User not found');
            error.status_code = 404;
            error.error_code = 'USER_NOT_FOUND';
            error.severity = 'error';
            throw error;
        }

        if (user.status !== UserStatus.PENDING_APPROVAL) {
            const error = new Error('User is not pending approval');
            error.status_code = 400;
            error.error_code = 'USER_NOT_PENDING';
            error.severity = 'error';
            throw error;
        }

        return await this.user_repository.approve_user(user_id, approved_by_user_id);
    }

    /**
     * Disable a user account (admin only)
     */
    async disable_user(user_id) {
        const user = await this.user_repository.find_by_id(user_id);

        if (!user) {
            const error = new Error('User not found');
            error.status_code = 404;
            error.error_code = 'USER_NOT_FOUND';
            error.severity = 'error';
            throw error;
        }

        if (user.is_root) {
            const error = new Error('Cannot disable root user');
            error.status_code = 400;
            error.error_code = 'CANNOT_DISABLE_ROOT';
            error.severity = 'error';
            throw error;
        }

        return await this.user_repository.disable_user(user_id);
    }

    /**
     * Enable a disabled user account (admin only)
     */
    async enable_user(user_id) {
        const user = await this.user_repository.find_by_id(user_id);

        if (!user) {
            const error = new Error('User not found');
            error.status_code = 404;
            error.error_code = 'USER_NOT_FOUND';
            error.severity = 'error';
            throw error;
        }

        return await this.user_repository.enable_user(user_id);
    }

    /**
     * Get user by ID (admin access)
     */
    async get_user(user_id) {
        const user = await this.user_repository.find_by_id(user_id);

        if (!user) {
            const error = new Error('User not found');
            error.status_code = 404;
            error.error_code = 'USER_NOT_FOUND';
            error.severity = 'error';
            throw error;
        }

        return user;
    }

    /**
     * Delete a user (soft delete, admin only)
     */
    async delete_user(user_id) {
        const user = await this.user_repository.find_by_id(user_id);

        if (!user) {
            const error = new Error('User not found');
            error.status_code = 404;
            error.error_code = 'USER_NOT_FOUND';
            error.severity = 'error';
            throw error;
        }

        if (user.is_root) {
            const error = new Error('Cannot delete root user');
            error.status_code = 400;
            error.error_code = 'CANNOT_DELETE_ROOT';
            error.severity = 'error';
            throw error;
        }

        return await this.user_repository.delete(user_id);
    }

    /**
     * Update user (admin only)
     */
    async update_user_admin(user_id, update_data, updated_by_user_id) {
        const user = await this.user_repository.find_by_id(user_id);

        if (!user) {
            const error = new Error('User not found');
            error.status_code = 404;
            error.error_code = 'USER_NOT_FOUND';
            error.severity = 'error';
            throw error;
        }

        if (user.is_root) {
            const error = new Error('Cannot update root user');
            error.status_code = 400;
            error.error_code = 'CANNOT_UPDATE_ROOT';
            error.severity = 'error';
            throw error;
        }

        // Prepare update fields
        const allowed_fields = ['name', 'timezone', 'locale'];
        const updates = {};

        for (const field of allowed_fields) {
            if (update_data[field] !== undefined) {
                updates[field] = update_data[field];
            }
        }

        // Add audit fields
        updates.updated_by = updated_by_user_id;
        updates.updated_at = new Date();

        return await this.user_repository.update(user_id, updates);
    }
}

module.exports = UserService;
