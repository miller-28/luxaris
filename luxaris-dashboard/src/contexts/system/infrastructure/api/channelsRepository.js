/**
 * Channels Repository
 * Handles OAuth credentials management API calls
 */
import client from '@/core/http/client';

export const channelsRepository = {

    /**
     * Get OAuth credentials configuration status for a channel
     * @param {number} channelId - Channel ID
     * @param {boolean} includeSecrets - Whether to include decrypted secrets (for editing)
     */
    async getOAuthCredentials(channelId, includeSecrets = false) {
        const params = includeSecrets ? { include_secrets: 'true' } : {};
        const response = await client.get(`/channels/${channelId}/oauth-credentials`, { params });
        return response; // Return full response, component will access response.data.data
    },

    /**
     * Save or update OAuth credentials for a channel
     */
    async saveOAuthCredentials(channelId, clientId, clientSecret) {
        const response = await client.put(`/channels/${channelId}/oauth-credentials`, {
            client_id: clientId,
            client_secret: clientSecret,
        });
        return response; // Return full response
    },

    /**
     * Delete OAuth credentials for a channel
     */
    async deleteOAuthCredentials(channelId) {
        const response = await client.delete(`/channels/${channelId}/oauth-credentials`);
        return response; // Return full response
    },
};
