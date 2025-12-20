const connection_manager = require('../../../../core/infrastructure/connection-manager');

class FeatureFlagRepository {
    
    async get_by_key(key) {
        const query = 'SELECT * FROM feature_flags WHERE key = $1';
        const result = await connection_manager.get_db_pool().query(query, [key]);
        return result.rows[0] || null;
    }

    async get_all(filters = {}) {
        let query = 'SELECT * FROM feature_flags WHERE 1=1';
        const values = [];
        let param_count = 1;

        if (filters.is_enabled !== undefined) {
            query += ` AND is_enabled = $${param_count++}`;
            values.push(filters.is_enabled);
        }

        query += ' ORDER BY key ASC';

        const result = await connection_manager.get_db_pool().query(query, values);
        return result.rows;
    }

    async create(flag_data) {
        const query = `
			INSERT INTO feature_flags (key, value, description, is_enabled)
			VALUES ($1, $2, $3, $4)
			RETURNING *
		`;

        const values = [
            flag_data.key,
            JSON.stringify(flag_data.value),
            flag_data.description || null,
            flag_data.is_enabled !== undefined ? flag_data.is_enabled : true
        ];

        const result = await connection_manager.get_db_pool().query(query, values);
        return result.rows[0];
    }

    async update(key, update_data) {
        const fields = [];
        const values = [];
        let param_count = 1;

        if (update_data.value !== undefined) {
            fields.push(`value = $${param_count++}`);
            values.push(JSON.stringify(update_data.value));
        }

        if (update_data.description !== undefined) {
            fields.push(`description = $${param_count++}`);
            values.push(update_data.description);
        }

        if (update_data.is_enabled !== undefined) {
            fields.push(`is_enabled = $${param_count++}`);
            values.push(update_data.is_enabled);
        }

        fields.push(`updated_at = $${param_count++}`);
        values.push(new Date());

        values.push(key);

        const query = `
			UPDATE feature_flags
			SET ${fields.join(', ')}
			WHERE key = $${param_count}
			RETURNING *
		`;

        const result = await this.db_pool.query(query, values);
        return result.rows[0] || null;
    }

    async delete(key) {
        const query = 'DELETE FROM feature_flags WHERE key = $1 RETURNING *';
        const result = await connection_manager.get_db_pool().query(query, [key]);
        return result.rows[0] || null;
    }

    async exists(key) {
        const query = 'SELECT EXISTS(SELECT 1 FROM feature_flags WHERE key = $1) as exists';
        const result = await connection_manager.get_db_pool().query(query, [key]);
        return result.rows[0].exists;
    }
}

module.exports = FeatureFlagRepository;
