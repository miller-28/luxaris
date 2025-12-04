class PostTemplateRepository {
    constructor(db_pool) {
        this.db = db_pool;
    }

    /**
   * Create a new post template
   */
    async create(template_data) {
        const query = `
      INSERT INTO post_templates (
        owner_principal_id, name, description, template_body, 
        default_channel_id, constraints
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
        const values = [
            template_data.owner_principal_id,
            template_data.name,
            template_data.description || null,
            template_data.template_body,
            template_data.default_channel_id || null,
            JSON.stringify(template_data.constraints || {})
        ];
    
        const result = await this.db.query(query, values);
        return result.rows[0];
    }

    /**
   * Find template by ID
   */
    async find_by_id(template_id) {
        const query = 'SELECT * FROM post_templates WHERE id = $1';
        const result = await this.db.query(query, [template_id]);
        return result.rows[0] || null;
    }

    /**
   * List templates by owner with optional filters
   */
    async list_by_owner(owner_principal_id, filters = {}) {
        let query = 'SELECT * FROM post_templates WHERE owner_principal_id = $1';
        const values = [owner_principal_id];
        let param_count = 1;

        // Filter by name (partial match)
        if (filters.name) {
            param_count++;
            query += ` AND name ILIKE $${param_count}`;
            values.push(`%${filters.name}%`);
        }

        // Filter by channel
        if (filters.default_channel_id) {
            param_count++;
            query += ` AND default_channel_id = $${param_count}`;
            values.push(filters.default_channel_id);
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
   * Count templates by owner
   */
    async count_by_owner(owner_principal_id, filters = {}) {
        let query = 'SELECT COUNT(*) FROM post_templates WHERE owner_principal_id = $1';
        const values = [owner_principal_id];
        let param_count = 1;

        if (filters.name) {
            param_count++;
            query += ` AND name ILIKE $${param_count}`;
            values.push(`%${filters.name}%`);
        }

        if (filters.default_channel_id) {
            param_count++;
            query += ` AND default_channel_id = $${param_count}`;
            values.push(filters.default_channel_id);
        }

        const result = await this.db.query(query, values);
        return parseInt(result.rows[0].count);
    }

    /**
   * Update template
   */
    async update(template_id, updates) {
        const fields = [];
        const values = [];
        let param_count = 0;

        if (updates.name !== undefined) {
            param_count++;
            fields.push(`name = $${param_count}`);
            values.push(updates.name);
        }

        if (updates.description !== undefined) {
            param_count++;
            fields.push(`description = $${param_count}`);
            values.push(updates.description);
        }

        if (updates.template_body !== undefined) {
            param_count++;
            fields.push(`template_body = $${param_count}`);
            values.push(updates.template_body);
        }

        if (updates.default_channel_id !== undefined) {
            param_count++;
            fields.push(`default_channel_id = $${param_count}`);
            values.push(updates.default_channel_id);
        }

        if (updates.constraints !== undefined) {
            param_count++;
            fields.push(`constraints = $${param_count}`);
            values.push(JSON.stringify(updates.constraints));
        }

        if (fields.length === 0) {
            return await this.find_by_id(template_id);
        }

        param_count++;
        fields.push(`updated_at = $${param_count}`);
        values.push(new Date());

        param_count++;
        values.push(template_id);

        const query = `
      UPDATE post_templates 
      SET ${fields.join(', ')}
      WHERE id = $${param_count}
      RETURNING *
    `;

        const result = await this.db.query(query, values);
        return result.rows[0] || null;
    }

    /**
   * Delete template
   */
    async delete(template_id) {
        const query = 'DELETE FROM post_templates WHERE id = $1 RETURNING id';
        const result = await this.db.query(query, [template_id]);
        return result.rowCount > 0;
    }

    /**
   * Get owner principal ID for a template
   */
    async get_owner_principal_id(template_id) {
        const query = 'SELECT owner_principal_id FROM post_templates WHERE id = $1';
        const result = await this.db.query(query, [template_id]);
        return result.rows[0]?.owner_principal_id || null;
    }
}

module.exports = PostTemplateRepository;
