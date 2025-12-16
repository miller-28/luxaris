const Post = require('../models/post');
const connection_manager = require('../../../../core/infrastructure/connection-manager');

/**
 * PostRepository
 * 
 * Data access layer for Posts.
 */
class PostRepository {
    /**
	 * Create a new post
	 */
    async create(post_data) {
        const query = `
			INSERT INTO posts (
				owner_principal_id, title, description, tags, status, metadata, created_by_user_id
			) VALUES ($1, $2, $3, $4, $5, $6, $7)
			RETURNING *
		`;

        const values = [
            post_data.owner_principal_id,
            post_data.title || null,
            post_data.description,
            JSON.stringify(post_data.tags || []),
            post_data.status || 'draft',
            JSON.stringify(post_data.metadata || {}),
            post_data.created_by_user_id || null
        ];

        const result = await connection_manager.get_db_pool().query(query, values);
        return this._map_to_model(result.rows[0]);
    }

    /**
	 * Find post by ID
	 */
    async find_by_id(post_id) {
        const query = 'SELECT * FROM posts WHERE id = $1';
        const result = await connection_manager.get_db_pool().query(query, [post_id]);
		
        if (result.rows.length === 0) {
            return null;
        }

        return this._map_to_model(result.rows[0]);
    }

    /**
	 * List posts by owner with filters and pagination
	 */
    async list_by_owner(owner_principal_id, filters = {}) {
        let query = 'SELECT * FROM posts WHERE owner_principal_id = $1 AND is_deleted = false';
        const params = [owner_principal_id];
        let param_index = 2;

        // Filter by status
        if (filters.status) {
            query += ` AND status = $${param_index}`;
            params.push(filters.status);
            param_index++;
        }

        // Filter by tags (contains any of the provided tags)
        if (filters.tags && filters.tags.length > 0) {
            query += ` AND tags ?| $${param_index}`;
            params.push(filters.tags);
            param_index++;
        }

        // Search in title or description
        if (filters.search) {
            query += ` AND (title ILIKE $${param_index} OR description ILIKE $${param_index})`;
            params.push(`%${filters.search}%`);
            param_index++;
        }

        // Order by created_at desc
        query += ' ORDER BY created_at DESC';

        // Pagination
        const limit = filters.limit || 50;
        const offset = filters.offset || 0;
        query += ` LIMIT $${param_index} OFFSET $${param_index + 1}`;
        params.push(limit, offset);

        const result = await connection_manager.get_db_pool().query(query, params);
        return result.rows.map(row => this._map_to_model(row));
    }

    /**
	 * Count posts by owner with filters
	 */
    async count_by_owner(owner_principal_id, filters = {}) {
        let query = 'SELECT COUNT(*) FROM posts WHERE owner_principal_id = $1 AND is_deleted = false';
        const params = [owner_principal_id];
        let param_index = 2;

        // Filter by status
        if (filters.status) {
            query += ` AND status = $${param_index}`;
            params.push(filters.status);
            param_index++;
        }

        // Filter by tags
        if (filters.tags && filters.tags.length > 0) {
            query += ` AND tags ?| $${param_index}`;
            params.push(filters.tags);
            param_index++;
        }

        // Search in title or description
        if (filters.search) {
            query += ` AND (title ILIKE $${param_index} OR description ILIKE $${param_index})`;
            params.push(`%${filters.search}%`);
            param_index++;
        }

        const result = await connection_manager.get_db_pool().query(query, params);
        return parseInt(result.rows[0].count);
    }

    /**
	 * Update post
	 */
    async update(post_id, updates) {
        const fields = [];
        const params = [];
        let param_index = 1;

        if (updates.title !== undefined) {
            fields.push(`title = $${param_index}`);
            params.push(updates.title);
            param_index++;
        }

        if (updates.description !== undefined) {
            fields.push(`description = $${param_index}`);
            params.push(updates.description);
            param_index++;
        }

        if (updates.tags !== undefined) {
            fields.push(`tags = $${param_index}`);
            params.push(JSON.stringify(updates.tags));
            param_index++;
        }

        if (updates.status !== undefined) {
            fields.push(`status = $${param_index}`);
            params.push(updates.status);
            param_index++;
        }

        if (updates.metadata !== undefined) {
            fields.push(`metadata = $${param_index}`);
            params.push(JSON.stringify(updates.metadata));
            param_index++;
        }

        if (updates.updated_by_user_id !== undefined) {
            fields.push(`updated_by_user_id = $${param_index}`);
            params.push(updates.updated_by_user_id);
            param_index++;
        }

        if (updates.published_at !== undefined) {
            fields.push(`published_at = $${param_index}`);
            params.push(updates.published_at);
            param_index++;
        }

        fields.push('updated_at = CURRENT_TIMESTAMP');

        if (fields.length === 1) {
            // Only updated_at, nothing to update
            return await this.find_by_id(post_id);
        }

        const query = `
			UPDATE posts
			SET ${fields.join(', ')}
			WHERE id = $${param_index}
			RETURNING *
		`;
        params.push(post_id);

        const result = await connection_manager.get_db_pool().query(query, params);
        return this._map_to_model(result.rows[0]);
    }

    /**
	 * Update post status
	 */
    async update_status(post_id, status) {
        const query = `
			UPDATE posts
			SET status = $1, updated_at = CURRENT_TIMESTAMP
			WHERE id = $2
			RETURNING *
		`;

        const result = await connection_manager.get_db_pool().query(query, [status, post_id]);
        return this._map_to_model(result.rows[0]);
    }

    /**
	 * Delete post (soft delete)
	 */
    async delete(post_id, deleted_by_user_id = null) {
        const query = 'UPDATE posts SET is_deleted = true, deleted_at = NOW(), updated_at = NOW(), deleted_by_user_id = $2 WHERE id = $1 AND is_deleted = false RETURNING *';
        const result = await connection_manager.get_db_pool().query(query, [post_id, deleted_by_user_id]);
        return result.rowCount > 0;
    }

    /**
	 * Map database row to Post model
	 */
    _map_to_model(row) {
        if (!row) {
            return null;
        }

        return new Post({
            id: row.id,
            owner_principal_id: row.owner_principal_id,
            title: row.title,
            description: row.description,
            tags: row.tags,
            status: row.status,
            metadata: row.metadata,
            created_at: row.created_at,
            updated_at: row.updated_at,
            published_at: row.published_at
        });
    }
}

module.exports = PostRepository;
