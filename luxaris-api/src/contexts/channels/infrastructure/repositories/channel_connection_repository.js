/**
 * Channel Connection Repository
 * 
 * Data access layer for channel_connections table (user OAuth connections)
 */
class ChannelConnectionRepository {
    constructor(db_pool) {
        this.db = db_pool;
    }

    /**
   * Create new channel connection
   */
    async create(data) {
        const now = new Date().toISOString();

        const query = `
      INSERT INTO luxaris.channel_connections (
        owner_principal_id, channel_id, display_name,
        status, auth_state, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

        const values = [
            data.owner_principal_id,
            data.channel_id,
            data.display_name,
            data.status || 'connected',
            JSON.stringify(data.auth_state || {}),
            now,
            now
        ];

        const result = await this.db.query(query, values);
        return result.rows[0];
    }

    /**
   * Find connection by ID
   */
    async find_by_id(connection_id) {
        const query = `
      SELECT 
        cc.id, cc.owner_principal_id, cc.channel_id,
        cc.display_name, cc.status, cc.auth_state,
        cc.created_at, cc.updated_at, cc.last_used_at, cc.disconnected_at,
        c.key as channel_key, c.name as channel_name, c.limits as channel_limits
      FROM luxaris.channel_connections cc
      JOIN luxaris.channels c ON cc.channel_id = c.id
      WHERE cc.id = $1
    `;

        const result = await this.db.query(query, [connection_id]);
        return result.rows[0] || null;
    }

    /**
   * List connections for a user with filters
   */
    async list_by_owner(owner_principal_id, filters = {}) {
        let query = `
      SELECT 
        cc.id, cc.owner_principal_id, cc.channel_id,
        cc.display_name, cc.status, cc.auth_state,
        cc.created_at, cc.updated_at, cc.last_used_at, cc.disconnected_at,
        c.key as channel_key, c.name as channel_name, c.limits as channel_limits
      FROM luxaris.channel_connections cc
      JOIN luxaris.channels c ON cc.channel_id = c.id
      WHERE cc.owner_principal_id = $1
    `;

        const params = [owner_principal_id];
        let param_index = 2;

        // Apply status filter
        if (filters.status) {
            query += ` AND cc.status = $${param_index}`;
            params.push(filters.status);
            param_index++;
        }

        // Apply channel filter
        if (filters.channel_id) {
            query += ` AND cc.channel_id = $${param_index}`;
            params.push(filters.channel_id);
            param_index++;
        }

        // Exclude disconnected by default unless explicitly requested
        if (!filters.include_disconnected && filters.status !== 'disconnected') {
            query += ' AND cc.status != \'disconnected\'';
        }

        query += ' ORDER BY cc.created_at DESC';

        // Apply pagination
        const limit = filters.limit || 20;
        const offset = ((filters.page || 1) - 1) * limit;

        query += ` LIMIT $${param_index} OFFSET $${param_index + 1}`;
        params.push(limit, offset);

        const result = await this.db.query(query, params);

        // Get total count for pagination
        let count_query = `
      SELECT COUNT(*) as total
      FROM luxaris.channel_connections cc
      WHERE cc.owner_principal_id = $1
    `;

        const count_params = [owner_principal_id];
        let count_param_index = 2;

        if (filters.status) {
            count_query += ` AND cc.status = $${count_param_index}`;
            count_params.push(filters.status);
            count_param_index++;
        }

        if (filters.channel_id) {
            count_query += ` AND cc.channel_id = $${count_param_index}`;
            count_params.push(filters.channel_id);
            count_param_index++;
        }

        if (!filters.include_disconnected && filters.status !== 'disconnected') {
            count_query += ' AND cc.status != \'disconnected\'';
        }

        const count_result = await this.db.query(count_query, count_params);
        const total = parseInt(count_result.rows[0].total);

        return {
            data: result.rows,
            pagination: {
                page: filters.page || 1,
                limit,
                total,
                total_pages: Math.ceil(total / limit)
            }
        };
    }

    /**
   * Update connection status
   */
    async update_status(connection_id, status) {
        const query = `
      UPDATE luxaris.channel_connections
      SET 
        status = $1,
        updated_at = CURRENT_TIMESTAMP,
        disconnected_at = CASE WHEN $1 = 'disconnected' THEN CURRENT_TIMESTAMP ELSE disconnected_at END
      WHERE id = $2
      RETURNING *
    `;

        const result = await this.db.query(query, [status, connection_id]);
        return result.rows[0] || null;
    }

    /**
   * Update auth state
   */
    async update_auth_state(connection_id, auth_state) {
        const query = `
      UPDATE luxaris.channel_connections
      SET 
        auth_state = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;

        const result = await this.db.query(query, [JSON.stringify(auth_state), connection_id]);
        return result.rows[0] || null;
    }

    /**
   * Update last used timestamp
   */
    async mark_used(connection_id) {
        const query = `
      UPDATE luxaris.channel_connections
      SET last_used_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;

        await this.db.query(query, [connection_id]);
    }

    /**
   * Disconnect connection (soft delete approach)
   */
    async disconnect(connection_id) {
        const query = `
      UPDATE luxaris.channel_connections
      SET 
        status = 'disconnected',
        auth_state = '{}',
        disconnected_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

        const result = await this.db.query(query, [connection_id]);
        return result.rows[0] || null;
    }

    /**
   * Check if connection exists and is owned by principal
   */
    async is_owned_by(connection_id, principal_id) {
        const query = `
      SELECT 1 
      FROM luxaris.channel_connections
      WHERE id = $1 AND owner_principal_id = $2
    `;

        const result = await this.db.query(query, [connection_id, principal_id]);
        return result.rows.length > 0;
    }

    /**
   * Check if user already has connection to a channel
   */
    async has_connection_to_channel(principal_id, channel_id) {
        const query = `
      SELECT id
      FROM luxaris.channel_connections
      WHERE owner_principal_id = $1 
        AND channel_id = $2 
        AND status = 'connected'
    `;

        const result = await this.db.query(query, [principal_id, channel_id]);
        return result.rows[0] || null;
    }
}

module.exports = ChannelConnectionRepository;
