class GenerationSessionRepository {
    constructor(db_pool) {
        this.db = db_pool;
    }

    /**
   * Create a new generation session
   */
    async create(session_data) {
        const query = `
      INSERT INTO generation_sessions (
        owner_principal_id, post_id, template_id, prompt, status
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    
        const values = [
            session_data.owner_principal_id,
            session_data.post_id || null,
            session_data.template_id || null,
            session_data.prompt,
            session_data.status || 'in_progress'
        ];
    
        const result = await this.db.query(query, values);
        return result.rows[0];
    }

    /**
   * Find session by ID
   */
    async find_by_id(session_id) {
        const query = 'SELECT * FROM generation_sessions WHERE id = $1';
        const result = await this.db.query(query, [session_id]);
        return result.rows[0] || null;
    }

    /**
   * List sessions by owner with optional filters
   */
    async list_by_owner(owner_principal_id, filters = {}) {
        let query = 'SELECT * FROM generation_sessions WHERE owner_principal_id = $1';
        const values = [owner_principal_id];
        let param_count = 1;

        // Filter by status
        if (filters.status) {
            param_count++;
            query += ` AND status = $${param_count}`;
            values.push(filters.status);
        }

        // Filter by post
        if (filters.post_id) {
            param_count++;
            query += ` AND post_id = $${param_count}`;
            values.push(filters.post_id);
        }

        // Filter by template
        if (filters.template_id) {
            param_count++;
            query += ` AND template_id = $${param_count}`;
            values.push(filters.template_id);
        }

        // Ordering
        query += ' ORDER BY created_at DESC';

        // Pagination
        if (filters.limit) {
            param_count++;
            query += ` LIMIT $${param_count}`;
            values.push(filters.limit);
        }

        if (filters.offset) {
            param_count++;
            query += ` OFFSET $${param_count}`;
            values.push(filters.offset);
        }

        const result = await this.db.query(query, values);
        return result.rows;
    }

    /**
   * Count sessions by owner
   */
    async count_by_owner(owner_principal_id, filters = {}) {
        let query = 'SELECT COUNT(*) FROM generation_sessions WHERE owner_principal_id = $1';
        const values = [owner_principal_id];
        let param_count = 1;

        if (filters.status) {
            param_count++;
            query += ` AND status = $${param_count}`;
            values.push(filters.status);
        }

        if (filters.post_id) {
            param_count++;
            query += ` AND post_id = $${param_count}`;
            values.push(filters.post_id);
        }

        if (filters.template_id) {
            param_count++;
            query += ` AND template_id = $${param_count}`;
            values.push(filters.template_id);
        }

        const result = await this.db.query(query, values);
        return parseInt(result.rows[0].count);
    }

    /**
   * Update session status
   */
    async update_status(session_id, status) {
        const query = `
      UPDATE generation_sessions 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;
    
        const result = await this.db.query(query, [status, session_id]);
        return result.rows[0] || null;
    }

    /**
   * Get owner principal ID for a session
   */
    async get_owner_principal_id(session_id) {
        const query = 'SELECT owner_principal_id FROM generation_sessions WHERE id = $1';
        const result = await this.db.query(query, [session_id]);
        return result.rows[0]?.owner_principal_id || null;
    }

    /**
   * Delete session (cascade will delete suggestions)
   */
    async delete(session_id) {
        const query = 'DELETE FROM generation_sessions WHERE id = $1 RETURNING id';
        const result = await this.db.query(query, [session_id]);
        return result.rowCount > 0;
    }
}

module.exports = GenerationSessionRepository;
