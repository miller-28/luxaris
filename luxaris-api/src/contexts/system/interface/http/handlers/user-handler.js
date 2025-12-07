const { ZodError } = require('zod');

class UserHandler {
    constructor(user_service) {
        this.user_service = user_service;
    }

    /**
     * PATCH /api/v1/system/users/:user_id
     * Update user profile (timezone, locale, name, avatar)
     */
    async update_user(req, res) {
        try {
            const { user_id } = req.params;
            const current_user_id = req.user.id;

            // Parse user_id as integer for comparison
            const requested_user_id = parseInt(user_id, 10);

            // Check authorization: user can update their own profile OR admin can update any
            const is_own_profile = requested_user_id === current_user_id;
            const is_admin = req.user.is_root;

            if (!is_own_profile && !is_admin) {
                return res.status(403).json({
                    errors: [{
                        error_code: 'FORBIDDEN',
                        error_description: 'You can only update your own profile',
                        error_severity: 'error'
                    }]
                });
            }

            // Update user
            const updated_user = await this.user_service.update_user(requested_user_id, req.body);

            if (!updated_user) {
                return res.status(404).json({
                    errors: [{
                        error_code: 'USER_NOT_FOUND',
                        error_description: 'User not found',
                        error_severity: 'error'
                    }]
                });
            }

            return res.status(200).json(updated_user.to_json());
        } catch (error) {
            if (error instanceof ZodError) {
                return res.status(400).json({
                    errors: error.errors.map(err => ({
                        error_code: 'VALIDATION_ERROR',
                        error_description: `${err.path.join('.')}: ${err.message}`,
                        error_severity: 'error'
                    }))
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

module.exports = UserHandler;
