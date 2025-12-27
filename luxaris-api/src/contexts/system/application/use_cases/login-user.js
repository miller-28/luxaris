const { UserLoginSchema } = require('../../domain/models/user');
const AclRepository = require('../../infrastructure/repositories/acl-repository');

class LoginUserUseCase {
    
    constructor(auth_service) {
        this.auth_service = auth_service;
        this.acl_repository = new AclRepository();
    }

    async execute(login_data, metadata = {}) {
        // Validate input
        const validated_data = UserLoginSchema.parse(login_data);

        // Login user
        const user = await this.auth_service.login_user(
            validated_data.email,
            validated_data.password
        );

        // Get user roles
        const role_assignments = await this.acl_repository.get_principal_roles(user.id, 'user');
        const roles = role_assignments.map(ra => ra.role);

        // Create session in Redis
        const session_id = await this.auth_service.create_session(user, roles, metadata);

        return {
            user: user.to_json(),
            session_id,
            expires_in: 86400 // 24 hours in seconds
        };
    }
}

module.exports = LoginUserUseCase;
