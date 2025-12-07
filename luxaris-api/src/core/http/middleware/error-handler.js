function error_handler(error, req, res, next) {
    const request_id = req.id;
    const node_env = process.env.NODE_ENV || 'development';

    // Log error to console in development
    if (node_env === 'development') {
        console.error(`[${request_id}] Error:`, error);
    }

    // Handle validation errors from zod - check for issues property which is unique to ZodError
    if (error.name === 'ZodError' || error.constructor.name === 'ZodError' || (error.issues && Array.isArray(error.issues))) {
        const validation_errors = error.issues.map(err => ({
            error_code: 'VALIDATION_ERROR',
            error_description: `${err.path.join('.')}: ${err.message}`,
            error_severity: 'error'
        }));

        return res.status(400).json({ errors: validation_errors });
    }

    // Handle database errors - NEVER expose SQL details to client
    if (error.code && (error.code.startsWith('22') || error.code.startsWith('23') || error.code.startsWith('42'))) {
        
		// PostgreSQL error codes
        // 22xxx: Data exception
        // 23xxx: Integrity constraint violation
        // 42xxx: Syntax error or access rule violation
        
        // Log full error server-side for debugging
        console.error(`[${request_id}] Database error:`, {
            code: error.code,
            message: error.message,
            detail: error.detail,
            table: error.table,
            constraint: error.constraint
        });
        
        // Return generic error to client
        return res.status(400).json({
            errors: [{
                error_code: 'DATABASE_ERROR',
                error_description: node_env === 'production' 
                    ? 'A database error occurred' 
                    : 'Database operation failed',
                error_severity: 'error'
            }]
        });
    }

    // Handle custom application errors
    if (error.status_code) {
        return res.status(error.status_code).json({
            errors: [{
                error_code: error.error_code || 'APPLICATION_ERROR',
                error_description: error.message,
                error_severity: error.severity || 'error'
            }]
        });
    }

    // Handle unexpected errors - NEVER expose internal details in production
    const error_response = {
        errors: [{
            error_code: 'INTERNAL_SERVER_ERROR',
            error_description: node_env === 'production' 
                ? 'An unexpected error occurred' 
                : error.message,
            error_severity: 'critical'
        }]
    };

    // Log full error server-side
    console.error(`[${request_id}] Unexpected error:`, {
        message: error.message,
        stack: error.stack,
        error
    });

    res.status(500).json(error_response);
}

module.exports = error_handler;
