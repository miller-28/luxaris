const connection_manager = require('../../../../core/infrastructure/connection-manager');

/**
 * Channel OAuth Credentials Repository
 * 
 * Manages OAuth credentials configured by platform admins
 */
class ChannelOAuthCredentialsRepository {
    
    constructor() {
        this.table = 'channel_oauth_credentials';
        this.schema = 'luxaris';
    }

    /**
     * Get active credentials for a channel by key
     */
    async get_active_credentials_by_key(channel_key) {
        const db = connection_manager.get_db_pool();
        const query = `
            SELECT coc.* 
            FROM ${this.schema}.${this.table} coc
            INNER JOIN ${this.schema}.channels c ON c.id = coc.channel_id
            WHERE c.key = $1 AND coc.is_active = true
        `;

        const result = await db.query(query, [channel_key]);
        return result.rows[0] || null;
    }

    /**
     * Get active credentials for a channel (deprecated - use get_active_credentials_by_key)
     */
    async get_active_credentials(channel_id) {
        const db = connection_manager.get_db_pool();
        const query = `
            SELECT * FROM ${this.schema}.${this.table}
            WHERE channel_id = $1 AND is_active = true
        `;

        const result = await db.query(query, [channel_id]);
        return result.rows[0] || null;
    }

    /**
     * Create new credentials
     */
    async create(credentials_data) {
        const db = connection_manager.get_db_pool();
        
        const query = `
            INSERT INTO ${this.schema}.${this.table} (
                channel_id, client_id, client_secret, is_active,
                created_by_user_id, updated_by_user_id
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;

        const result = await db.query(query, [
            credentials_data.channel_id,
            credentials_data.client_id,
            credentials_data.client_secret,
            true,
            credentials_data.created_by_user_id,
            credentials_data.created_by_user_id
        ]);
        
        return result.rows[0];
    }

    /**
     * Update existing credentials
     */
    async update(channel_id, credentials_data) {
        const db = connection_manager.get_db_pool();
        const query = `
            UPDATE ${this.schema}.${this.table}
            SET 
                client_id = $1,
                client_secret = $2,
                updated_at = NOW(),
                updated_by_user_id = $3
            WHERE channel_id = $4 AND is_active = true
            RETURNING *
        `;

        const result = await db.query(query, [
            credentials_data.client_id,
            credentials_data.client_secret,
            credentials_data.updated_by_user_id,
            channel_id
        ]);
        
        return result.rows[0] || null;
    }

    /**
     * Delete credentials (soft delete by setting is_active to false)
     */
    async delete(channel_id, user_id) {
        const db = connection_manager.get_db_pool();
        
        const query = `
            UPDATE ${this.schema}.${this.table}
            SET 
                is_active = false,
                updated_at = NOW(),
                updated_by_user_id = $1
            WHERE channel_id = $2 AND is_active = true
            RETURNING *
        `;

        const result = await db.query(query, [user_id, channel_id]);
        return result.rows[0] || null;
    }

    /**
     * Check if credentials exist for a channel
     */
    async has_credentials(channel_id) {
        const credentials = await this.get_active_credentials(channel_id);
        return !!credentials;
    }

    /**
     * Get credentials for display by channel key (without sensitive data)
     * Returns encrypted client_id for the service layer to decrypt and mask
     */
    async get_credentials_summary_by_key(channel_key) {
        const db = connection_manager.get_db_pool();
        const query = `
            SELECT 
                coc.id, coc.channel_id, coc.client_id, coc.is_active,
                coc.created_at, coc.updated_at
            FROM ${this.schema}.${this.table} coc
            INNER JOIN ${this.schema}.channels c ON c.id = coc.channel_id
            WHERE c.key = $1 AND coc.is_active = true
        `;

        const result = await db.query(query, [channel_key]);
        return result.rows[0] || null;
    }

    /**
     * Get credentials for display (deprecated - use get_credentials_summary_by_key)
     */
    async get_credentials_summary(channel_id) {
        const db = connection_manager.get_db_pool();
        const query = `
            SELECT 
                id, channel_id, client_id, is_active,
                created_at, updated_at
            FROM ${this.schema}.${this.table}
            WHERE channel_id = $1 AND is_active = true
        `;

        const result = await db.query(query, [channel_id]);
        return result.rows[0] || null;
    }
}

module.exports = ChannelOAuthCredentialsRepository;
