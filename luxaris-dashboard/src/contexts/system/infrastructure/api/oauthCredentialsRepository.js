/**
 * OAuth Credentials Repository
 * Handles OAuth credentials management API calls
 */
import ApiClient from '@/core/http/ApiClient';

export const oauthCredentialsRepository = {

    /**
     * Get OAuth credentials configuration status for a channel
     * @param {string} channelKey - Channel key (e.g., 'linkedin', 'x', 'google')
     * @param {boolean} includeSecrets - Whether to include decrypted secrets (for editing)
     */
    async getOAuthCredentials(channelKey, includeSecrets = false) {
        const params = includeSecrets ? { include_secrets: 'true' } : {};
        const response = await ApiClient.get(`/channels/${channelKey}/oauth-credentials`, { params });
        return response; // Return full response, component will access response.data.data
    },

    /**
     * Save or update OAuth credentials for a channel
     */
    async saveOAuthCredentials(channelKey, clientId, clientSecret) {
        const response = await ApiClient.put(`/channels/${channelKey}/oauth-credentials`, {
            client_id: clientId,
            client_secret: clientSecret,
        });
        return response; // Return full response
    },

    /**
     * Delete OAuth credentials for a channel
     */
    async deleteOAuthCredentials(channelKey) {
        const response = await ApiClient.delete(`/channels/${channelKey}/oauth-credentials`);
        return response; // Return full response
    },
};
