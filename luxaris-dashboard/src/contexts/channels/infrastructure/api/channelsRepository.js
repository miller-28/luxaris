import { AbstractRepository } from '@/shared/api/AbstractRepository';

/**
 * Channels Repository
 * Handles all API calls for channel operations
 */
class ChannelsRepository extends AbstractRepository {
  
  constructor() {
    super('/channels');
  }

  /**
   * Get all available channels
   * GET /api/v1/channels
   */
  async list() {
    return await this.get('');
  }

  /**
   * Get channel by ID
   * GET /api/v1/channels/:id
   */
  async getById(id) {
    return await this.get(`/${id}`);
  }

  /**
   * Get OAuth authorization URL for channel
   * GET /api/v1/channels/:channel_key/auth-url
   */
  async getAuthUrl(channelKey) {
    return await this.get(`/${channelKey}/auth-url`);
  }

  /**
   * Get OAuth credentials for a channel (by key)
   * GET /api/v1/channels/:channel_key/oauth-credentials
   */
  async getOAuthCredentials(channelKey, includeSecrets = false) {
    const params = {};
    if (includeSecrets) {
      params.include_secrets = 'true';
    }
    return await this.get(`/${channelKey}/oauth-credentials`, { params });
  }

  /**
   * Save/update OAuth credentials for a channel (by key)
   * PUT /api/v1/channels/:channel_key/oauth-credentials
   */
  async saveOAuthCredentials(channelKey, clientId, clientSecret) {
    return await this.put(`/${channelKey}/oauth-credentials`, {
      client_id: clientId,
      client_secret: clientSecret
    });
  }

  /**
   * Delete OAuth credentials for a channel (by key)
   * DELETE /api/v1/channels/:channel_key/oauth-credentials
   */
  async deleteOAuthCredentials(channelKey) {
    return await this.delete(`/${channelKey}/oauth-credentials`);
  }
}

export const channelsRepository = new ChannelsRepository();
