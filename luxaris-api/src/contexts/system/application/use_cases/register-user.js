const { UserRegistrationSchema } = require('../../domain/models/user');

class RegisterUserUseCase {
    constructor(auth_service) {
        this.auth_service = auth_service;
    }

    async execute(registration_data) {
        // Validate input
        const validated_data = UserRegistrationSchema.parse(registration_data);

        // Register user
        const {user, is_first} = await this.auth_service.register_user(validated_data);

        // Generate tokens
        const access_token = this.auth_service.generate_jwt(user);
        const refresh_token = this.auth_service.generate_refresh_token(user);

        return {
            is_pending: !is_first,
            user: user.to_json(),
            access_token,
            refresh_token,
            expires_in: 86400 // 24 hours in seconds
        };
    }
}

module.exports = RegisterUserUseCase;
