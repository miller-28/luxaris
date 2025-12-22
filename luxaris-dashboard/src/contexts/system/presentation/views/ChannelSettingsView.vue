<template>
    <DashboardLayout>
        <div class="page-content">
            <!-- Header -->
            <AbstractPageHeader
                :title="$t('admin.channels.title')"
                :subtitle="$t('admin.channels.description')"
            />

            <!-- Error Alert -->
            <v-alert
                v-if="error"
                type="error"
                variant="tonal"
                closable
                @click:close="error = null"
            >
                {{ error }}
            </v-alert>

            <!-- Success Alert -->
            <v-alert
                v-if="successMessage"
                type="success"
                variant="tonal"
                closable
                @click:close="successMessage = null"
            >
                {{ successMessage }}
            </v-alert>

            <!-- Loading State -->
            <v-progress-linear v-if="loading" indeterminate />

            <!-- Admin Channels Grid Table -->
            <AdminChannelsGridTable
                class="flex-1"
                :channels="channelItems"
                :loading="loading"
                @configure="openConfigureDialog"
                @delete="confirmDelete"
            />

            <!-- Configure OAuth Dialog -->
            <v-dialog v-model="configureDialog" max-width="600">
                <v-card>
                <v-card-title class="text-h5">
                    {{ $t('admin.channels.configureOAuth', { channel: selectedChannelName }) }}
                </v-card-title>
                <v-card-text>
                    <v-form ref="formRef" @submit.prevent="saveConfiguration">
                        <v-alert type="info" variant="tonal" class="mb-4">
                            <p class="text-body-2 mb-2">
                                {{ $t('admin.channels.configureInstructions') }}
                            </p>
                            <v-btn
                                :href="
                                    selectedChannel === 'linkedin'
                                        ? 'https://www.linkedin.com/developers/'
                                        : 'https://developer.twitter.com/en/portal/dashboard'
                                "
                                target="_blank"
                                size="small"
                                variant="text"
                                color="primary"
                            >
                                {{ $t('admin.channels.openDeveloperPortal') }}
                                <v-icon icon="mdi-open-in-new" end />
                            </v-btn>
                        </v-alert>

                        <v-text-field
                            v-model="formData.clientId"
                            :label="$t('admin.channels.clientId')"
                            :rules="[rules.required]"
                            variant="outlined"
                            class="mb-3"
                            :disabled="saving"
                            autocomplete="off"
                            name="oauth-client-id"
                        />

                        <v-text-field
                            v-model="formData.clientSecret"
                            :label="$t('admin.channels.clientSecret')"
                            :rules="[rules.required]"
                            :type="showSecret ? 'text' : 'password'"
                            :append-inner-icon="showSecret ? 'mdi-eye-off' : 'mdi-eye'"
                            @click:append-inner="showSecret = !showSecret"
                            variant="outlined"
                            :disabled="saving"
                            autocomplete="new-password"
                            name="oauth-client-secret"
                        />
                    </v-form>
                </v-card-text>
                <v-card-actions>
                    <v-spacer />
                    <v-btn color="grey" variant="text" @click="closeConfigureDialog" :disabled="saving">
                        {{ $t('common.cancel') }}
                    </v-btn>
                    <v-btn color="primary" variant="flat" @click="saveConfiguration" :loading="saving">
                        {{ $t('common.save') }}
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <!-- Delete Confirmation Dialog -->
        <v-dialog v-model="deleteDialog" max-width="500">
            <v-card>
                <v-card-title class="text-h5">
                    {{ $t('admin.channels.deleteConfirmTitle') }}
                </v-card-title>
                <v-card-text>
                    {{ $t('admin.channels.deleteConfirmMessage', { channel: deleteChannelName }) }}
                </v-card-text>
                <v-card-actions>
                    <v-spacer />
                    <v-btn color="grey" variant="text" @click="deleteDialog = false" :disabled="deleting">
                        {{ $t('common.cancel') }}
                    </v-btn>
                    <v-btn color="error" variant="flat" @click="deleteConfiguration" :loading="deleting">
                        {{ $t('common.delete') }}
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
        </div>
    </DashboardLayout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import AbstractPageHeader from '@/shared/components/AbstractPageHeader.vue';
import AdminChannelsGridTable from '../components/AdminChannelsGridTable.vue';
import { channelsRepository } from '@/contexts/system/infrastructure/api/channelsRepository';
import { useToast } from '@/shared/composables/useToast';

const { t } = useI18n();
const { showToastSuccess, showToastError } = useToast();

// State
const loading = ref(false);
const error = ref(null);
const successMessage = ref(null);

const linkedinStatus = ref({
    configured: false,
    client_id_masked: null,
});

const xStatus = ref({
    configured: false,
    client_id_masked: null,
});

// Computed property to combine channel data for grid table
const channelItems = computed(() => [
    {
        channel_key: 'linkedin',
        display_name: 'LinkedIn',
        configured: linkedinStatus.value.configured,
        client_id_masked: linkedinStatus.value.client_id_masked
    },
    {
        channel_key: 'x',
        display_name: 'X (Twitter)',
        configured: xStatus.value.configured,
        client_id_masked: xStatus.value.client_id_masked
    }
]);

// Configure Dialog
const configureDialog = ref(false);
const selectedChannel = ref(null);
const selectedChannelName = ref('');
const formData = ref({
    clientId: '',
    clientSecret: '',
});
const showSecret = ref(false);
const saving = ref(false);
const formRef = ref(null);

// Delete Dialog
const deleteDialog = ref(false);
const deleteChannelName = ref('');
const deleteChannelKey = ref(null);
const deleting = ref(false);

// Validation Rules
const rules = {
    required: (value) => !!value || t('validation.required'),
};

// Methods
const loadChannelStatus = async () => {
    loading.value = true;
    error.value = null;

    try {
        // Load LinkedIn status
        try {
            const linkedinResponse = await channelsRepository.getOAuthCredentials('linkedin');
            
            // Check if response has the expected structure
            if (linkedinResponse?.data?.data) {
                const linkedinData = linkedinResponse.data.data;
                linkedinStatus.value = {
                    configured: linkedinData.configured || false,
                    client_id_masked: linkedinData.client_id_masked || null,
                };
            } else {
                console.warn('[ChannelSettings] LinkedIn response missing data.data:', linkedinResponse);
                linkedinStatus.value = { configured: false, client_id_masked: null };
            }
        } catch (err) {
            console.error('[ChannelSettings] Failed to load LinkedIn status:', err);
            // Not configured yet or error occurred
            linkedinStatus.value = { configured: false, client_id_masked: null };
        }

        // Load X status
        try {
            const xResponse = await channelsRepository.getOAuthCredentials('x');
            
            // Check if response has the expected structure
            if (xResponse?.data?.data) {
                const xData = xResponse.data.data;
                xStatus.value = {
                    configured: xData.configured || false,
                    client_id_masked: xData.client_id_masked || null,
                };
            } else {
                console.warn('[ChannelSettings] X response missing data.data:', xResponse);
                xStatus.value = { configured: false, client_id_masked: null };
            }
        } catch (err) {
            console.error('[ChannelSettings] Failed to load X status:', err);
            // Not configured yet or error occurred
            xStatus.value = { configured: false, client_id_masked: null };
        }
    } catch (err) {
        console.error('[ChannelSettings] Failed to load channel status:', err);
        error.value = err.response?.data?.errors?.[0]?.error_description || t('admin.channels.loadError');
    } finally {
        loading.value = false;
    }
};

const openConfigureDialog = async (channelKey, channelName) => {
    selectedChannel.value = channelKey;
    selectedChannelName.value = channelName || (channelKey === 'linkedin' ? 'LinkedIn' : 'X (Twitter)');
    
    // Check if channel is already configured and load existing credentials
    const isConfigured = (channelKey === 'linkedin' && linkedinStatus.value.configured) || 
                         (channelKey === 'x' && xStatus.value.configured);
    
    if (isConfigured) {
        // Show dialog with loading state
        formData.value = {
            clientId: '',
            clientSecret: '',
        };
        showSecret.value = false;
        configureDialog.value = true;
        loading.value = true;
        
        try {
            // Fetch decrypted credentials for editing
            const response = await channelsRepository.getOAuthCredentials(channelKey, true);
            const credentials = response.data.data;
            
            if (credentials && credentials.client_id && credentials.client_secret) {
                formData.value = {
                    clientId: credentials.client_id,
                    clientSecret: credentials.client_secret,
                };
            } else {
                console.warn('[ChannelSettings] Credentials incomplete:', credentials);
            }
        } catch (err) {
            console.error('[ChannelSettings] Failed to load credentials for editing:', err);
            error.value = t('admin.channels.loadError');
        } finally {
            loading.value = false;
        }
    } else {
        formData.value = {
            clientId: '',
            clientSecret: '',
        };
        showSecret.value = false;
        configureDialog.value = true;
    }
};

const closeConfigureDialog = () => {
    configureDialog.value = false;
    selectedChannel.value = null;
    formData.value = {
        clientId: '',
        clientSecret: '',
    };
};

const saveConfiguration = async () => {
    // Validate form
    const { valid } = await formRef.value.validate();
    if (!valid) return;

    saving.value = true;
    error.value = null;

    try {
        await channelsRepository.saveOAuthCredentials(
            selectedChannel.value,
            formData.value.clientId,
            formData.value.clientSecret
        );

        // Update UI state immediately for better UX
        const maskedClientId = formData.value.clientId.length > 12 
            ? `${formData.value.clientId.substring(0, 8)}...${formData.value.clientId.substring(formData.value.clientId.length - 4)}`
            : formData.value.clientId;

        if (selectedChannel.value === 'linkedin') {
            linkedinStatus.value = {
                configured: true,
                client_id_masked: maskedClientId,
            };
        } else if (selectedChannel.value === 'x') {
            xStatus.value = {
                configured: true,
                client_id_masked: maskedClientId,
            };
        }

        showToastSuccess(t('admin.channels.saveSuccess', { channel: selectedChannelName.value }));
        closeConfigureDialog();
        
        // Reload from server to confirm
        await loadChannelStatus();
    } catch (err) {
        const errorMsg = err.response?.data?.errors?.[0]?.error_description || t('admin.channels.saveError');
        showToastError(errorMsg);
        error.value = errorMsg;
    } finally {
        saving.value = false;
    }
};

const confirmDelete = (channelName, channelKey) => {
    deleteChannelName.value = channelName;
    deleteChannelKey.value = channelKey;
    deleteDialog.value = true;
};

const deleteConfiguration = async () => {
    deleting.value = true;
    error.value = null;

    try {
        await channelsRepository.deleteOAuthCredentials(deleteChannelKey.value);
        showToastSuccess(t('admin.channels.deleteSuccess', { channel: deleteChannelName.value }));
        deleteDialog.value = false;
        await loadChannelStatus();
    } catch (err) {
        const errorMsg = err.response?.data?.errors?.[0]?.error_description || t('admin.channels.deleteError');
        showToastError(errorMsg);
        error.value = errorMsg;
    } finally {
        deleting.value = false;
    }
};

// Lifecycle
onMounted(() => {
    loadChannelStatus();
});
</script>

<style scoped>

.font-monospace {
    font-family: 'Courier New', monospace;
}

.channel-card {
    height: 100%;
    display: flex;
    flex-direction: column;
}

.channel-card .v-card-text {
    flex-grow: 1;
}

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
}
</style>
