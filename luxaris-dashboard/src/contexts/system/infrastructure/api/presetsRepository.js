/**
 * Presets Repository
 * Handles all preset-related API calls
 */
import ApiClient from '@/core/http/ApiClient';

export const presetsRepository = {
    
    /**
     * Get user's UI preset
     */
    async getUserPreset(userId) {
        const response = await ApiClient.get(`/system/users/${userId}/ui-preset`);
        return response.data;
    },

    /**
     * Update preset settings
     */
    async updatePreset(presetId, settings) {
        const response = await ApiClient.patch(`/system/ui-presets/${presetId}`, {
            settings,
        });
        return response.data;
    },

    /**
     * Clone preset for user
     */
    async clonePreset(presetId, userId, modifications) {
        const response = await ApiClient.post(`/system/ui-presets/${presetId}/clone`, {
            user_id: userId,
            modifications,
        });
        return response.data;
    },

    /**
     * Delete preset
     */
    async deletePreset(presetId) {
        const response = await ApiClient.delete(`/system/ui-presets/${presetId}`);
        return response.data;
    },

    /**
     * Reset to default preset
     */
    async resetToDefault(userId) {
        const response = await ApiClient.post(`/system/users/${userId}/ui-preset/reset`);
        return response.data;
    },
};
