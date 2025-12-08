const crypto = require('crypto');
const connection_manager = require('../../../../core/infrastructure/connection-manager');

class PresetRepository {
    /**
     * Find user's custom preset
     * @param {string} user_id - User UUID
     * @returns {object|null} Preset or null
     */
    async find_by_user_id(user_id) {
        const query = `
            SELECT 
                id,
                name,
                user_id,
                role_id,
                is_global,
                is_default,
                settings,
                created_at,
                updated_at
            FROM user_ui_stateful_presets
            WHERE user_id = $1 AND is_deleted = false
            LIMIT 1
        `;
        
        const result = await connection_manager.get_db_pool().query(query, [user_id]);
        return result.rows.length > 0 ? result.rows[0] : null;
    }

    /**
     * Find role's default preset
     * @param {string} role_id - Role UUID
     * @returns {object|null} Preset or null
     */
    async find_by_role_id(role_id) {
        const query = `
            SELECT 
                id,
                name,
                user_id,
                role_id,
                is_global,
                is_default,
                settings,
                created_at,
                updated_at
            FROM user_ui_stateful_presets
            WHERE role_id = $1 AND is_default = true AND is_deleted = false
            LIMIT 1
        `;
        
        const result = await connection_manager.get_db_pool().query(query, [role_id]);
        return result.rows.length > 0 ? result.rows[0] : null;
    }

    /**
     * Find global default preset
     * @returns {object|null} Preset or null
     */
    async find_global_default() {
        const query = `
            SELECT 
                id,
                name,
                user_id,
                role_id,
                is_global,
                is_default,
                settings,
                created_at,
                updated_at
            FROM user_ui_stateful_presets
            WHERE is_global = true AND is_deleted = false
            LIMIT 1
        `;
        
        const result = await connection_manager.get_db_pool().query(query);
        return result.rows.length > 0 ? result.rows[0] : null;
    }

    /**
     * Find preset by ID
     * @param {string} preset_id - Preset UUID
     * @returns {object|null} Preset or null
     */
    async find_by_id(preset_id) {
        const query = `
            SELECT 
                id,
                name,
                user_id,
                role_id,
                is_global,
                is_default,
                settings,
                created_at,
                updated_at
            FROM user_ui_stateful_presets
            WHERE id = $1
        `;
        
        const result = await connection_manager.get_db_pool().query(query, [preset_id]);
        return result.rows.length > 0 ? result.rows[0] : null;
    }

    /**
     * Resolve preset for user using hierarchy: user -> role -> global
     * @param {string} user_id - User UUID
     * @returns {object|null} Resolved preset with source info or null
     */
    async resolve_preset_for_user(user_id) {
        // 1. Check for user custom preset
        const user_preset = await this.find_by_user_id(user_id);
        if (user_preset) {
            return {
                ...user_preset,
                source: 'user'
            };
        }

        // 2. Check for role default preset
        const role_query = `
            SELECT p.id, p.name, p.user_id, p.role_id, p.is_global, 
                   p.is_default, p.settings, p.created_at, p.updated_at
            FROM user_ui_stateful_presets p
            INNER JOIN acl_principal_role_assignments pra ON p.role_id = pra.role_id
            WHERE pra.principal_id = $1
              AND pra.principal_type = 'user'
              AND p.is_default = true
            LIMIT 1
        `;
        
        const role_result = await connection_manager.get_db_pool().query(role_query, [user_id]);
        if (role_result.rows.length > 0) {
            return {
                ...role_result.rows[0],
                source: 'role'
            };
        }

        // 3. Check for global default
        const global_preset = await this.find_global_default();
        if (global_preset) {
            return {
                ...global_preset,
                source: 'global'
            };
        }

        // 4. No preset found
        return null;
    }

    /**
     * Create new preset
     * @param {object} preset_data - Preset data
     * @returns {object} Created preset
     */
    async create(preset_data) {
        const query = `
            INSERT INTO user_ui_stateful_presets (
                name,
                user_id,
                role_id,
                is_global,
                is_default,
                settings,
                created_at,
                updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
            RETURNING 
                id,
                name,
                user_id,
                role_id,
                is_global,
                is_default,
                settings,
                created_at,
                updated_at
        `;

        const values = [
            preset_data.name,
            preset_data.user_id || null,
            preset_data.role_id || null,
            preset_data.is_global || false,
            preset_data.is_default || false,
            preset_data.settings || {}
        ];

        const result = await connection_manager.get_db_pool().query(query, values);
        return result.rows[0];
    }

    /**
     * Update preset settings
     * @param {string} preset_id - Preset UUID
     * @param {object} settings - New settings (will be merged)
     * @returns {object} Updated preset
     */
    async update(preset_id, settings) {
        const query = `
            UPDATE user_ui_stateful_presets
            SET settings = $1,
                updated_at = NOW()
            WHERE id = $2
            RETURNING 
                id,
                name,
                user_id,
                role_id,
                is_global,
                is_default,
                settings,
                created_at,
                updated_at
        `;

        const result = await connection_manager.get_db_pool().query(query, [settings, preset_id]);
        return result.rows.length > 0 ? result.rows[0] : null;
    }

    /**
     * Update preset name and settings (for role/global presets)
     * @param {string} preset_id - Preset UUID
     * @param {string} name - New name
     * @param {object} settings - New settings
     * @returns {object} Updated preset
     */
    async update_full(preset_id, name, settings) {
        const query = `
            UPDATE user_ui_stateful_presets
            SET name = $1,
                settings = $2,
                updated_at = NOW()
            WHERE id = $3
            RETURNING 
                id,
                name,
                user_id,
                role_id,
                is_global,
                is_default,
                settings,
                created_at,
                updated_at
        `;

        const result = await connection_manager.get_db_pool().query(query, [name, settings, preset_id]);
        return result.rows.length > 0 ? result.rows[0] : null;
    }

    /**
     * Delete preset (soft delete)
     * @param {string} preset_id - Preset UUID
     * @returns {boolean} Success
     */
    async delete(preset_id) {
        const query = `
            UPDATE user_ui_stateful_presets
            SET is_deleted = true, deleted_at = NOW(), updated_at = NOW()
            WHERE id = $1 AND is_deleted = false
        `;

        const result = await connection_manager.get_db_pool().query(query, [preset_id]);
        return result.rowCount > 0;
    }

    /**
     * Check if preset exists for user
     * @param {string} user_id - User UUID
     * @returns {boolean} Exists
     */
    async user_preset_exists(user_id) {
        const query = `
            SELECT EXISTS(
                SELECT 1 FROM user_ui_stateful_presets
                WHERE user_id = $1 AND is_deleted = false
            ) as exists
        `;

        const result = await connection_manager.get_db_pool().query(query, [user_id]);
        return result.rows[0].exists;
    }
}

module.exports = PresetRepository;
