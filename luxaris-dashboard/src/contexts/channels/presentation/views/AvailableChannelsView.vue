<template>
  <DashboardLayout>

    <!-- Header -->
    <div class="d-flex justify-space-between align-center mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold">{{ $t('channels.sections.available') }}</h1>
        <p class="text-body-1 text-medium-emphasis">
          {{ $t('channels.availableDescription') }}
        </p>
      </div>
    </div>

    <!-- Available Channels Grid -->
    <v-progress-linear v-if="loading && !channels.length" indeterminate color="primary"></v-progress-linear>

    <v-row v-else>
      <v-col
        v-for="channel in activeChannels"
        :key="channel.id"
        cols="12"
        md="6"
        lg="4"
      >
        <ChannelCard
          :channel="channel"
          :is-connected="isChannelConnected(channel.id)"
          @connect="handleConnect"
          @view-connections="handleViewConnection"
        />
      </v-col>
    </v-row>

    <v-alert v-if="!loading && !activeChannels.length" type="info" variant="tonal" class="mt-4">
      {{ $t('channels.empty.noChannels') }}
    </v-alert>
  </DashboardLayout>
</template>

<script setup>
import { onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import { useChannels } from '../../application/composables/useChannels';
import { useConnections } from '../../application/composables/useConnections';
import { useToast } from '@/shared/composables/useToast';
import ChannelCard from '../components/ChannelCard.vue';

const { t } = useI18n();
const { showToastSuccess, showToastError } = useToast();
const route = useRoute();
const router = useRouter();

const {
  channels,
  activeChannels,
  loading,
  error,
  loadChannels,
  isChannelConnected,
  clearError
} = useChannels();

const {
  loadConnections
} = useConnections();

// Watch for errors and display them as toast
watch(error, (newError) => {
  if (newError) {
    showToastError(newError);
    clearError();
  }
});

const handleConnect = async (channelId) => {
  // Error handling for OAuth flow initiation
  try {
    await loadConnections();
  } catch (err) {
    showToastError(t('channels.messages.connectError'));
  }
};

const handleViewConnection = (channelId) => {
  // Redirect to connected channels view
  router.push('/dashboard/channels/connections');
};

// Handle OAuth callback (backend redirects here with success/error query params)
const handleOAuthCallback = async () => {
  const success = route.query.success;
  const error_param = route.query.error;

  if (success === 'connected') {
    showToastSuccess(t('channels.messages.connectSuccess'));
    // Reload connections to show the new one
    await loadConnections();
    // Redirect to connections view
    router.replace('/dashboard/channels/connections');
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

