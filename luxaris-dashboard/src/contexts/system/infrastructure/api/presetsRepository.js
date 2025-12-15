/**
 * Presets Repository
 * Handles all preset-related API calls
 */
import client from '@/core/http/client';

export const presetsRepository = {
    
    /**
     * Get user's UI preset
     */
    async getUserPreset(userId) {
        const response = await client.get(`/system/users/${userId}/ui-preset`);
        return response.data;
    },

    /**
     * Update preset settings
     */
    async updatePreset(presetId, settings) {
        const response = await client.patch(`/system/ui-presets/${presetId}`, {
            settings,
        });
        return response.data;
    },

    /**
     * Clone preset for user
     */
    async clonePreset(presetId, userId, modifications) {
        const response = await client.post(`/system/ui-presets/${presetId}/clone`, {
            user_id: userId,
            modifications,
        });
        return response.data;
    },

    /**
     * Delete preset
     */
    async deletePreset(presetId) {
        const response = await client.delete(`/system/ui-presets/${presetId}`);
        return response.data;
    },

    /**
     * Reset to default preset
     */
    async resetToDefault(userId) {
        const response = await client.post(`/system/users/${userId}/ui-preset/reset`);
        return response.data;
    },
};
