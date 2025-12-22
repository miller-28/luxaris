<template>
  <DashboardLayout>
    <div class="page-content">

      <!-- Header -->
      <AbstractPageHeader
        :title="$t('channels.title')"
        :subtitle="$t('channels.description')"
      >
        <template #actions>
          <v-chip
            v-if="activeConnections.length"
            color="success"
            variant="tonal"
          >
            {{ activeConnections.length }} {{ $t('channels.status.connected') }}
          </v-chip>
        </template>
      </AbstractPageHeader>

      <!-- Filter Tabs -->
      <v-card class="filter-tabs-card ml-4 mt-4 mr-4">
        <v-tabs v-model="selectedTab">
          <v-tab value="all">
            {{ $t('channels.filters.all') }}
            <v-chip size="small" class="ml-2">{{ channels.length }}</v-chip>
          </v-tab>
          <v-tab value="connected">
            {{ $t('channels.filters.connected') }}
            <v-chip size="small" class="ml-2">{{ activeConnections.length }}</v-chip>
          </v-tab>
          <v-tab value="notConnected">
            {{ $t('channels.filters.notConnected') }}
            <v-chip size="small" class="ml-2">{{ notConnectedChannels.length }}</v-chip>
          </v-tab>
          <v-tab value="error">
            {{ $t('channels.filters.error') }}
            <v-chip size="small" color="error" class="ml-2">{{ errorConnections.length }}</v-chip>
          </v-tab>
          <v-tab value="expired">
            {{ $t('channels.filters.expired') }}
            <v-chip size="small" color="warning" class="ml-2">{{ expiredConnections.length }}</v-chip>
          </v-tab>
        </v-tabs>
      </v-card>

      <!-- Unified Channels Grid Table -->
      <ChannelsGridTable
        class="flex-1 mb-4"
        :channels="filteredChannels"
        :connections="connections"
        :loading="loading"
        :selectable="true"
        :selected-items="channelsStore.selectedItems"
        @update:selected-items="channelsStore.setSelectedItems"
        @connect="handleConnect"
        @disconnect="handleDisconnect"
      />

      <!-- Disconnect Confirmation Modal -->
      <DisconnectModal
        v-model="disconnectModalVisible"
        :connection="connectionToDisconnect"
        @confirmed="handleDisconnectConfirmed"
      />
    </div>
  </DashboardLayout>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import AbstractPageHeader from '@/shared/components/AbstractPageHeader.vue';
import { useChannels } from '../../application/composables/useChannels';
import { useConnections } from '../../application/composables/useConnections';
import { useChannelsStore } from '../../infrastructure/store/channelsStore';
import { useToast } from '@/shared/composables/useToast';
import ChannelsGridTable from '../components/ChannelsGridTable.vue';
import DisconnectModal from '../components/DisconnectModal.vue';

const { t } = useI18n();
const { showToastSuccess, showToastError } = useToast();
const route = useRoute();
const router = useRouter();
const channelsStore = useChannelsStore();

const {
  channels,
  activeChannels,
  loading: channelsLoading,
  error: channelsError,
  loadChannels,
  getAuthUrl,
  clearError: clearChannelsError
} = useChannels();

const {
  connections,
  activeConnections,
  errorConnections,
  expiredConnections,
  loading: connectionsLoading,
  error: connectionsError,
  loadConnections,
  disconnectChannel,
  clearError: clearConnectionsError
} = useConnections();

const selectedTab = ref('all');
const disconnectModalVisible = ref(false);
const connectionToDisconnect = ref(null);

const loading = computed(() => channelsLoading.value || connectionsLoading.value);

// Watch for errors and display them as toast
watch(channelsError, (newError) => {
  if (newError) {
    showToastError(newError);
    clearChannelsError();
  }
});

watch(connectionsError, (newError) => {
  if (newError) {
    showToastError(newError);
    clearConnectionsError();
  }
});

// Compute not connected channels
const notConnectedChannels = computed(() => {
  return channels.value.filter(channel => {
    return !connections.value.some(conn => conn.channel_id === channel.id);
  });
});

// Filter channels based on selected tab
const filteredChannels = computed(() => {
  switch (selectedTab.value) {
    case 'connected':
      // Show only channels that have connections
      return channels.value.filter(channel => {
        const conn = connections.value.find(c => c.channel_id === channel.id);
        return conn && (conn.status === 'active' || conn.status === 'connected');
      });
    
    case 'notConnected':
      return notConnectedChannels.value;
    
    case 'error':
      // Show channels with error connections
      return channels.value.filter(channel => {
        const conn = connections.value.find(c => c.channel_id === channel.id);
        return conn && conn.status === 'error';
      });
    
    case 'expired':
      // Show channels with expired connections
      return channels.value.filter(channel => {
        const conn = connections.value.find(c => c.channel_id === channel.id);
        return conn && conn.status === 'expired';
      });
    
    case 'all':
    default:
      return channels.value;
  }
});

const handleConnect = async (channelId) => {
  try {
    // Find the channel to get its key
    const channel = channels.value.find(c => c.id === channelId);
    if (!channel) {
      showToastError(t('channels.messages.connectError'));
      return;
    }

    // Get OAuth authorization URL from backend
    const response = await getAuthUrl(channel.key);
    
    // Redirect to OAuth provider
    if (response.auth_url) {
      window.location.href = response.auth_url;
    } else {
      showToastError(t('channels.messages.connectError'));
    }
  } catch (err) {
    showToastError(err.message || t('channels.messages.connectError'));
  }
};

const handleDisconnect = (connection) => {
  connectionToDisconnect.value = connection;
  disconnectModalVisible.value = true;
};

const handleDisconnectConfirmed = async () => {
  if (!connectionToDisconnect.value) return;

  try {
    await disconnectChannel(connectionToDisconnect.value.id);
    showToastSuccess(t('channels.messages.disconnectSuccess'));
    
    // Reload connections
    await loadConnections();
  } catch (err) {
    showToastError(err.message || t('channels.messages.connectError'));
  } finally {
    disconnectModalVisible.value = false;
    connectionToDisconnect.value = null;
  }
};

// Handle OAuth callback (backend redirects here with success/error query params)
const handleOAuthCallback = async () => {
  const success = route.query.success;
  const error_param = route.query.error;

  if (success === 'connected') {
    showToastSuccess(t('channels.messages.connectSuccess'));
    // Reload connections to show the new one
    await loadConnections();
    // Set tab to show connected channels
    selectedTab.value = 'connected';
    // Clean up URL
    router.replace({ query: {} });
  } else if (error_param) {
    const error_messages = {
      oauth_denied: t('channels.messages.oauthDenied'),
      invalid_callback: t('channels.messages.invalidCallback'),
      invalid_state: t('channels.messages.invalidState')
    };
    showToastError(error_messages[error_param] || t('channels.messages.connectError'));
    // Clean up URL
    router.replace({ query: {} });
  }
};

onMounted(async () => {
  await Promise.all([
    loadChannels(),
    loadConnections()
  ]);

  // Check for OAuth callback
  handleOAuthCallback();
});
</script>

<style scoped>

.flex-1 {
    flex: 1;
    min-height: 0;
    overflow: hidden;
}

/* Mobile: adjust table container */
@media (max-width: 960px) {
    
    .flex-1 {
        overflow: visible;
        height: auto;
        min-height: auto;
        flex: none;
        margin-bottom: 70px;
    }

    .filter-tabs-card {
        margin-top: 12px;
    }
}
</style>
