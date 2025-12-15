/**
 * Preset Store
 * Pinia store for UI preset state management
 */
import { defineStore } from 'pinia';
import { presetsRepository } from '../api/presetsRepository';
import { PresetManager } from '../../application/presetManager';

export const usePresetStore = defineStore('preset', {
    
    state: () => ({
        manager: new PresetManager(),
        loaded: false,
        loading: false,
        error: null,
    }),

    getters: {
        isLoaded: (state) => state.loaded,
        isLoading: (state) => state.loading,
    
        /**
         * Get all settings
         */
        settings: (state) => state.manager.getAllSettings(),

        /**
         * Get theme settings
         */
        theme: (state) => state.manager.getTheme(),

        /**
         * Get locale settings
         */
        locale: (state) => state.manager.getLocale(),

        /**
         * Get sidebar state
         */
        sidebarState: (state) => state.manager.getSidebarState(),

        /**
         * Get preset source (user/role/global)
         */
        presetSource: (state) => state.manager.presetSource,

        /**
         * Get preset ID
         */
        presetId: (state) => state.manager.presetId,
    },

    actions: {
        
        /**
         * Load preset for user
         */
        async loadPreset(userId) {
            if (!userId) {
                console.warn('No userId provided to loadPreset');
                return;
            }

            this.loading = true;
            this.error = null;

            try {

                const data = await presetsRepository.getUserPreset(userId);
                this.manager.loadPreset(data);
                this.loaded = true;

                // Set up auto-save callback
                this.manager.setSaveCallback((settings, presetId, presetSource) => {
                    this.savePreset(userId);
                });

                return { success: true };
            } catch (error) {
                this.error = error.response?.data?.message || 'Failed to load preset';
        
                // Load defaults on error
                this.manager.loadPreset(null);
                this.loaded = true;
        
                return { success: false, error: this.error };
            } finally {
                this.loading = false;
            }
        },

        /**
         * Save preset changes
         */
        async savePreset(userId) {
            if (!this.manager.isModified) {
                return { success: true };
            }

            try {
                // Check if we need to clone (not a user preset)
                if (this.manager.needsCloning()) {
                    const data = await presetsRepository.clonePreset(
                        this.manager.presetId,
                        userId,
                        this.manager.getAllSettings()
                    );
          
                    // Update with new user preset
                    this.manager.presetId = data.id;
                    this.manager.presetSource = 'user';
                } else if (this.manager.presetId) {
                    // Update existing user preset
                    await presetsRepository.updatePreset(
                        this.manager.presetId,
                        this.manager.getAllSettings()
                    );
                } else {
                    // Create new user preset
                    const data = await presetsRepository.clonePreset(
                        null,
                        userId,
                        this.manager.getAllSettings()
                    );
          
                    this.manager.presetId = data.id;
                    this.manager.presetSource = 'user';
                }

                this.manager.isModified = false;
                return { success: true };
            } catch (error) {
                console.error('Failed to save preset:', error);
                return { success: false, error: error.message };
            }
        },

        /**
         * Update single setting
         */
        updateSetting(path, value) {
            this.manager.updateSetting(path, value);
        },

        /**
         * Update multiple settings
         */
        updateSettings(updates) {
            this.manager.updateSettings(updates);
        },

        /**
         * Get setting value
         */
        getSetting(path, defaultValue) {
            return this.manager.getSetting(path, defaultValue);
        },

        /**
         * Update theme
         */
        updateTheme(theme) {
            this.manager.updateTheme(theme);
        },

        /**
         * Update locale
         */
        updateLocale(locale) {
            this.manager.updateLocale(locale);
        },

        /**
         * Update sidebar state
         */
        updateSidebarState(state) {
            this.manager.updateSidebarState(state);
        },

        /**
         * Get grid settings
         */
        getGridSettings(contextName) {
            return this.manager.getGridSettings(contextName);
        },

        /**
         * Update grid settings
         */
        updateGridSettings(contextName, settings) {
            this.manager.updateGridSettings(contextName, settings);
        },

        /**
         * Reset to default settings
         */
        async resetToDefault(userId) {
            try {
                await presetsRepository.resetToDefault(userId);
                await this.loadPreset(userId);
                return { success: true };
            } catch (error) {
                this.error = error.response?.data?.message || 'Failed to reset preset';
                return { success: false, error: this.error };
            }
        },

        /**
         * Clear error
         */
        clearError() {
            this.error = null;
        },
    },
});
