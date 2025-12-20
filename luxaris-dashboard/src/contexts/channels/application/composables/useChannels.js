import { computed } from 'vue';
import { useChannelsStore } from '../../infrastructure/store/channelsStore';

/**
 * Channels Composable
 * Provides reactive access to channels state and actions
 */
export function useChannels() {

  const store = useChannelsStore();

  const channels = computed(() => store.channels);
  const activeChannels = computed(() => store.activeChannels);
  const loading = computed(() => store.loading);
  const error = computed(() => store.error);

  const loadChannels = async () => {
    return await store.loadChannels();
  };

  const getAuthUrl = async (channelKey) => {
    return await store.getAuthUrl(channelKey);
  };

  const isChannelConnected = (channelId) => {
    return store.isChannelConnected(channelId);
  };

  const clearError = () => {
    store.clearError();
  };

  return {
    channels,
    activeChannels,
    loading,
    error,
    loadChannels,
    getAuthUrl,
    isChannelConnected,
    clearError
  };
}
