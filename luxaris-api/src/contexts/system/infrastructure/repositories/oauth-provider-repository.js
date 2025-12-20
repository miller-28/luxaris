const connection_manager = require('../../../../core/infrastructure/connection-manager');

class OAuthProviderRepository {
    
    /**
     * Find OAuth provider by key (e.g., 'google', 'facebook')
     * @param {string} key - Provider key
     * @returns {object|null} Provider data or null
     */
    async find_by_key(key) {
        const query = `
            SELECT id, key, name, status, config, created_at, updated_at
            FROM oauth_providers
            WHERE key = $1
        `;
        
        const result = await connection_manager.get_db_pool().query(query, [key]);
        
        if (result.rows.length === 0) {
            return null;
        }
        
        return result.rows[0];
    }

    /**
     * Find OAuth provider by ID
     * @param {string} provider_id - Provider UUID
     * @returns {object|null} Provider data or null
     */
    async find_by_id(provider_id) {
        const query = `
            SELECT id, key, name, status, config, created_at, updated_at
            FROM oauth_providers
            WHERE id = $1
        `;
        
        const result = await connection_manager.get_db_pool().query(query, [provider_id]);
        
        if (result.rows.length === 0) {
            return null;
        }
        
        return result.rows[0];
    }

    /**
     * Create a new OAuth provider
     * @param {object} provider_data - Provider data
     * @returns {object} Created provider
     */
    async create(provider_data) {
        const query = `
            INSERT INTO oauth_providers (key, name, status, config)
            VALUES ($1, $2, $3, $4)
            RETURNING id, key, name, status, config, created_at, updated_at
        `;

        const values = [
            provider_data.key,
            provider_data.name,
            provider_data.status || 'active',
            provider_data.config || {}
        ];

        const result = await connection_manager.get_db_pool().query(query, values);
        return result.rows[0];
    }

    /**
     * Update OAuth provider
     * @param {string} provider_id - Provider UUID
     * @param {object} updates - Fields to update
     * @returns {object|null} Updated provider or null
     */
    async update(provider_id, updates) {
        const fields = [];
        const values = [];
        let param_count = 1;

        if (updates.name !== undefined) {
            fields.push(`name = $${param_count++}`);
            values.push(updates.name);
        }

        if (updates.status !== undefined) {
            fields.push(`status = $${param_count++}`);
            values.push(updates.status);
        }

        if (updates.config !== undefined) {
            fields.push(`config = $${param_count++}`);
            values.push(updates.config);
        }

        if (fields.length === 0) {
            return await this.find_by_id(provider_id);
        }

        fields.push('updated_at = NOW()');
        values.push(provider_id);

        const query = `
            UPDATE oauth_providers
            SET ${fields.join(', ')}
            WHERE id = $${param_count}
            RETURNING id, key, name, status, config, created_at, updated_at
        `;

        const result = await connection_manager.get_db_pool().query(query, values);
        
        if (result.rows.length === 0) {
            return null;
        }
        
        return result.rows[0];
    }

    /**
     * List all active OAuth providers
     * @returns {array} Array of active providers
     */
    async list_active() {
        const query = `
            SELECT id, key, name, status, config, created_at, updated_at
            FROM oauth_providers
            WHERE status = 'active'
            ORDER BY name ASC
        `;
        
        const result = await connection_manager.get_db_pool().query(query);
        return result.rows;
    }

    /**
     * Check if provider is active
     * @param {string} key - Provider key
     * @returns {boolean} True if active
     */
    async is_active(key) {
        const provider = await this.find_by_key(key);
        return provider && provider.status === 'active';
    }
}

module.exports = OAuthProviderRepository;
