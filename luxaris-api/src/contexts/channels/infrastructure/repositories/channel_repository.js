const connection_manager = require('../../../../core/infrastructure/connection-manager');

/**
 * Channel Repository
 * 
 * Data access layer for channels table (platform catalog)
 */
class ChannelRepository {
    /**
   * Get all active channels
   */
    async list_active() {
        const query = `
      SELECT 
        id, key, name, status, limits,
        created_at, updated_at
      FROM channels
      WHERE status = 'active'
      ORDER BY name ASC
    `;

        const result = await connection_manager.get_db_pool().query(query);
        return result.rows;
    }

    /**
   * Get channel by ID
   */
    async find_by_id(channel_id) {
        const query = `
      SELECT 
        id, key, name, status, limits,
        created_at, updated_at
      FROM channels
      WHERE id = $1
    `;

        const result = await connection_manager.get_db_pool().query(query, [channel_id]);
        return result.rows[0] || null;
    }

    /**
   * Get channel by key (e.g., 'x', 'linkedin')
   */
    async find_by_key(key) {
        const query = `
      SELECT 
        id, key, name, status, limits,
        created_at, updated_at
      FROM channels
      WHERE key = $1
    `;

        const result = await connection_manager.get_db_pool().query(query, [key]);
        return result.rows[0] || null;
    }

    /**
   * Check if channel exists and is active
   */
    async is_active(channel_id) {
        const query = `
      SELECT 1 
      FROM channels
      WHERE id = $1 AND status = 'active'
    `;

        const result = await connection_manager.get_db_pool().query(query, [channel_id]);
        return result.rows.length > 0;
    }
}

module.exports = ChannelRepository;
