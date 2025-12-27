// Authentication middleware - verifies session ID and attaches user to request

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

function create_auth_middleware(user_repository, session_service) {
    const acl_service = new AclService();
	
    return async function auth_middleware(req, res, next) {
        try {
            // Extract session ID from X-Session-ID header
            const session_id = req.headers['x-session-id'];
			
            if (!session_id) {
                return res.status(401).json({
                    errors: [{
                        error_code: 'UNAUTHORIZED',
                        error_description: 'No session ID provided',
                        error_severity: 'error'
                    }]
                });
            }

            // Get session from Redis
            const session_data = await session_service.get(session_id);
            
            if (!session_data) {
                return res.status(401).json({
                    errors: [{
                        error_code: 'INVALID_SESSION',
                        error_description: 'Invalid or expired session',
                        error_severity: 'error'
                    }]
                });
            }

            // Load user from database
            const user = await user_repository.find_by_id(session_data.user_id);
			
            if (!user) {
                // Session exists but user doesn't - clean up session
                await session_service.delete(session_id);
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
                // User deactivated - clean up session
                await session_service.delete(session_id);
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

            // Touch session to extend TTL (activity-based expiration)
            await session_service.touch(session_id);

            // Attach user and session to request
            req.user = user;
            req.principal = user; // Alias for backward compatibility with handlers
            req.session_id = session_id;
            req.session_data = session_data;

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
