import { computed } from 'vue';
import { useChannelsStore } from '../../infrastructure/store/channelsStore';

/**
 * Channel Connections Composable
 * Provides reactive access to channel connections state and actions
 */
export function useConnections() {
  
    const store = useChannelsStore();

    const connections = computed(() => store.connections);
    const currentConnection = computed(() => store.currentConnection);
    const activeConnections = computed(() => store.activeConnections);
    const errorConnections = computed(() => store.errorConnections);
    const expiredConnections = computed(() => store.expiredConnections);
    const loading = computed(() => store.loading);
    const error = computed(() => store.error);
    const filters = computed(() => store.filters);

    const loadConnections = async (filters = {}) => {
        return await store.loadConnections(filters);
    };

    const loadConnection = async (connectionId) => {
        return await store.loadConnection(connectionId);
    };

    const connectChannel = async (channelId, oauthCode, oauthState) => {
        return await store.connectChannel(channelId, oauthCode, oauthState);
    };

    const testConnection = async (connectionId) => {
        return await store.testConnection(connectionId);
    };

    const reconnectChannel = async (connectionId) => {
        return await store.reconnectChannel(connectionId);
    };

    const disconnectChannel = async (connectionId) => {
        return await store.disconnectChannel(connectionId);
    };

    const setFilters = (newFilters) => {
        store.setFilters(newFilters);
    };

    const clearError = () => {
        store.clearError();
    };

    const getConnectionsByChannel = (channelId) => {
        return store.getConnectionsByChannel(channelId);
    };

    return {
        connections,
        currentConnection,
        activeConnections,
        errorConnections,
        expiredConnections,
        loading,
        error,
        filters,
        loadConnections,
        loadConnection,
        connectChannel,
        testConnection,
        reconnectChannel,
        disconnectChannel,
        setFilters,
        clearError,
        getConnectionsByChannel
    };
}
