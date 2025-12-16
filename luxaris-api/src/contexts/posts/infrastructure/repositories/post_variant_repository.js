const PostVariant = require('../models/post_variant');
const connection_manager = require('../../../../core/infrastructure/connection-manager');

/**
 * PostVariantRepository
 * 
 * Data access layer for PostVariants.
 */
class PostVariantRepository {
    /**
	 * Create a new post variant
	 */
    async create(variant_data) {
        const query = `
			INSERT INTO post_variants (
				post_id, channel_id, channel_connection_id, content, media, 
				tone, source, status, metadata, created_by_user_id
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
			RETURNING *
		`;

        const values = [
            variant_data.post_id,
            variant_data.channel_id,
            variant_data.channel_connection_id || null,
            variant_data.content,
            JSON.stringify(variant_data.media || {}),
            variant_data.tone || null,
            variant_data.source || 'manual',
            variant_data.status || 'draft',
            JSON.stringify(variant_data.metadata || {}),
            variant_data.created_by_user_id || null
        ];

        const result = await connection_manager.get_db_pool().query(query, values);
        return this._map_to_model(result.rows[0]);
    }

    /**
	 * Find variant by ID
	 */
    async find_by_id(variant_id) {
        const query = 'SELECT * FROM post_variants WHERE id = $1';
        const result = await connection_manager.get_db_pool().query(query, [variant_id]);
		
        if (result.rows.length === 0) {
            return null;
        }

        return this._map_to_model(result.rows[0]);
    }

    /**
	 * List variants by post ID
	 */
    async list_by_post(post_id) {
        const query = `
			SELECT * FROM post_variants 
			WHERE post_id = $1 AND is_deleted = false
			ORDER BY created_at DESC
		`;

        const result = await connection_manager.get_db_pool().query(query, [post_id]);
        return result.rows.map(row => this._map_to_model(row));
    }

    /**
	 * List variants by owner (via post ownership)
	 */
    async list_by_owner(owner_principal_id, filters = {}) {
        let query = `
			SELECT pv.* FROM post_variants pv
			JOIN posts p ON pv.post_id = p.id
			WHERE p.owner_principal_id = $1 AND pv.is_deleted = false AND p.is_deleted = false
		`;
        const params = [owner_principal_id];
        let param_index = 2;

        // Filter by status
        if (filters.status) {
            query += ` AND pv.status = $${param_index}`;
            params.push(filters.status);
            param_index++;
        }

        // Filter by channel
        if (filters.channel_id) {
            query += ` AND pv.channel_id = $${param_index}`;
            params.push(filters.channel_id);
            param_index++;
        }

        // Order by created_at desc
        query += ' ORDER BY pv.created_at DESC';

        // Pagination
        const limit = filters.limit || 50;
        const offset = filters.offset || 0;
        query += ` LIMIT $${param_index} OFFSET $${param_index + 1}`;
        params.push(limit, offset);

        const result = await connection_manager.get_db_pool().query(query, params);
        return result.rows.map(row => this._map_to_model(row));
    }

    /**
	 * Count variants by owner
	 */
    async count_by_owner(owner_principal_id, filters = {}) {
        let query = `
			SELECT COUNT(*) FROM post_variants pv
			JOIN posts p ON pv.post_id = p.id
			WHERE p.owner_principal_id = $1
		`;
        const params = [owner_principal_id];
        let param_index = 2;

        // Filter by status
        if (filters.status) {
            query += ` AND pv.status = $${param_index}`;
            params.push(filters.status);
            param_index++;
        }

        // Filter by channel
        if (filters.channel_id) {
            query += ` AND pv.channel_id = $${param_index}`;
            params.push(filters.channel_id);
            param_index++;
        }

        const result = await connection_manager.get_db_pool().query(query, params);
        return parseInt(result.rows[0].count, 10);
    }

    /**
	 * Update variant
	 */
    async update(variant_id, updates) {
        const fields = [];
        const params = [];
        let param_index = 1;

        if (updates.content !== undefined) {
            fields.push(`content = $${param_index}`);
            params.push(updates.content);
            param_index++;
        }

        if (updates.media !== undefined) {
            fields.push(`media = $${param_index}`);
            params.push(JSON.stringify(updates.media));
            param_index++;
        }

        if (updates.tone !== undefined) {
            fields.push(`tone = $${param_index}`);
            params.push(updates.tone);
            param_index++;
        }

        if (updates.status !== undefined) {
            fields.push(`status = $${param_index}`);
            params.push(updates.status);
            param_index++;
        }

        if (updates.channel_connection_id !== undefined) {
            fields.push(`channel_connection_id = $${param_index}`);
            params.push(updates.channel_connection_id);
            param_index++;
        }

        if (updates.metadata !== undefined) {
            fields.push(`metadata = $${param_index}`);
            params.push(JSON.stringify(updates.metadata));
            param_index++;
        }

        if (updates.published_at !== undefined) {
            fields.push(`published_at = $${param_index}`);
            params.push(updates.published_at);
            param_index++;
        }

        if (updates.updated_by_user_id !== undefined) {
            fields.push(`updated_by_user_id = $${param_index}`);
            params.push(updates.updated_by_user_id);
            param_index++;
        }

        fields.push('updated_at = CURRENT_TIMESTAMP');

        if (fields.length === 1) {
            // Only updated_at, nothing to update
            return await this.find_by_id(variant_id);
        }

        const query = `
			UPDATE post_variants
			SET ${fields.join(', ')}
			WHERE id = $${param_index}
			RETURNING *
		`;
        params.push(variant_id);

        const result = await connection_manager.get_db_pool().query(query, params);
        return this._map_to_model(result.rows[0]);
    }

    /**
	 * Update variant status
	 */
    async update_status(variant_id, status) {
        const query = `
			UPDATE post_variants
			SET status = $1, updated_at = CURRENT_TIMESTAMP
			WHERE id = $2
			RETURNING *
		`;

        const result = await connection_manager.get_db_pool().query(query, [status, variant_id]);
        return this._map_to_model(result.rows[0]);
    }

    /**
	 * Delete variant (soft delete)
	 */
    async delete(variant_id, deleted_by_user_id = null) {
        const query = 'UPDATE post_variants SET is_deleted = true, deleted_at = NOW(), updated_at = NOW(), deleted_by_user_id = $2 WHERE id = $1 AND is_deleted = false RETURNING *';
        const result = await connection_manager.get_db_pool().query(query, [variant_id, deleted_by_user_id]);
        return result.rowCount > 0;
    }

    /**
	 * Get owner principal ID for a variant (via post)
	 */
    async get_owner_principal_id(variant_id) {
        const query = `
			SELECT p.owner_principal_id 
			FROM post_variants pv
			JOIN posts p ON pv.post_id = p.id
			WHERE pv.id = $1
		`;

        const result = await connection_manager.get_db_pool().query(query, [variant_id]);
		
        if (result.rows.length === 0) {
            return null;
        }

        return result.rows[0].owner_principal_id;
    }

    /**
	 * Map database row to PostVariant model
	 */
    _map_to_model(row) {
        if (!row) {
            return null;
        }

        return new PostVariant({
            id: row.id,
            post_id: row.post_id,
            channel_id: row.channel_id,
            channel_connection_id: row.channel_connection_id,
            content: row.content,
            media: row.media,
            tone: row.tone,
            source: row.source,
            status: row.status,
            metadata: row.metadata,
            created_at: row.created_at,
            updated_at: row.updated_at,
            published_at: row.published_at
        });
    }
}

module.exports = PostVariantRepository;
