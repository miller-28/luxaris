const _ = require('lodash');

class PresetService {
    constructor(preset_repository, event_registry, system_logger) {
        this.preset_repository = preset_repository;
        this.event_registry = event_registry;
        this.system_logger = system_logger;
    }

    /**
     * Resolve preset for user (hierarchy: user -> role -> global)
     * @param {string} user_id - User UUID
     * @returns {object} Preset data with source info
     */
    async resolve_preset(user_id) {
        const preset = await this.preset_repository.resolve_preset_for_user(user_id);
        
        if (!preset) {
            await this.system_logger.info(
                'system.ui-presets',
                'No preset found for user (returning empty)',
                { user_id }
            );

            return {
                id: null,
                source: 'none',
                settings: {}
            };
        }

        await this.system_logger.info(
            'system.ui-presets',
            'Preset resolved for user',
            { user_id, preset_id: preset.id, source: preset.source }
        );

        await this.event_registry.record_event(
            'UI_PRESET_LOADED',
            'ui-preset',
            preset.id,
            { source: preset.source },
            user_id
        );

        return {
            id: preset.id,
            source: preset.source,
            user_id: preset.user_id,
            role_id: preset.role_id,
            is_global: preset.is_global,
            settings: preset.settings,
            created_at: preset.created_at,
            updated_at: preset.updated_at
        };
    }

    /**
     * Update preset settings (deep merge)
     * @param {string} preset_id - Preset UUID
     * @param {object} updates - Partial settings to update
     * @param {string} user_id - User making the update
     * @returns {object} Updated preset
     */
    async update_preset(preset_id, updates, user_id) {
        // Get existing preset
        const existing = await this.preset_repository.find_by_id(preset_id);
        if (!existing) {
            throw new Error('Preset not found');
        }

        // Deep merge settings
        const merged_settings = _.merge({}, existing.settings, updates);

        // Validate settings size (max 100KB)
        const settings_size = JSON.stringify(merged_settings).length;
        if (settings_size > 102400) {
            await this.system_logger.warning(
                'system.ui-presets',
                'Preset size exceeds limit',
                { preset_id, size: settings_size, limit: 102400 }
            );
            throw new Error('Preset settings exceed maximum size (100KB)');
        }

        // Update preset
        const updated = await this.preset_repository.update(preset_id, merged_settings);

        await this.system_logger.info(
            'system.ui-presets',
            'Preset updated',
            { preset_id, user_id, updated_sections: Object.keys(updates) }
        );

        await this.event_registry.record_event(
            'UI_PRESET_UPDATED',
            'ui-preset',
            preset_id,
            { sections_modified: Object.keys(updates) },
            user_id
        );

        return updated;
    }

    /**
     * Clone preset to user (automatic on first modification)
     * @param {string} source_preset_id - Source preset UUID (role or global)
     * @param {string} user_id - User UUID
     * @param {object} modifications - Initial modifications to apply
     * @returns {object} New user preset
     */
    async clone_preset(source_preset_id, user_id, modifications = {}) {
        // Check if user already has custom preset
        const exists = await this.preset_repository.user_preset_exists(user_id);
        if (exists) {
            throw new Error('User already has custom preset. Use update instead.');
        }

        // Get source preset
        const source = await this.preset_repository.find_by_id(source_preset_id);
        if (!source) {
            throw new Error('Source preset not found');
        }

        // Validate source is not a user preset
        if (source.user_id !== null) {
            throw new Error('Cannot clone user preset');
        }

        // Clone preset - ensure settings is parsed if it's a string
        const source_settings = typeof source.settings === 'string' 
            ? JSON.parse(source.settings) 
            : source.settings;
        const cloned_settings = _.merge({}, source_settings, modifications);

        const new_preset = await this.preset_repository.create({
            name: 'Personal Settings',
            user_id: user_id,
            settings: cloned_settings
        });

        await this.system_logger.info(
            'system.ui-presets',
            'Preset cloned for user',
            { 
                user_id, 
                source_preset_id, 
                new_preset_id: new_preset.id,
                source_type: source.is_global ? 'global' : 'role'
            }
        );

        await this.event_registry.record_event(
            'UI_PRESET_CLONED',
            'ui-preset',
            new_preset.id,
            { source_preset_id, source_type: source.is_global ? 'global' : 'role' },
            user_id
        );

        // Return with source field for API consistency
        return {
            ...new_preset,
            source: 'user'
        };
    }

    /**
     * Create or update role default preset (admin only)
     * @param {string} role_id - Role UUID
     * @param {string} name - Preset name
     * @param {object} settings - Preset settings
     * @param {string} admin_user_id - Admin user ID
     * @returns {object} Role preset
     */
    async create_or_update_role_preset(role_id, name, settings, admin_user_id) {
        // Check for existing role preset
        const existing = await this.preset_repository.find_by_role_id(role_id);

        let preset;
        let action;

        if (existing) {
            // Update existing
            preset = await this.preset_repository.update_full(existing.id, name, settings);
            action = 'updated';

            await this.event_registry.record_event(
                'ROLE_PRESET_UPDATED',
                'ui-preset',
                preset.id,
                { role_id },
                admin_user_id
            );
        } else {
            // Create new
            preset = await this.preset_repository.create({
                name,
                role_id,
                is_default: true,
                settings
            });
            action = 'created';

            await this.event_registry.record_event(
                'ROLE_PRESET_CREATED',
                'ui-preset',
                preset.id,
                { role_id },
                admin_user_id
            );
        }

        await this.system_logger.info(
            'system.ui-presets',
            `Role preset ${action}`,
            { role_id, preset_id: preset.id, admin_user_id }
        );

        // Create audit log
        await this.event_registry.record_event(
            'AUDIT_LOG',
            'ui-preset',
            preset.id,
            { 
                action: `role_preset_${action}`,
                role_id,
                changes: { name, settings_updated: true }
            },
            admin_user_id
        );

        return { preset, action };
    }

    /**
     * Create or update global default preset (admin only)
     * @param {string} name - Preset name
     * @param {object} settings - Preset settings
     * @param {string} admin_user_id - Admin user ID
     * @returns {object} Global preset
     */
    async create_or_update_global_preset(name, settings, admin_user_id) {
        // Check for existing global preset
        const existing = await this.preset_repository.find_global_default();

        let preset;
        let action;

        if (existing) {
            // Update existing
            preset = await this.preset_repository.update_full(existing.id, name, settings);
            action = 'updated';

            await this.event_registry.record_event(
                'GLOBAL_PRESET_UPDATED',
                'ui-preset',
                preset.id,
                {},
                admin_user_id
            );
        } else {
            // Create new
            preset = await this.preset_repository.create({
                name,
                is_global: true,
                settings
            });
            action = 'created';

            await this.event_registry.record_event(
                'GLOBAL_PRESET_CREATED',
                'ui-preset',
                preset.id,
                {},
                admin_user_id
            );
        }

        await this.system_logger.info(
            'system.ui-presets',
            `Global preset ${action}`,
            { preset_id: preset.id, admin_user_id }
        );

        // Create audit log
        await this.event_registry.record_event(
            'AUDIT_LOG',
            'ui-preset',
            preset.id,
            { 
                action: `global_preset_${action}`,
                changes: { name, settings_updated: true }
            },
            admin_user_id
        );

        return { preset, action };
    }

    /**
     * Delete user preset (revert to role/global)
     * @param {string} preset_id - Preset UUID
     * @param {string} user_id - User making deletion
     * @param {boolean} is_admin - Whether user is admin (can delete role/global presets)
     * @returns {boolean} Success
     */
    async delete_preset(preset_id, user_id, is_admin = false) {
        // Get preset to validate it's a user preset
        const preset = await this.preset_repository.find_by_id(preset_id);
        if (!preset) {
            throw new Error('Preset not found');
        }

        if (preset.user_id === null && !is_admin) {
            throw new Error('Cannot delete role or global preset');
        }

        // Delete preset
        const deleted = await this.preset_repository.delete(preset_id);

        if (deleted) {
            await this.system_logger.info(
                'system.ui-presets',
                'User preset deleted',
                { preset_id, user_id }
            );

            await this.event_registry.record_event(
                'UI_PRESET_DELETED',
                'ui-preset',
                preset_id,
                {},
                user_id
            );
        }

        return deleted;
    }
}

module.exports = PresetService;
