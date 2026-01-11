<template>
    <v-dialog v-model="dialogVisible" max-width="500">
        <v-card>
            <v-card-title class="d-flex align-center">
                <v-icon icon="mdi-alert" color="error" class="mr-2"></v-icon>
                {{ $t('channels.disconnect.title') }}
            </v-card-title>

            <v-card-text>
                <v-alert type="warning" variant="tonal" class="mb-4">
                    {{ $t('channels.disconnect.warning') }}
                </v-alert>

                <div v-if="connection" class="d-flex align-center pa-3 bg-surface-variant rounded">
                    <v-avatar :color="connection.channel_color || 'primary'" size="40" class="mr-3">
                        <v-icon v-if="connection.channel_icon" :icon="connection.channel_icon" color="white"></v-icon>
                    </v-avatar>
                    <div>
                        <div class="text-subtitle-1 font-weight-medium">{{ connection.account_name }}</div>
                        <div class="text-caption text-medium-emphasis">{{ connection.channel_display_name }}</div>
                    </div>
                </div>

                <p class="text-body-2 text-medium-emphasis mt-4 mb-0">
                    {{ $t('channels.disconnect.confirmation') }}
                </p>
            </v-card-text>

            <v-card-actions>
                <v-spacer></v-spacer>
                <v-btn
                    variant="text"
                    @click="handleCancel"
                    :disabled="loading"
                >
                    {{ $t('common.cancel') }}
                </v-btn>
                <v-btn
                    color="error"
                    variant="flat"
                    @click="handleConfirm"
                    :loading="loading"
                >
                    {{ $t('channels.actions.disconnect') }}
                </v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useConnections } from '../../application/composables/useConnections';

const { t } = useI18n();

const props = defineProps({
    modelValue: {
        type: Boolean,
        default: false
    },
    connection: {
        type: Object,
        default: null
    }
});

const emit = defineEmits(['update:modelValue', 'confirmed']);

const { disconnectChannel } = useConnections();
const loading = ref(false);

const dialogVisible = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value)
});

const handleCancel = () => {
    dialogVisible.value = false;
};

const handleConfirm = async () => {
    if (!props.connection) {
        return;
    }

    loading.value = true;
    try {
        await disconnectChannel(props.connection.id);
        emit('confirmed', props.connection.id);
        dialogVisible.value = false;
    } catch (err) {
        console.error('Failed to disconnect:', err);
    } finally {
        loading.value = false;
    }
};
</script>
