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

	// Handle unexpected errors
	const error_response = {
		errors: [{
			error_code: 'INTERNAL_SERVER_ERROR',
			error_description: node_env === 'production' 
				? 'An unexpected error occurred' 
				: error.message,
			error_severity: 'critical'
		}]
	};

	res.status(500).json(error_response);
}

module.exports = error_handler;
