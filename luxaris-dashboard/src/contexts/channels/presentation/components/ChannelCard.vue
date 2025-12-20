<template>
  <v-card class="channel-card" :style="{ borderTop: `4px solid ${channel.color || '#1976d2'}` }">
    <v-card-text>

      <div class="d-flex align-center mb-3">
        <v-avatar :color="channel.color" size="48" class="mr-3">
          <v-icon :icon="channel.icon" size="large" color="white"></v-icon>
        </v-avatar>
        <div class="flex-grow-1">
          <div class="text-h6">{{ channel.name }}</div>
          <div class="text-caption text-medium-emphasis">{{ channel.key }}</div>
        </div>
        <v-chip
          v-if="isConnected"
          color="success"
          size="small"
          variant="tonal"
        >
          {{ $t('channels.status.connected') }}
        </v-chip>
      </div>

      <v-alert
        v-if="false && errorMessage"
        type="error"
        variant="tonal"
        density="compact"
        closable
        @click:close="errorMessage = null"
        class="mb-3"
      >
        {{ errorMessage }}
      </v-alert>

      <div v-if="channel.supportedFeatures?.length" class="mb-3">
        <div class="text-caption text-medium-emphasis mb-1">
          {{ $t('channels.fields.supportedFeatures') }}
        </div>
        <v-chip
          v-for="feature in channel.supportedFeatures"
          :key="feature"
          size="x-small"
          variant="outlined"
          class="mr-1"
        >
          {{ feature }}
        </v-chip>
      </div>

      <div class="d-flex gap-2">
        <v-btn
          v-if="!isConnected"
          color="primary"
          variant="flat"
          @click="handleConnect"
          :loading="loading"
          block
        >
          <v-icon start icon="mdi-link-variant"></v-icon>
          {{ $t('channels.actions.connect') }}
        </v-btn>

        <v-btn
          v-else
          color="primary"
          variant="outlined"
          @click="handleViewConnections"
          block
        >
          {{ $t('channels.actions.viewConnection') }}
        </v-btn>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useChannels } from '../../application/composables/useChannels';

const { t } = useI18n();

const props = defineProps({
  channel: {
    type: Object,
    required: true
  },
  isConnected: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['connect', 'view-connections']);

const { getAuthUrl } = useChannels();
const loading = ref(false);
const errorMessage = ref(null);

const handleConnect = async () => {
  loading.value = true;
  errorMessage.value = null;
  
  try {
    // Get OAuth authorization URL from backend
    const response = await getAuthUrl(props.channel.key);
    
    // Redirect to OAuth provider
    if (response.auth_url) {
      window.location.href = response.auth_url;
    }
  } catch (err) {
    console.error('Failed to get authorization URL:', err);
    
    // Extract error message from API response
    if (err.response?.data?.errors?.[0]?.error_description) {
      errorMessage.value = err.response.data.errors[0].error_description;
    } else {
      errorMessage.value = t('channels.errors.failedToConnect');
    }
  } finally {
    loading.value = false;
  }
};

const handleViewConnections = () => {
  emit('view-connections', props.channel.id);
};
</script>

<style scoped>
.channel-card {
  height: 100%;
  transition: box-shadow 0.2s;
}

.channel-card:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}
</style>
