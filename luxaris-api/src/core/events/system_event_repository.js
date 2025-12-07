const connection_manager = require('../infrastructure/connection-manager');

class SystemEventRepository {
    async create(event_data) {
        const query = `
			INSERT INTO system_events (
				event_type, event_name, principal_id, principal_type,
				resource_type, resource_id, status, metadata,
				ip_address, user_agent, timestamp
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
			RETURNING id
		`;

        const values = [
            event_data.event_type,
            event_data.event_name,
            event_data.principal_id || null,
            event_data.principal_type || null,
            event_data.resource_type || null,
            event_data.resource_id || null,
            event_data.status || 'success',
            event_data.metadata ? JSON.stringify(event_data.metadata) : null,
            event_data.ip_address || null,
            event_data.user_agent || null,
            event_data.timestamp || new Date()
        ];

        try {
            const result = await connection_manager.get_db_pool().query(query, values);
            return result.rows[0].id;
        } catch (error) {
            console.error('Failed to create system event:', error.message);
            return null;
        }
    }

    async query(filters = {}) {
        let query = 'SELECT * FROM system_events WHERE 1=1';
        const values = [];
        let param_count = 1;

        if (filters.event_type) {
            query += ` AND event_type = $${param_count++}`;
            values.push(filters.event_type);
        }

        if (filters.event_name) {
            query += ` AND event_name = $${param_count++}`;
            values.push(filters.event_name);
        }

        if (filters.principal_id) {
            query += ` AND principal_id = $${param_count++}`;
            values.push(filters.principal_id);
        }

        if (filters.resource_type) {
            query += ` AND resource_type = $${param_count++}`;
            values.push(filters.resource_type);
        }

        if (filters.resource_id) {
            query += ` AND resource_id = $${param_count++}`;
            values.push(filters.resource_id);
        }

        if (filters.status) {
            query += ` AND status = $${param_count++}`;
            values.push(filters.status);
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

        const result = await connection_manager.get_db_pool().query(query, values);
        return result.rows;
    }

    async delete_old_events(retention_days) {
        const cutoff_date = new Date();
        cutoff_date.setDate(cutoff_date.getDate() - retention_days);

        const query = 'DELETE FROM system_events WHERE created_at < $1';
        const result = await connection_manager.get_db_pool().query(query, [cutoff_date]);
        return result.rowCount;
    }
}

module.exports = SystemEventRepository;
