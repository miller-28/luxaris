<template>
  <v-card class="connection-card">
    <v-card-text>
      <div class="d-flex align-center mb-3">
        <v-avatar :color="connection.channel_color || 'primary'" size="40" class="mr-3">
          <v-icon v-if="connection.channel_icon" :icon="connection.channel_icon" color="white"></v-icon>
          <span v-else class="text-white">{{ connection.channel_display_name[0] }}</span>
        </v-avatar>
        <div class="flex-grow-1">
          <div class="text-subtitle-1 font-weight-medium">{{ connection.account_name }}</div>
          <div class="text-caption text-medium-emphasis">
            {{ connection.channel_display_name }}
            <span v-if="connection.account_username">@{{ connection.account_username }}</span>
          </div>
        </div>
        <v-chip
          :color="connection.statusColor"
          size="small"
          variant="tonal"
        >
          {{ $t(`channels.status.${connection.status}`) }}
        </v-chip>
      </div>

      <v-alert
        v-if="connection.hasError && connection.error_message"
        type="error"
        variant="tonal"
        density="compact"
        class="mb-3"
      >
        {{ connection.error_message }}
      </v-alert>

      <div class="text-caption text-medium-emphasis mb-3">
        {{ $t('channels.fields.lastUsed') }}: 
        {{ connection.last_used_at ? formatDate(connection.last_used_at) : $t('common.never') }}
      </div>

      <v-divider class="mb-3"></v-divider>

      <div class="d-flex gap-2">
        <v-btn
          size="small"
          variant="outlined"
          @click="handleTest"
          :loading="testing"
          :disabled="loading"
        >
          <v-icon start icon="mdi-check-circle-outline"></v-icon>
          {{ $t('channels.actions.test') }}
        </v-btn>

        <v-btn
          v-if="connection.hasError || connection.isExpired"
          size="small"
          color="warning"
          variant="outlined"
          @click="handleReconnect"
          :loading="reconnecting"
          :disabled="loading"
        >
          <v-icon start icon="mdi-refresh"></v-icon>
          {{ $t('channels.actions.reconnect') }}
        </v-btn>

        <v-spacer></v-spacer>

        <v-btn
          size="small"
          color="error"
          variant="text"
          @click="handleDisconnect"
          :disabled="loading"
        >
          <v-icon start icon="mdi-link-variant-off"></v-icon>
          {{ $t('channels.actions.disconnect') }}
        </v-btn>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { formatDistanceToNow } from 'date-fns';
import { useConnections } from '../../application/composables/useConnections';
import { useToast } from '@/shared/composables/useToast';

const { t } = useI18n();
const { showToastSuccess, showToastError } = useToast();

const props = defineProps({
  connection: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['reconnect', 'disconnect']);

const { testConnection, reconnectChannel } = useConnections();

const testing = ref(false);
const reconnecting = ref(false);

const loading = computed(() => testing.value || reconnecting.value);

const formatDate = (dateString) => {
  try {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  } catch {
    return dateString;
  }
};

const handleTest = async () => {
    testing.value = true;
    try {
      await testConnection(props.connection.id);
      showToastSuccess(t('channels.messages.testSuccess'));
    } catch (err) {
      const errorMessage = err.response?.data?.errors?.[0]?.error_description || err.message;
      showToastError(errorMessage);
    } finally {
      testing.value = false;
    }
};

const handleReconnect = async () => {
  reconnecting.value = true;
  try {
    const response = await reconnectChannel(props.connection.id);
    if (response.auth_url) {
      window.location.href = response.auth_url;
    }
    emit('reconnect', props.connection.id);
  } catch (err) {
    console.error('Reconnect failed:', err);
  } finally {
    reconnecting.value = false;
  }
};

const handleDisconnect = () => {
  emit('disconnect', props.connection);
};

</script>

<style scoped>
.connection-card {
  transition: box-shadow 0.2s;
}

.connection-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}
</style>
