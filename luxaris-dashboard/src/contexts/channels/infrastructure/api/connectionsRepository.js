import { AbstractRepository } from '@/shared/api/AbstractRepository';

/**
 * Channel Connections Repository
 * Handles all API calls for channel connection operations
 */
class ConnectionsRepository extends AbstractRepository {
  
    constructor() {
        super('/channels/connections');
    }

    /**
   * Get all channel connections for current user
   * GET /api/v1/channels/connections
   */
    async list(filters = {}) {
        const query = this.cleanQueryParams(filters);
        return await this.get('', { query });
    }

    /**
   * Get connection by ID
   * GET /api/v1/channels/connections/:id
   */
    async getById(id) {
        return await this.get(`/${id}`);
    }

    /**
   * OAuth callback is handled by backend redirect
   * This method is no longer needed for OAuth flow
   */

    /**
   * Test connection health
   * POST /api/v1/channels/connections/:id/test
   */
    async test(connectionId) {
        return await this.post(`/${connectionId}/test`);
    }

    /**
   * Reconnect (re-authenticate) existing connection
   * POST /api/v1/channels/connections/:id/reconnect
   */
    async reconnect(connectionId) {
        return await this.post(`/${connectionId}/reconnect`);
    }

    /**
   * Disconnect (delete) channel connection
   * DELETE /api/v1/channels/connections/:id
   */
    async disconnect(connectionId) {
        return await this.delete(`/${connectionId}`);
    }
}

export const connectionsRepository = new ConnectionsRepository();
