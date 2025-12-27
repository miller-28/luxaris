const { ZodError } = require('zod');

class UserManagementHandler {
    
    constructor(user_service) {
        this.user_service = user_service;
    }

    /**
     * GET /api/v1/system/admin/users
     * List all users (admin only)
     */
    async list_users(req, res) {
        try {
            const { status, auth_method, is_root, search, page = 1, per_page = 10 } = req.query;

            const filters = {};
            if (search) filters.search = search;
            if (status) filters.status = status;
            if (auth_method) filters.auth_method = auth_method;
            if (is_root !== undefined) filters.is_root = is_root === 'true';

            const result = await this.user_service.list_users(filters, {
                page: parseInt(page),
                per_page: parseInt(per_page)
            });

            return res.status(200).json({
                data: result.users.map(user => user.to_json()),
                pagination: result.pagination
            });
        } catch (error) {
            return res.status(500).json({
                errors: [{
                    error_code: 'USERS_LIST_FAILED',
                    error_description: error.message,
                    error_severity: 'error'
                }]
            });
        }
    }

    /**
     * GET /api/v1/system/admin/users/:user_id
     * Get user by ID (admin only)
     */
    async get_user(req, res) {
        try {
            const { user_id } = req.params;
            const user = await this.user_service.get_user(parseInt(user_id));

            return res.status(200).json({ data: user.to_json() });
        } catch (error) {
            if (error.status_code === 404) {
                return res.status(404).json({
                    errors: [{
                        error_code: error.error_code,
                        error_description: error.message,
                        error_severity: 'error'
                    }]
                });
            }

            return res.status(500).json({
                errors: [{
                    error_code: 'USER_GET_FAILED',
                    error_description: error.message,
                    error_severity: 'error'
                }]
            });
        }
    }

    /**
     * POST /api/v1/system/admin/users/:user_id/approve
     * Approve a pending user (admin only)
     */
    async approve_user(req, res) {
        try {
            const { user_id } = req.params;
            const approved_by_user_id = req.user.id;

            const user = await this.user_service.approve_user(
                parseInt(user_id),
                approved_by_user_id
            );

            return res.status(200).json(user.to_json());
        } catch (error) {
            if (error.status_code === 404) {
                return res.status(404).json({
                    errors: [{
                        error_code: error.error_code,
                        error_description: error.message,
                        error_severity: 'error'
                    }]
                });
            }

            if (error.status_code === 400) {
                return res.status(400).json({
                    errors: [{
                        error_code: error.error_code,
                        error_description: error.message,
                        error_severity: 'error'
                    }]
                });
            }

            return res.status(500).json({
                errors: [{
                    error_code: 'USER_APPROVE_FAILED',
                    error_description: error.message,
                    error_severity: 'error'
                }]
            });
        }
    }

    /**
     * POST /api/v1/system/admin/users/:user_id/disable
     * Disable a user account (admin only)
     */
    async disable_user(req, res) {
        try {
            const { user_id } = req.params;

            const user = await this.user_service.disable_user(parseInt(user_id));

            return res.status(200).json(user.to_json());
        } catch (error) {
            if (error.status_code === 404) {
                return res.status(404).json({
                    errors: [{
                        error_code: error.error_code,
                        error_description: error.message,
                        error_severity: 'error'
                    }]
                });
            }

            if (error.status_code === 400) {
                return res.status(400).json({
                    errors: [{
                        error_code: error.error_code,
                        error_description: error.message,
                        error_severity: 'error'
                    }]
                });
            }

            return res.status(500).json({
                errors: [{
                    error_code: 'USER_DISABLE_FAILED',
                    error_description: error.message,
                    error_severity: 'error'
                }]
            });
        }
    }

    /**
     * POST /api/v1/system/admin/users/:user_id/enable
     * Enable a disabled user account (admin only)
     */
    async enable_user(req, res) {
        try {
            const { user_id } = req.params;

            const user = await this.user_service.enable_user(parseInt(user_id));

            return res.status(200).json(user.to_json());
        } catch (error) {
            if (error.status_code === 404) {
                return res.status(404).json({
                    errors: [{
                        error_code: error.error_code,
                        error_description: error.message,
                        error_severity: 'error'
                    }]
                });
            }

            return res.status(500).json({
                errors: [{
                    error_code: 'USER_ENABLE_FAILED',
                    error_description: error.message,
                    error_severity: 'error'
                }]
            });
        }
    }

    /**
     * DELETE /api/v1/system/admin/users/:user_id
     * Delete a user (soft delete, admin only)
     */
    async delete_user(req, res) {
        try {
            const { user_id } = req.params;

            await this.user_service.delete_user(parseInt(user_id));

            return res.status(204).send();
        } catch (error) {
            if (error.status_code === 404) {
                return res.status(404).json({
                    errors: [{
                        error_code: error.error_code,
                        error_description: error.message,
                        error_severity: 'error'
                    }]
                });
            }

            if (error.status_code === 400) {
                return res.status(400).json({
                    errors: [{
                        error_code: error.error_code,
                        error_description: error.message,
                        error_severity: 'error'
                    }]
                });
            }

            return res.status(500).json({
                errors: [{
                    error_code: 'USER_DELETE_FAILED',
                    error_description: error.message,
                    error_severity: 'error'
                }]
            });
        }
    }

    /**
     * PATCH /api/v1/system/admin/users/:user_id
     * Update user information (admin only)
     */
    async update_user(req, res) {
        try {
            const { user_id } = req.params;
            const update_data = req.body;
            const updated_by_user_id = req.user.id;

            const user = await this.user_service.update_user(
                parseInt(user_id),
                update_data,
                updated_by_user_id
            );

            return res.status(200).json({ data: user.to_json() });
        } catch (error) {
            if (error.status_code === 404) {
                return res.status(404).json({
                    errors: [{
                        error_code: error.error_code,
                        error_description: error.message,
                        error_severity: 'error'
                    }]
                });
            }

            if (error.status_code === 400) {
                return res.status(400).json({
                    errors: [{
                        error_code: error.error_code,
                        error_description: error.message,
                        error_severity: 'error'
                    }]
                });
            }

            return res.status(500).json({
                errors: [{
                    error_code: 'USER_UPDATE_FAILED',
                    error_description: error.message,
                    error_severity: 'error'
                }]
            });
        }
    }
}

module.exports = UserManagementHandler;


