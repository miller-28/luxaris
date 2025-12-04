class RequestLogRepository {
    constructor(db_pool) {
        this.db_pool = db_pool;
    }

    async create(log_data) {
        const query = `
			INSERT INTO request_logs (
				request_id, timestamp, method, path, status_code,
				duration_ms, principal_id, principal_type,
				ip_address, user_agent, request_size_bytes,
				response_size_bytes, error_code, error_message, context
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
			RETURNING id
		`;

        const values = [
            log_data.request_id,
            log_data.timestamp || new Date(),
            log_data.method,
            log_data.path,
            log_data.status_code,
            log_data.duration_ms,
            log_data.principal_id || null,
            log_data.principal_type || 'anonymous',
            log_data.ip_address || null,
            log_data.user_agent || null,
            log_data.request_size_bytes || 0,
            log_data.response_size_bytes || 0,
            log_data.error_code || null,
            log_data.error_message || null,
            log_data.context ? JSON.stringify(log_data.context) : null
        ];

        try {
            const result = await this.db_pool.query(query, values);
            return result.rows[0].id;
        } catch (error) {
            console.error('Failed to create request log:', error.message);
            return null;
        }
    }

    async query(filters = {}) {
        let query = 'SELECT * FROM request_logs WHERE 1=1';
        const values = [];
        let param_count = 1;

        if (filters.request_id) {
            query += ` AND request_id = $${param_count++}`;
            values.push(filters.request_id);
        }

        if (filters.method) {
            query += ` AND method = $${param_count++}`;
            values.push(filters.method);
        }

        if (filters.path) {
            query += ` AND path LIKE $${param_count++}`;
            values.push(`%${filters.path}%`);
        }

        if (filters.status_code) {
            query += ` AND status_code = $${param_count++}`;
            values.push(filters.status_code);
        }

        if (filters.principal_id) {
            query += ` AND principal_id = $${param_count++}`;
            values.push(filters.principal_id);
        }

        if (filters.start_date) {
            query += ` AND timestamp >= $${param_count++}`;
            values.push(filters.start_date);
        }

        if (filters.end_date) {
            query += ` AND timestamp <= $${param_count++}`;
            values.push(filters.end_date);
        }

        query += ' ORDER BY timestamp DESC';

        if (filters.limit) {
            query += ` LIMIT $${param_count++}`;
            values.push(filters.limit);
        }

        const result = await this.db_pool.query(query, values);
        return result.rows;
    }

    async get_metrics(options = {}) {
        // Average response time by endpoint
        const avg_query = `
			SELECT 
				path,
				AVG(duration_ms) as avg_duration,
				COUNT(*) as request_count
			FROM request_logs
			WHERE timestamp >= NOW() - INTERVAL '${options.time_range || '24 hours'}'
			GROUP BY path
			ORDER BY avg_duration DESC
			LIMIT ${options.limit || 10}
		`;

        const avg_result = await this.db_pool.query(avg_query);

        // Request count by status code
        const status_query = `
			SELECT 
				status_code,
				COUNT(*) as count
			FROM request_logs
			WHERE timestamp >= NOW() - INTERVAL '${options.time_range || '24 hours'}'
			GROUP BY status_code
			ORDER BY count DESC
		`;

        const status_result = await this.db_pool.query(status_query);

        return {
            avg_duration_by_path: avg_result.rows,
            request_count_by_status: status_result.rows
        };
    }

    async delete_old_logs(retention_days) {
        const cutoff_date = new Date();
        cutoff_date.setDate(cutoff_date.getDate() - retention_days);

        const query = 'DELETE FROM request_logs WHERE created_at < $1';
        const result = await this.db_pool.query(query, [cutoff_date]);
        return result.rowCount;
    }
}

module.exports = RequestLogRepository;
