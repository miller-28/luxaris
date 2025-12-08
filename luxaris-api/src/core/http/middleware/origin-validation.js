/**
 * Origin Validation Middleware
 * 
 * Validates Origin and Referer headers to prevent CSRF attacks.
 * Part of defense-in-depth strategy alongside JWT authentication.
 */

const system_logger = require('../../logging/system_logger');

/**
 * Get allowed origins from environment variable
 * @returns {string[]} Array of allowed origins, empty if not configured
 */
function get_allowed_origins() {
    const origins_env = process.env.ALLOWED_ORIGINS;
    if (!origins_env || origins_env.trim() === '') {
        return [];
    }
    return origins_env.split(',').map(origin => origin.trim()).filter(origin => origin !== '');
}

/**
 * Check if origin is allowed
 * @param {string} origin - Origin to check
 * @returns {boolean} True if origin is allowed
 */
function is_allowed_origin(origin) {
    if (!origin) {
        return false;
    }
    
    const allowed_origins = get_allowed_origins();
    
    // If no origins configured, allow all (no origin validation)
    if (allowed_origins.length === 0) {
        return true;
    }
    
    // In development, allow localhost with any port
    if (process.env.NODE_ENV === 'development') {
        try {
            const url = new URL(origin);
            if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
                return true;
            }
        } catch {
            return false;
        }
    }
    
    return allowed_origins.includes(origin);
}

/**
 * Origin validation middleware
 * Validates Origin and Referer headers for state-changing requests (POST, PUT, PATCH, DELETE)
 * If ALLOWED_ORIGINS is not configured (empty), origin validation is skipped
 */
function origin_validation(req, res, next) {
    const method = req.method;
    const origin = req.headers.origin;
    const referer = req.headers.referer;
    const allowed_origins = get_allowed_origins();
    
    // Skip validation in test environment
    if (process.env.NODE_ENV === 'test') {
        return next();
    }
    
    // Skip validation if no origins configured (empty ALLOWED_ORIGINS)
    if (allowed_origins.length === 0) {
        return next();
    }
    
    // Skip validation for safe methods (GET, HEAD, OPTIONS)
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
        return next();
    }
    
    // Skip validation for health check endpoint
    if (req.path === '/health' || req.path === '/api/v1/health') {
        return next();
    }
    
    // Check Origin header first (more reliable)
    if (origin) {
        if (!is_allowed_origin(origin)) {
            system_logger.log('warning', 'CSRF attempt detected - invalid origin', {
                origin,
                referer,
                method,
                path: req.path,
                ip: req.ip,
                user_agent: req.headers['user-agent']
            });
            
            // Emit security event
            if (req.app.locals.event_emitter) {
                req.app.locals.event_emitter.emit('CSRF_ATTEMPT_DETECTED', {
                    origin,
                    referer,
                    method,
                    path: req.path,
                    ip: req.ip
                });
            }
            
            return res.status(403).json({
                errors: [{
                    error_code: 'FORBIDDEN_ORIGIN',
                    error_description: 'Request from unauthorized origin',
                    error_severity: 'error'
                }]
            });
        }
        // If no Origin header, check Referer (less reliable but still useful)
    } else if (referer) {
        try {
            const referer_url = new URL(referer);
            const referer_origin = `${referer_url.protocol}//${referer_url.host}`;
            
            if (!is_allowed_origin(referer_origin)) {
                system_logger.log('warning', 'CSRF attempt detected - invalid referer', {
                    referer,
                    method,
                    path: req.path,
                    ip: req.ip,
                    user_agent: req.headers['user-agent']
                });
                
                // Emit security event
                if (req.app.locals.event_emitter) {
                    req.app.locals.event_emitter.emit('CSRF_ATTEMPT_DETECTED', {
                        referer,
                        method,
                        path: req.path,
                        ip: req.ip
                    });
                }
                
                return res.status(403).json({
                    errors: [{
                        error_code: 'FORBIDDEN_REFERER',
                        error_description: 'Request from unauthorized referer',
                        error_severity: 'error'
                    }]
                });
            }
        } catch {
            // Invalid referer URL - log but allow (might be missing)
            system_logger.log('info', 'Invalid referer URL in request', {
                referer,
                method,
                path: req.path
            });
        }
        // No Origin or Referer header - log warning but allow (might be legitimate API client)
    } else {
        system_logger.log('info', 'Request without Origin or Referer header', {
            method,
            path: req.path,
            ip: req.ip,
            user_agent: req.headers['user-agent']
        });
    }
    
    next();
}

module.exports = origin_validation;
