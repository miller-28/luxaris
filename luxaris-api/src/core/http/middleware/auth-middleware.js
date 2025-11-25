// Authentication middleware - verifies JWT tokens and attaches user to request

const jwt = require('jsonwebtoken');
const AclService = require('../../../contexts/system/application/services/acl_service');

function create_auth_middleware(user_repository, config) {
	const acl_service = new AclService(user_repository.db_pool);
	
	return async function auth_middleware(req, res, next) {
		try {
			// Extract token from Authorization header
			const auth_header = req.headers.authorization;
			
			if (!auth_header || !auth_header.startsWith('Bearer ')) {
				return res.status(401).json({
					errors: [{
						error_code: 'UNAUTHORIZED',
						error_description: 'No valid authentication token provided',
						error_severity: 'error'
					}]
				});
			}

			const token = auth_header.substring(7); // Remove 'Bearer ' prefix

			// Verify JWT token
			let payload;
			try {
				payload = jwt.verify(token, config.jwt_secret);
			} catch (error) {
				return res.status(401).json({
					errors: [{
						error_code: 'INVALID_TOKEN',
						error_description: 'Invalid or expired token',
						error_severity: 'error'
					}]
				});
			}

			// Check token type
			if (payload.typ !== 'user') {
				return res.status(401).json({
					errors: [{
						error_code: 'INVALID_TOKEN_TYPE',
						error_description: 'Invalid token type',
						error_severity: 'error'
					}]
				});
			}

			// Load user from database
			const user = await user_repository.find_by_id(payload.sub);
			
			if (!user) {
				return res.status(401).json({
					errors: [{
						error_code: 'USER_NOT_FOUND',
						error_description: 'User not found',
						error_severity: 'error'
					}]
				});
			}

			// Check if user can access the system
			if (!user.can_login()) {
				return res.status(403).json({
					errors: [{
						error_code: 'USER_INACTIVE',
						error_description: 'User account is not active',
						error_severity: 'error'
					}]
				});
			}

			// Attach user to request
			req.user = user;
			req.auth_payload = payload;

			// Add ACL helper function to request
			req.can = async (resource, action, context = {}) => {
				return acl_service.can(
					user.id,
					'user',
					resource,
					action,
					{
						...context,
						is_root: user.is_root
					}
				);
			};

			next();
		} catch (error) {
			console.error('Auth middleware error:', error);
			return res.status(500).json({
				errors: [{
					error_code: 'AUTHENTICATION_ERROR',
					error_description: 'Authentication failed',
					error_severity: 'error'
				}]
			});
		}
	};
}

module.exports = create_auth_middleware;
