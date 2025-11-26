const { DateTime } = require('luxon');

class RequestLogger {
	constructor(db_pool) {
		this.db_pool = db_pool;
	}

	middleware() {
		return async (req, res, next) => {
			const start_time = DateTime.now();

			// Capture response
			const original_send = res.send;
			const original_json = res.json;
			let response_body = null;

			res.send = function(data) {
				response_body = data;
				original_send.call(this, data);
			};

			res.json = function(data) {
				response_body = data;
				original_json.call(this, data);
			};

			// Log after response is sent
			res.on('finish', async () => {
				const end_time = DateTime.now();
				const duration_ms = end_time.diff(start_time).milliseconds;

				const log_entry = {
					request_id: req.id,
					user_id: req.user ? req.user.user_id : null,
					method: req.method,
					path: req.path,
					query_params: Object.keys(req.query).length > 0 ? JSON.stringify(req.query) : null,
					request_body: req.body && Object.keys(req.body).length > 0 ? JSON.stringify(req.body) : null,
					status_code: res.statusCode,
					response_body: response_body ? JSON.stringify(response_body) : null,
					duration_ms: Math.round(duration_ms),
					ip_address: req.ip,
					user_agent: req.get('user-agent') || null,
					created_at: start_time.toJSDate()
				};

				// Persist to database (async, non-blocking)
				// Note: request_logs table will be created in Phase 2
				if (this.db_pool) {
					this._persist_to_db(log_entry).catch(error => {
						console.error('Failed to persist request log:', error.message);
					});
				}

				// Console log in development
				if (process.env.NODE_ENV === 'development') {
					console.log(`[${req.id}] ${req.method} ${req.path} ${res.statusCode} ${duration_ms}ms`);
				}
			});

			next();
		};
	}

	async _persist_to_db(log_entry) {
		// TODO: Phase 2 - Implement when request_logs table is created
		// const query = `
		//   INSERT INTO request_logs (
		//     request_id, user_id, method, path, query_params, request_body,
		//     status_code, response_body, duration_ms, ip_address, user_agent, created_at
		//   ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		// `;
		// await this.db_pool.query(query, [
		//   log_entry.request_id,
		//   log_entry.user_id,
		//   log_entry.method,
		//   log_entry.path,
		//   log_entry.query_params,
		//   log_entry.request_body,
		//   log_entry.status_code,
		//   log_entry.response_body,
		//   log_entry.duration_ms,
		//   log_entry.ip_address,
		//   log_entry.user_agent,
		//   log_entry.created_at
		// ]);
	}
}

module.exports = RequestLogger;
