class PresetHandler {
    constructor(preset_service) {
        this.preset_service = preset_service;
    }

    /**
     * GET /api/v1/system/users/:user_id/ui-preset
     * Load user's UI preset with hierarchical resolution
     */
    async get_user_preset(req, res) {
        try {
            const { user_id } = req.params;
            const current_user_id = req.user.id;

            // Parse user_id as integer for comparison
            const requested_user_id = parseInt(user_id, 10);

            // Check authorization: user can access their own OR admin can access any
            const is_own_preset = requested_user_id === current_user_id;
            const is_admin = req.user.is_root;

            if (!is_own_preset && !is_admin) {
                return res.status(403).json({
                    errors: [{
                        error_code: 'FORBIDDEN',
                        error_description: 'You can only access your own preset',
                        error_severity: 'error'
                    }]
                });
            }

            // Resolve preset
            const preset = await this.preset_service.resolve_preset(requested_user_id);

            return res.status(200).json(preset);
        } catch (error) {
            return res.status(500).json({
                errors: [{
                    error_code: 'PRESET_LOAD_FAILED',
                    error_description: error.message,
                    error_severity: 'error'
                }]
            });
        }
    }

    /**
     * PATCH /api/v1/system/ui-presets/:preset_id
     * Update existing preset settings
     */
    async update_preset(req, res) {
        try {
            const { preset_id } = req.params;
            const { settings } = req.body;
            const current_user_id = req.user.id;

            if (!settings) {
                return res.status(400).json({
                    errors: [{
                        error_code: 'MISSING_SETTINGS',
                        error_description: 'Settings are required',
                        error_severity: 'error'
                    }]
                });
            }

            // Get preset to check ownership
            const preset = await this.preset_service.preset_repository.find_by_id(preset_id);
            if (!preset) {
                return res.status(404).json({
                    errors: [{
                        error_code: 'PRESET_NOT_FOUND',
                        error_description: 'Preset not found',
                        error_severity: 'error'
                    }]
                });
            }

            // Check authorization
            const is_owner = preset.user_id === current_user_id;
            const is_admin = req.user.is_root;

            if (!is_owner && !is_admin) {
                return res.status(403).json({
                    errors: [{
                        error_code: 'FORBIDDEN',
                        error_description: 'You can only update your own preset',
                        error_severity: 'error'
                    }]
                });
            }

            // Update preset
            const updated = await this.preset_service.update_preset(
                preset_id,
                settings,
                current_user_id
            );

            return res.status(200).json(updated);
        } catch (error) {
            if (error.message.includes('exceed')) {
                return res.status(400).json({
                    errors: [{
                        error_code: 'PRESET_TOO_LARGE',
                        error_description: error.message,
                        error_severity: 'error'
                    }]
                });
            }

            return res.status(500).json({
                errors: [{
                    error_code: 'PRESET_UPDATE_FAILED',
                    error_description: error.message,
                    error_severity: 'error'
                }]
            });
        }
    }

    /**
     * POST /api/v1/system/ui-presets/new
     * Create new user preset
     */
    async create_user_preset(req, res) {
        try {
            const { name, user_id, settings } = req.body;
            const current_user_id = req.user.id;

            // Authorization: user creates own preset OR admin creates for others
            const is_own = user_id === current_user_id;
            const is_admin = req.user.is_root;

            if (!is_own && !is_admin) {
                return res.status(403).json({
                    errors: [{
                        error_code: 'FORBIDDEN',
                        error_description: 'You can only create your own preset',
                        error_severity: 'error'
                    }]
                });
            }

            if (!name || !settings) {
                return res.status(400).json({
                    errors: [{
                        error_code: 'MISSING_FIELDS',
                        error_description: 'Name and settings are required',
                        error_severity: 'error'
                    }]
                });
            }

            // Validate settings size before creation (max 100KB)
            const settings_size = JSON.stringify(settings).length;
            if (settings_size > 102400) {
                return res.status(400).json({
                    errors: [{
                        error_code: 'PRESET_TOO_LARGE',
                        error_description: 'Preset settings exceed maximum size (100KB)',
                        error_severity: 'error'
                    }]
                });
            }

            // Create preset via repository
            const created = await this.preset_service.preset_repository.create({
                name,
                user_id,
                role_id: null,
                is_global: false,
                is_default: false,
                settings
            });

            await this.preset_service.system_logger.info(
                'system.ui-presets',
                'User preset created',
                { preset_id: created.id, user_id, created_by: current_user_id }
            );

            await this.preset_service.event_registry.record_event(
                'USER_PRESET_CREATED',
                'ui-preset',
                created.id,
                { name },
                current_user_id
            );

            return res.status(201).json(created);
        } catch (error) {
            if (error.message.includes('already has custom preset')) {
                return res.status(409).json({
                    errors: [{
                        error_code: 'PRESET_EXISTS',
                        error_description: error.message,
                        error_severity: 'error'
                    }]
                });
            }

            return res.status(500).json({
                errors: [{
                    error_code: 'CREATE_FAILED',
                    error_description: error.message,
                    error_severity: 'error'
                }]
            });
        }
    }

    /**
     * POST /api/v1/system/ui-presets/:preset_id/clone
     * Clone role/global preset to user preset
     */
    async clone_preset(req, res) {
        try {
            const { preset_id } = req.params;
            const { modifications } = req.body;
            const current_user_id = req.user.id;

            // Clone preset
            const new_preset = await this.preset_service.clone_preset(
                preset_id,
                current_user_id,
                modifications || {}
            );

            return res.status(201).json(new_preset);
        } catch (error) {
            if (error.message.includes('already has custom preset')) {
                return res.status(409).json({
                    errors: [{
                        error_code: 'PRESET_EXISTS',
                        error_description: error.message,
                        error_severity: 'error'
                    }]
                });
            }

            if (error.message.includes('not found')) {
                return res.status(404).json({
                    errors: [{
                        error_code: 'SOURCE_PRESET_NOT_FOUND',
                        error_description: error.message,
                        error_severity: 'error'
                    }]
                });
            }

            if (error.message.includes('Cannot clone')) {
                return res.status(400).json({
                    errors: [{
                        error_code: 'INVALID_SOURCE',
                        error_description: error.message,
                        error_severity: 'error'
                    }]
                });
            }

            return res.status(500).json({
                errors: [{
                    error_code: 'CLONE_FAILED',
                    error_description: error.message,
                    error_severity: 'error'
                }]
            });
        }
    }

    /**
     * GET /api/v1/system/admin/roles/:role_id/ui-preset
     * Get role default preset (admin only)
     */
    async get_role_preset(req, res) {
        try {
            const { role_id } = req.params;
            const is_admin = req.user.is_root;

            if (!is_admin) {
                return res.status(403).json({
                    errors: [{
                        error_code: 'ADMIN_REQUIRED',
                        error_description: 'Admin permission required',
                        error_severity: 'error'
                    }]
                });
            }

            const preset = await this.preset_service.preset_repository.find_by_role_id(role_id);
            
            if (!preset) {
                return res.status(404).json({
                    errors: [{
                        error_code: 'PRESET_NOT_FOUND',
                        error_description: 'Role preset not found',
                        error_severity: 'error'
                    }]
                });
            }

            return res.status(200).json(preset);
        } catch (error) {
            return res.status(500).json({
                errors: [{
                    error_code: 'GET_FAILED',
                    error_description: error.message,
                    error_severity: 'error'
                }]
            });
        }
    }

    /**
     * POST /api/v1/system/admin/roles/:role_id/ui-preset
     * Create or update role default preset (admin only)
     */
    async create_role_preset(req, res) {
        try {
            const { role_id } = req.params;
            const { name, settings } = req.body;
            const current_user_id = req.user.id;

            // Check admin permission
            const is_admin = req.user.is_root;

            if (!is_admin) {
                return res.status(403).json({
                    errors: [{
                        error_code: 'ADMIN_REQUIRED',
                        error_description: 'Admin permission required',
                        error_severity: 'error'
                    }]
                });
            }

            if (!name || !settings) {
                return res.status(400).json({
                    errors: [{
                        error_code: 'MISSING_FIELDS',
                        error_description: 'Name and settings are required',
                        error_severity: 'error'
                    }]
                });
            }

            // Validate settings size (max 100KB)
            const settings_size = JSON.stringify(settings).length;
            if (settings_size > 102400) {
                return res.status(400).json({
                    errors: [{
                        error_code: 'PRESET_TOO_LARGE',
                        error_description: 'Preset settings exceed maximum size (100KB)',
                        error_severity: 'error'
                    }]
                });
            }

            // Create or update role preset
            const result = await this.preset_service.create_or_update_role_preset(
                role_id,
                name,
                settings,
                current_user_id
            );

            const status = result.action === 'created' ? 201 : 200;

            return res.status(status).json(result.preset);
        } catch (error) {
            if (error.message.includes('exceed')) {
                return res.status(400).json({
                    errors: [{
                        error_code: 'PRESET_TOO_LARGE',
                        error_description: error.message,
                        error_severity: 'error'
                    }]
                });
            }

            return res.status(500).json({
                errors: [{
                    error_code: 'ROLE_PRESET_FAILED',
                    error_description: error.message,
                    error_severity: 'error'
                }]
            });
        }
    }

    /**
     * GET /api/v1/system/admin/ui-presets/global
     * Get global default preset (admin only)
     */
    async get_global_preset(req, res) {
        try {
            const is_admin = req.user.is_root;

            if (!is_admin) {
                return res.status(403).json({
                    errors: [{
                        error_code: 'ADMIN_REQUIRED',
                        error_description: 'Admin permission required',
                        error_severity: 'error'
                    }]
                });
            }

            const preset = await this.preset_service.preset_repository.find_global_default();
            
            if (!preset) {
                return res.status(404).json({
                    errors: [{
                        error_code: 'PRESET_NOT_FOUND',
                        error_description: 'Global preset not found',
                        error_severity: 'error'
                    }]
                });
            }

            return res.status(200).json(preset);
        } catch (error) {
            return res.status(500).json({
                errors: [{
                    error_code: 'GET_FAILED',
                    error_description: error.message,
                    error_severity: 'error'
                }]
            });
        }
    }

    /**
     * POST /api/v1/system/admin/ui-presets/global
     * Create or update global default preset (admin only)
     */
    async create_global_preset(req, res) {
        try {
            const { name, settings } = req.body;
            const current_user_id = req.user.id;

            // Check admin permission
            const is_admin = req.user.is_root;

            if (!is_admin) {
                return res.status(403).json({
                    errors: [{
                        error_code: 'ADMIN_REQUIRED',
                        error_description: 'Admin permission required',
                        error_severity: 'error'
                    }]
                });
            }

            if (!name || !settings) {
                return res.status(400).json({
                    errors: [{
                        error_code: 'MISSING_FIELDS',
                        error_description: 'Name and settings are required',
                        error_severity: 'error'
                    }]
                });
            }

            // Validate settings size (max 100KB)
            const settings_size = JSON.stringify(settings).length;
            if (settings_size > 102400) {
                return res.status(400).json({
                    errors: [{
                        error_code: 'PRESET_TOO_LARGE',
                        error_description: 'Preset settings exceed maximum size (100KB)',
                        error_severity: 'error'
                    }]
                });
            }

            // Create or update global preset
            const result = await this.preset_service.create_or_update_global_preset(
                name,
                settings,
                current_user_id
            );

            const status = result.action === 'created' ? 201 : 200;

            return res.status(status).json(result.preset);
        } catch (error) {
            if (error.message.includes('exceed')) {
                return res.status(400).json({
                    errors: [{
                        error_code: 'PRESET_TOO_LARGE',
                        error_description: error.message,
                        error_severity: 'error'
                    }]
                });
            }

            return res.status(500).json({
                errors: [{
                    error_code: 'GLOBAL_PRESET_FAILED',
                    error_description: error.message,
                    error_severity: 'error'
                }]
            });
        }
    }

    /**
     * DELETE /api/v1/system/ui-presets/:preset_id
     * Delete user preset (revert to role/global)
     */
    async delete_preset(req, res) {
        try {
            const { preset_id } = req.params;
            const current_user_id = req.user.id;

            // Get preset to check ownership
            const preset = await this.preset_service.preset_repository.find_by_id(preset_id);
            if (!preset) {
                return res.status(404).json({
                    errors: [{
                        error_code: 'PRESET_NOT_FOUND',
                        error_description: 'Preset not found',
                        error_severity: 'error'
                    }]
                });
            }

            // Check authorization
            const is_owner = preset.user_id === current_user_id;
            const is_admin = req.user.is_root;

            if (!is_owner && !is_admin) {
                return res.status(403).json({
                    errors: [{
                        error_code: 'FORBIDDEN',
                        error_description: 'You can only delete your own preset',
                        error_severity: 'error'
                    }]
                });
            }

            // Delete preset (admin can delete role/global presets)
            await this.preset_service.delete_preset(preset_id, current_user_id, is_admin);

            return res.status(204).send();
        } catch (error) {
            if (error.message.includes('Cannot delete')) {
                return res.status(400).json({
                    errors: [{
                        error_code: 'INVALID_DELETE',
                        error_description: error.message,
                        error_severity: 'error'
                    }]
                });
            }

            return res.status(500).json({
                errors: [{
                    error_code: 'DELETE_FAILED',
                    error_description: error.message,
                    error_severity: 'error'
                }]
            });
        }
    }
}

module.exports = PresetHandler;
