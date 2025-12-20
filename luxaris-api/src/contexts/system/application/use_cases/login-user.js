const { UserLoginSchema } = require('../../domain/models/user');

class LoginUserUseCase {
    
    constructor(auth_service) {
        this.auth_service = auth_service;
    }

    async execute(login_data) {
        // Validate input
        const validated_data = UserLoginSchema.parse(login_data);

        // Login user
        const user = await this.auth_service.login_user(
            validated_data.email,
            validated_data.password
        );

        // Generate tokens
        const access_token = this.auth_service.generate_jwt(user);
        const refresh_token = this.auth_service.generate_refresh_token(user);

        return {
            user: user.to_json(),
            access_token,
            refresh_token,
            expires_in: 86400 // 24 hours in seconds
        };
    }
}

module.exports = LoginUserUseCase;
