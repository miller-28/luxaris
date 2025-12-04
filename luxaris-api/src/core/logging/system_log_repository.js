class SystemLogRepository {
    constructor(db_pool) {
        this.db_pool = db_pool;
    }

    async create(log_data) {
        const query = `
			INSERT INTO system_logs (
				timestamp, level, logger, message, request_id,
				principal_id, principal_type, context
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
			RETURNING id
		`;

        const values = [
            log_data.timestamp || new Date(),
            log_data.level,
            log_data.logger,
            log_data.message,
            log_data.request_id || null,
            log_data.principal_id || null,
            log_data.principal_type || null,
            log_data.context ? JSON.stringify(log_data.context) : null
        ];

        try {
            const result = await this.db_pool.query(query, values);
            return result.rows[0].id;
        } catch (error) {
            // Fail silently to avoid breaking application
            console.error('Failed to create system log:', error.message);
            return null;
        }
    }

    async query(filters = {}) {
        let query = 'SELECT * FROM system_logs WHERE 1=1';
        const values = [];
        let param_count = 1;

        if (filters.level) {
            query += ` AND level = $${param_count++}`;
            values.push(filters.level);
        }

        if (filters.logger) {
            query += ` AND logger = $${param_count++}`;
            values.push(filters.logger);
        }

        if (filters.request_id) {
            query += ` AND request_id = $${param_count++}`;
            values.push(filters.request_id);
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

    async delete_old_logs(retention_days) {
        const cutoff_date = new Date();
        cutoff_date.setDate(cutoff_date.getDate() - retention_days);

        const query = 'DELETE FROM system_logs WHERE created_at < $1';
        const result = await this.db_pool.query(query, [cutoff_date]);
        return result.rowCount;
    }
}

module.exports = SystemLogRepository;
