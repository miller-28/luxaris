const { UserUpdateSchema } = require('../../domain/models/user');

class UserService {
    constructor(user_repository) {
        this.user_repository = user_repository;
    }

    async update_user(user_id, updates) {
        // Validate updates
        const validated_updates = UserUpdateSchema.parse(updates);

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

    async get_user_by_id(user_id) {
        return await this.user_repository.find_by_id(user_id);
    }
}

module.exports = UserService;
