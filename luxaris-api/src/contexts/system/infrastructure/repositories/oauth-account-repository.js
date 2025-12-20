const connection_manager = require('../../../../core/infrastructure/connection-manager');

class OAuthAccountRepository {
    
    /**
     * Find OAuth account by provider and provider user ID
     * @param {string} provider_id - OAuth provider UUID
     * @param {string} provider_user_id - User ID from OAuth provider
     * @returns {object|null} OAuth account or null
     */
    async find_by_provider_user(provider_id, provider_user_id) {
        const query = `
            SELECT id, user_id, provider_id, provider_user_id, provider_email,
                   provider_name, provider_avatar_url, access_token, refresh_token,
                   token_expires_at, created_at, updated_at
            FROM oauth_accounts
            WHERE provider_id = $1 AND provider_user_id = $2
        `;
        
        const result = await connection_manager.get_db_pool().query(query, [provider_id, provider_user_id]);
        
        if (result.rows.length === 0) {
            return null;
        }
        
        return result.rows[0];
    }

    /**
     * Find OAuth account by user ID and provider ID
     * @param {string} user_id - System user UUID
     * @param {string} provider_id - OAuth provider UUID
     * @returns {object|null} OAuth account or null
     */
    async find_by_user_and_provider(user_id, provider_id) {
        const query = `
            SELECT id, user_id, provider_id, provider_user_id, provider_email,
                   provider_name, provider_avatar_url, access_token, refresh_token,
                   token_expires_at, created_at, updated_at
            FROM oauth_accounts
            WHERE user_id = $1 AND provider_id = $2
        `;
        
        const result = await connection_manager.get_db_pool().query(query, [user_id, provider_id]);
        
        if (result.rows.length === 0) {
            return null;
        }
        
        return result.rows[0];
    }

    /**
     * Find all OAuth accounts for a user
     * @param {string} user_id - System user UUID
     * @returns {array} Array of OAuth accounts
     */
    async find_by_user(user_id) {
        const query = `
            SELECT oa.id, oa.user_id, oa.provider_id, oa.provider_user_id,
                   oa.provider_email, oa.provider_name, oa.provider_avatar_url,
                   oa.access_token, oa.refresh_token, oa.token_expires_at,
                   oa.created_at, oa.updated_at,
                   op.key as provider_key, op.name as provider_name_display
            FROM oauth_accounts oa
            JOIN oauth_providers op ON oa.provider_id = op.id
            WHERE oa.user_id = $1
            ORDER BY oa.created_at DESC
        `;
        
        const result = await connection_manager.get_db_pool().query(query, [user_id]);
        return result.rows;
    }

    /**
     * Create OAuth account linking
     * @param {object} account_data - OAuth account data
     * @returns {object} Created OAuth account
     */
    async create(account_data) {
        const query = `
            INSERT INTO oauth_accounts (
                user_id, provider_id, provider_user_id, provider_email,
                provider_name, provider_avatar_url, access_token, refresh_token,
                token_expires_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id, user_id, provider_id, provider_user_id, provider_email,
                      provider_name, provider_avatar_url, access_token, refresh_token,
                      token_expires_at, created_at, updated_at
        `;

        const values = [
            account_data.user_id,
            account_data.provider_id,
            account_data.provider_user_id,
            account_data.provider_email,
            account_data.provider_name || null,
            account_data.provider_avatar_url || null,
            account_data.access_token,
            account_data.refresh_token || null,
            account_data.token_expires_at || null
        ];

        const result = await connection_manager.get_db_pool().query(query, values);
        return result.rows[0];
    }

    /**
     * Update OAuth account tokens and metadata
     * @param {string} oauth_account_id - OAuth account UUID
     * @param {object} updates - Fields to update
     * @returns {object|null} Updated OAuth account or null
     */
    async update(oauth_account_id, updates) {
        const fields = [];
        const values = [];
        let param_count = 1;

        if (updates.provider_email !== undefined) {
            fields.push(`provider_email = $${param_count++}`);
            values.push(updates.provider_email);
        }

        if (updates.provider_name !== undefined) {
            fields.push(`provider_name = $${param_count++}`);
            values.push(updates.provider_name);
        }

        if (updates.provider_avatar_url !== undefined) {
            fields.push(`provider_avatar_url = $${param_count++}`);
            values.push(updates.provider_avatar_url);
        }

        if (updates.access_token !== undefined) {
            fields.push(`access_token = $${param_count++}`);
            values.push(updates.access_token);
        }

        if (updates.refresh_token !== undefined) {
            fields.push(`refresh_token = $${param_count++}`);
            values.push(updates.refresh_token);
        }

        if (updates.token_expires_at !== undefined) {
            fields.push(`token_expires_at = $${param_count++}`);
            values.push(updates.token_expires_at);
        }

        if (fields.length === 0) {
            return await this.find_by_id(oauth_account_id);
        }

        fields.push('updated_at = NOW()');
        values.push(oauth_account_id);

        const query = `
            UPDATE oauth_accounts
            SET ${fields.join(', ')}
            WHERE id = $${param_count}
            RETURNING id, user_id, provider_id, provider_user_id, provider_email,
                      provider_name, provider_avatar_url, access_token, refresh_token,
                      token_expires_at, created_at, updated_at
        `;

        const result = await connection_manager.get_db_pool().query(query, values);
        
        if (result.rows.length === 0) {
            return null;
        }
        
        return result.rows[0];
    }

    /**
     * Delete OAuth account (unlink)
     * @param {string} oauth_account_id - OAuth account UUID
     * @returns {boolean} True if deleted
     */
    async delete(oauth_account_id) {
        const query = 'DELETE FROM oauth_accounts WHERE id = $1';
        const result = await connection_manager.get_db_pool().query(query, [oauth_account_id]);
        return result.rowCount > 0;
    }

    /**
     * Find by ID
     * @param {string} oauth_account_id - OAuth account UUID
     * @returns {object|null} OAuth account or null
     */
    async find_by_id(oauth_account_id) {
        const query = `
            SELECT id, user_id, provider_id, provider_user_id, provider_email,
                   provider_name, provider_avatar_url, access_token, refresh_token,
                   token_expires_at, created_at, updated_at
            FROM oauth_accounts
            WHERE id = $1
        `;
        
        const result = await connection_manager.get_db_pool().query(query, [oauth_account_id]);
        
        if (result.rows.length === 0) {
            return null;
        }
        
        return result.rows[0];
    }
}

module.exports = OAuthAccountRepository;
