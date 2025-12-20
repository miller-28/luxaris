// Authentication middleware - verifies JWT tokens and attaches user to request

const jwt = require('jsonwebtoken');
const AclService = require('../../../contexts/system/application/services/acl_service');
const winston = require('winston');

// Create Winston logger for middleware
const middleware_logger = winston.createLogger({
    level: 'debug',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
            const color_map = { 'debug': '\x1b[36m', 'info': '\x1b[32m', 'warn': '\x1b[33m', 'error': '\x1b[31m' };
            const color = color_map[level] || '';
            const reset = '\x1b[0m';
            return `${timestamp} ${color}[${level}]${reset}: ${message}`;
        })
    ),
    transports: [new winston.transports.Console()]
});

function create_auth_middleware(user_repository, config) {
    const acl_service = new AclService();
	
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

            // Load user roles and permissions
            try {
                const roles_and_permissions = await acl_service.get_principal_roles_and_permissions(user.id, 'user');
                user.roles = roles_and_permissions.roles || [];
                user.permissions = roles_and_permissions.permissions || [];
                
                middleware_logger.info(`[Auth Middleware] Loaded roles and permissions for user ${user.id} (${user.email}): ${user.roles.length} roles, ${user.permissions.length} permissions`);
                
                if (user.roles.length > 0) {
                    middleware_logger.debug(`[Auth Middleware] User roles: ${user.roles.map(r => r.slug || r.name).join(', ')}`);
                }
                if (user.permissions.length > 0) {
                    middleware_logger.debug(`[Auth Middleware] Sample permissions: ${user.permissions.slice(0, 5).join(', ')}`);
                }
            } catch (err) {
                middleware_logger.error(`[Auth Middleware] Failed to load roles/permissions for user ${user.id}: ${err.message}`);
                middleware_logger.error(`[Auth Middleware] Error stack: ${err.stack}`);
                // Continue without roles/permissions rather than failing auth
                user.roles = [];
                user.permissions = [];
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
            middleware_logger.error(`[Auth Middleware] Authentication error: ${error.message}`);
            middleware_logger.error(`[Auth Middleware] Error stack: ${error.stack}`);
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
