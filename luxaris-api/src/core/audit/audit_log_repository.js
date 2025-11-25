class AuditLogRepository {
	constructor(db_pool) {
		this.db_pool = db_pool;
	}

	async create(audit_data) {
		const query = `
			INSERT INTO audit_logs (
				timestamp, actor_type, actor_id, action,
				resource_type, resource_id, ip_address,
				user_agent, data
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
			RETURNING id
		`;

		const values = [
			audit_data.timestamp || new Date(),
			audit_data.actor_type || null,
			audit_data.actor_id || null,
			audit_data.action,
			audit_data.resource_type || null,
			audit_data.resource_id || null,
			audit_data.ip_address || null,
			audit_data.user_agent || null,
			audit_data.data ? JSON.stringify(audit_data.data) : null
		];

		const result = await this.db_pool.query(query, values);
		return result.rows[0].id;
	}

	async query(filters = {}) {
		let query = 'SELECT * FROM audit_logs WHERE 1=1';
		const values = [];
		let param_count = 1;

		if (filters.actor_id) {
			query += ` AND actor_id = $${param_count++}`;
			values.push(filters.actor_id);
		}

		if (filters.actor_type) {
			query += ` AND actor_type = $${param_count++}`;
			values.push(filters.actor_type);
		}

		if (filters.action) {
			query += ` AND action = $${param_count++}`;
			values.push(filters.action);
		}

		if (filters.resource_type) {
			query += ` AND resource_type = $${param_count++}`;
			values.push(filters.resource_type);
		}

		if (filters.resource_id) {
			query += ` AND resource_id = $${param_count++}`;
			values.push(filters.resource_id);
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
}

module.exports = AuditLogRepository;
