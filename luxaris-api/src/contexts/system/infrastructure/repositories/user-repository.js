const { User, UserStatus } = require('../../domain/models/user');

class UserRepository {
	constructor(db_pool) {
		this.db_pool = db_pool;
	}

	async create(user_data) {
		const query = `
			INSERT INTO users (
				email, password_hash, name, avatar_url, auth_method, 
				status, is_root, timezone, locale
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
			RETURNING *
		`;

		const values = [
			user_data.email,
			user_data.password_hash,
			user_data.name,
			user_data.avatar_url || null,
			user_data.auth_method || 'password',
			user_data.status || UserStatus.PENDING_APPROVAL,
			user_data.is_root || false,
			user_data.timezone || 'UTC',
			user_data.locale || 'en'
		];

		const result = await this.db_pool.query(query, values);
		return new User(result.rows[0]);
	}

	async find_by_id(user_id) {
		const query = 'SELECT * FROM users WHERE id = $1';
		const result = await this.db_pool.query(query, [user_id]);

		if (result.rows.length === 0) {
			return null;
		}

		return new User(result.rows[0]);
	}

	async find_by_email(email) {
		const query = 'SELECT * FROM users WHERE email = $1';
		const result = await this.db_pool.query(query, [email.toLowerCase()]);

		if (result.rows.length === 0) {
			return null;
		}

		return new User(result.rows[0]);
	}

	async email_exists(email) {
		const query = 'SELECT COUNT(*) as count FROM users WHERE email = $1';
		const result = await this.db_pool.query(query, [email.toLowerCase()]);
		return parseInt(result.rows[0].count) > 0;
	}

	async count_users() {
		const query = 'SELECT COUNT(*) as count FROM users';
		const result = await this.db_pool.query(query);
		return parseInt(result.rows[0].count);
	}

	async is_first_user() {
		const count = await this.count_users();
		return count === 0;
	}

	async update(user_id, updates) {
		const fields = [];
		const values = [];
		let param_count = 1;

		// Build dynamic UPDATE query
		if (updates.name !== undefined) {
			fields.push(`name = $${param_count++}`);
			values.push(updates.name);
		}
		if (updates.password_hash !== undefined) {
			fields.push(`password_hash = $${param_count++}`);
			values.push(updates.password_hash);
		}
		if (updates.avatar_url !== undefined) {
			fields.push(`avatar_url = $${param_count++}`);
			values.push(updates.avatar_url);
		}
		if (updates.status !== undefined) {
			fields.push(`status = $${param_count++}`);
			values.push(updates.status);
		}
		if (updates.timezone !== undefined) {
			fields.push(`timezone = $${param_count++}`);
			values.push(updates.timezone);
		}
		if (updates.locale !== undefined) {
			fields.push(`locale = $${param_count++}`);
			values.push(updates.locale);
		}
		if (updates.last_login_at !== undefined) {
			fields.push(`last_login_at = $${param_count++}`);
			values.push(updates.last_login_at);
		}
		if (updates.approved_by_user_id !== undefined) {
			fields.push(`approved_by_user_id = $${param_count++}`);
			values.push(updates.approved_by_user_id);
		}
		if (updates.approved_at !== undefined) {
			fields.push(`approved_at = $${param_count++}`);
			values.push(updates.approved_at);
		}

		if (fields.length === 0) {
			throw new Error('No fields to update');
		}

		fields.push(`updated_at = NOW()`);
		values.push(user_id);

		const query = `
			UPDATE users 
			SET ${fields.join(', ')}
			WHERE id = $${param_count}
			RETURNING *
		`;

		const result = await this.db_pool.query(query, values);
		
		if (result.rows.length === 0) {
			return null;
		}

		return new User(result.rows[0]);
	}

	async delete(user_id) {
		const query = 'DELETE FROM users WHERE id = $1';
		await this.db_pool.query(query, [user_id]);
	}

	async find_all(filters = {}) {
		let query = 'SELECT * FROM users WHERE 1=1';
		const values = [];
		let param_count = 1;

		if (filters.status) {
			query += ` AND status = $${param_count++}`;
			values.push(filters.status);
		}

		if (filters.auth_method) {
			query += ` AND auth_method = $${param_count++}`;
			values.push(filters.auth_method);
		}

		if (filters.is_root !== undefined) {
			query += ` AND is_root = $${param_count++}`;
			values.push(filters.is_root);
		}

		query += ' ORDER BY created_at DESC';

		if (filters.limit) {
			query += ` LIMIT $${param_count++}`;
			values.push(filters.limit);
		}

		if (filters.offset) {
			query += ` OFFSET $${param_count++}`;
			values.push(filters.offset);
		}

		const result = await this.db_pool.query(query, values);
		return result.rows.map(row => new User(row));
	}
}

module.exports = UserRepository;
