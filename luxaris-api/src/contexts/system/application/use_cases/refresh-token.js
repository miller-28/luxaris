const { z } = require('zod');

const RefreshTokenSchema = z.object({
	refresh_token: z.string().min(1, 'Refresh token is required')
});

class RefreshTokenUseCase {
	constructor(auth_service) {
		this.auth_service = auth_service;
	}

	async execute(refresh_data) {
		// Validate input
		const validated_data = RefreshTokenSchema.parse(refresh_data);

		// Refresh access token
		const access_token = await this.auth_service.refresh_access_token(
			validated_data.refresh_token
		);

		return {
			access_token,
			expires_in: 86400 // 24 hours in seconds
		};
	}
}

module.exports = RefreshTokenUseCase;
