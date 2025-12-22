import { defineStore } from 'pinia';
import { channelsRepository } from '../api/channelsRepository';
import { connectionsRepository } from '../api/connectionsRepository';
import { Channel } from '../../domain/models/Channel';
import { ChannelConnection } from '../../domain/models/ChannelConnection';
import { AbstractStore } from '@/shared/store/AbstractStore';

/**
 * Channels Pinia Store
 * Manages state for channels and connections
 */
export const useChannelsStore = defineStore('channels', {

    state: () => AbstractStore.mergeState({
        channels: [],
        connections: [],
        currentConnection: null,
        filters: {
            status: null,
            channel_id: null
        }
    }),

  getters: AbstractStore.mergeGetters({

    /**
     * Get channels that are active
     */
    activeChannels: (state) => {
      return state.channels.filter(channel => channel.isActive);
    },

    /**
     * Get active connections
     */
    activeConnections: (state) => {
      return state.connections.filter(conn => conn.isActive);
    },

    /**
     * Get connections with errors
     */
    errorConnections: (state) => {
      return state.connections.filter(conn => conn.hasError);
    },

    /**
     * Get expired connections
     */
    expiredConnections: (state) => {
      return state.connections.filter(conn => conn.isExpired);
    },

    /**
     * Get connections for specific channel
     */
    getConnectionsByChannel: (state) => (channelId) => {
      return state.connections.filter(conn => conn.channel_id === channelId);
    },

    /**
     * Check if channel is connected
     */
    isChannelConnected: (state) => (channelId) => {
      return state.connections.some(
        conn => conn.channel_id === channelId && conn.isActive
      );
    }
  }),

  actions: AbstractStore.mergeActions({

    /**
     * Load all available channels
     */
    async loadChannels() {
      this.loading = true;
      this.error = null;
      try {
        const response = await channelsRepository.list();
        this.channels = response.data.map(channelData => Channel.fromApi(channelData));
      } catch (err) {
        this.error = err.message;
        throw err;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Load all channel connections
     */
    async loadConnections(filters = {}) {
      this.loading = true;
      this.error = null;
      try {
        const response = await connectionsRepository.list(filters);
        this.connections = response.data.map(connData => ChannelConnection.fromApi(connData));
      } catch (err) {
        this.error = err.message;
        throw err;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Load single connection by ID
     */
    async loadConnection(connectionId) {
      this.loading = true;
      this.error = null;
      try {
        const response = await connectionsRepository.getById(connectionId);
        const connection = ChannelConnection.fromApi(response.data);
        this.currentConnection = connection;
        
        // Update in connections list
        const index = this.connections.findIndex(c => c.id === connectionId);
        if (index !== -1) {
          this.connections[index] = connection;
        }
        
        return connection;
      } catch (err) {
        this.error = err.message;
        throw err;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Get OAuth authorization URL for channel
     */
    async getAuthUrl(channelKey) {
        this.loading = true;
        this.error = null;
        try {
            const response = await channelsRepository.getAuthUrl(channelKey);
            return response;
        } catch (err) {
            this.error = err.message;
            throw err;
        } finally {
            this.loading = false;
        }
    },

    /**
     * Test connection health
     */
    async testConnection(connectionId) {
      this.loading = true;
      this.error = null;
      try {
        const response = await connectionsRepository.test(connectionId);
        return response.data;
      } catch (err) {
        this.error = err.message;
        throw err;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Reconnect channel (re-authenticate)
     */
    async reconnectChannel(connectionId) {
      this.loading = true;
      this.error = null;
      try {
        const response = await connectionsRepository.reconnect(connectionId);
        return response.data; // { auth_url }
      } catch (err) {
        this.error = err.message;
        throw err;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Disconnect channel connection
     */
    async disconnectChannel(connectionId) {
      this.loading = true;
      this.error = null;
      try {
        await connectionsRepository.disconnect(connectionId);
        
        // Remove from store
        this.connections = this.connections.filter(c => c.id !== connectionId);
        
        if (this.currentConnection?.id === connectionId) {
          this.currentConnection = null;
        }
      } catch (err) {
        this.error = err.message;
        throw err;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Set filters
     */
    setFilters(filters) {
      this.filters = { ...this.filters, ...filters };
    }
  }, 'id')
});
