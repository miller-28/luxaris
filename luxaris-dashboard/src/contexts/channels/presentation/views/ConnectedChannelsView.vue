<template>
  <DashboardLayout>

    <!-- Header -->
    <div class="d-flex justify-space-between align-center mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold">{{ $t('channels.sections.connections') }}</h1>
        <p class="text-body-1 text-medium-emphasis">
          {{ $t('channels.connectionsDescription') }}
        </p>
      </div>
      
      <v-chip
        v-if="activeConnections.length"
        color="success"
        variant="tonal"
      >
        {{ activeConnections.length }} {{ $t('channels.status.connected') }}
      </v-chip>
    </div>

    <!-- Filter Tabs -->
    <v-tabs v-model="selectedTab" class="mb-4">
      <v-tab value="all">
        {{ $t('channels.filters.all') }}
        <v-chip size="small" class="ml-2">{{ connections.length }}</v-chip>
      </v-tab>
      <v-tab value="connected">
        {{ $t('channels.filters.connected') }}
        <v-chip size="small" class="ml-2">{{ activeConnections.length }}</v-chip>
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

    <v-progress-linear v-if="loading" indeterminate color="primary"></v-progress-linear>

    <!-- Connections List -->
    <v-row v-else-if="filteredConnections.length">
      <v-col
        v-for="connection in filteredConnections"
        :key="connection.id"
        cols="12"
        md="6"
      >
        <ConnectionCard
          :connection="connection"
          @disconnect="handleDisconnect"
        />

      </v-col>
    </v-row>

    <v-alert v-else type="info" variant="tonal">
      {{ $t('channels.empty.noConnections') }}
    </v-alert>

    <!-- Disconnect Confirmation Modal -->
    <DisconnectModal
      v-model="disconnectModalVisible"
      :connection="connectionToDisconnect"
      @confirmed="handleDisconnectConfirmed"
    />

  </DashboardLayout>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { useConnections } from '../../application/composables/useConnections';
import { useToast } from '@/shared/composables/useToast';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import ConnectionCard from '../components/ConnectionCard.vue';
import DisconnectModal from '../components/DisconnectModal.vue';


const { t } = useI18n();
const { showToastSuccess, showToastError } = useToast();
const route = useRoute();
const router = useRouter();

const {
  connections,
  activeConnections,
  errorConnections,
  expiredConnections,
  loading,
  error,
  loadConnections,
  clearError
} = useConnections();

const selectedTab = ref('all');
const disconnectModalVisible = ref(false);
const connectionToDisconnect = ref(null);

// Watch for errors and display them as toast
watch(error, (newError) => {
  if (newError) {
    showToastError(newError);
    clearError();
  }
});

const filteredConnections = computed(() => {
  switch (selectedTab.value) {
    case 'connected':
      return activeConnections.value;
    case 'error':
      return errorConnections.value;
    case 'expired':
      return expiredConnections.value;
    default:
      return connections.value;
  }
});

const handleDisconnect = (connection) => {
  connectionToDisconnect.value = connection;
  disconnectModalVisible.value = true;
};

const handleDisconnectConfirmed = () => {
  showToastSuccess(t('channels.messages.disconnectSuccess'));
  connectionToDisconnect.value = null;
};

onMounted(async () => {

  await loadConnections();

  const success = route.query.success;
  const error_param = route.query.error;

  if (success === 'connected') {
    showToastSuccess(t('channels.messages.connectSuccess'));
    router.replace({ query: {} });
  } else if (error_param) {
    const error_messages = {
      oauth_denied: t('channels.messages.oauthDenied'),
      invalid_callback: t('channels.messages.invalidCallback'),
      invalid_state: t('channels.messages.invalidState')
    };
    showToastError(error_messages[error_param] || t('channels.messages.connectError'));
    router.replace({ query: {} });
  }
});
</script>
