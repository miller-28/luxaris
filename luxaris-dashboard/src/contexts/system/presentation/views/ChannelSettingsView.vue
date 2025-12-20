<template>
    <DashboardLayout>
        <v-container fluid>
            <v-row>
                <v-col cols="12">
                    <h1 class="text-h4 mb-2">{{ $t('admin.channels.title') }}</h1>
                    <p class="text-body-1 text-medium-emphasis mb-6">
                        {{ $t('admin.channels.description') }}
                    </p>

                <!-- Error Alert -->
                <v-alert
                    v-if="error"
                    type="error"
                    variant="tonal"
                    closable
                    @click:close="error = null"
                    class="mb-4"
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
                    class="mb-4"
                >
                    {{ successMessage }}
                </v-alert>

                <!-- Loading State -->
                <v-progress-linear v-if="loading" indeterminate class="mb-4" />

                <!-- Channels Grid -->
                <v-row>
                    <!-- LinkedIn -->
                    <v-col cols="12" md="6">
                        <v-card class="channel-card">
                            <v-card-title class="d-flex align-center">
                                <v-icon icon="mdi-linkedin" size="32" color="primary" class="mr-3" />
                                <span>LinkedIn</span>
                            </v-card-title>
                            <v-card-subtitle>linkedin</v-card-subtitle>
                            <v-card-text>
                                <div class="mb-4">
                                    <v-chip
                                        :color="linkedinStatus.configured ? 'success' : 'warning'"
                                        variant="tonal"
                                        size="small"
                                    >
                                        <v-icon
                                            :icon="linkedinStatus.configured ? 'mdi-check-circle' : 'mdi-alert-circle'"
                                            start
                                        />
                                        {{
                                            linkedinStatus.configured
                                                ? $t('admin.channels.configured')
                                                : $t('admin.channels.notConfigured')
                                        }}
                                    </v-chip>
                                </div>

                                <div v-if="linkedinStatus.configured && linkedinStatus.client_id_masked">
                                    <p class="text-caption text-medium-emphasis mb-1">
                                        {{ $t('admin.channels.clientId') }}
                                    </p>
                                    <p class="text-body-2 mb-3 font-monospace">
                                        {{ linkedinStatus.client_id_masked }}
                                    </p>
                                </div>

                                <p class="text-body-2 text-medium-emphasis mb-4">
                                    {{ $t('admin.channels.linkedinDescription') }}
                                </p>
                            </v-card-text>
                            <v-card-actions>
                                <v-btn
                                    color="primary"
                                    variant="flat"
                                    @click="openConfigureDialog('linkedin')"
                                    :disabled="loading"
                                >
                                    <v-icon icon="mdi-cog" start />
                                    {{
                                        linkedinStatus.configured
                                            ? $t('admin.channels.reconfigure')
                                            : $t('admin.channels.configure')
                                    }}
                                </v-btn>
                                <v-btn
                                    v-if="linkedinStatus.configured"
                                    color="error"
                                    variant="text"
                                    @click="confirmDelete('LinkedIn', 'linkedin')"
                                    :disabled="loading"
                                >
                                    <v-icon icon="mdi-delete" start />
                                    {{ $t('admin.channels.delete') }}
                                </v-btn>
                            </v-card-actions>
                        </v-card>
                    </v-col>

                    <!-- X (Twitter) -->
                    <v-col cols="12" md="6">
                        <v-card class="channel-card">
                            <v-card-title class="d-flex align-center">
                                <v-icon icon="mdi-twitter" size="32" color="blue-darken-2" class="mr-3" />
                                <span>X (Twitter)</span>
                            </v-card-title>
                            <v-card-subtitle>x</v-card-subtitle>
                            <v-card-text>
                                <div class="mb-4">
                                    <v-chip
                                        :color="xStatus.configured ? 'success' : 'warning'"
                                        variant="tonal"
                                        size="small"
                                    >
                                        <v-icon
                                            :icon="xStatus.configured ? 'mdi-check-circle' : 'mdi-alert-circle'"
                                            start
                                        />
                                        {{
                                            xStatus.configured
                                                ? $t('admin.channels.configured')
                                                : $t('admin.channels.notConfigured')
                                        }}
                                    </v-chip>
                                </div>

                                <div v-if="xStatus.configured && xStatus.client_id_masked">
                                    <p class="text-caption text-medium-emphasis mb-1">
                                        {{ $t('admin.channels.clientId') }}
                                    </p>
                                    <p class="text-body-2 mb-3 font-monospace">
                                        {{ xStatus.client_id_masked }}
                                    </p>
                                </div>

                                <p class="text-body-2 text-medium-emphasis mb-4">
                                    {{ $t('admin.channels.xDescription') }}
                                </p>
                            </v-card-text>
                            <v-card-actions>
                                <v-btn
                                    color="primary"
                                    variant="flat"
                                    @click="openConfigureDialog('x')"
                                    :disabled="loading"
                                >
                                    <v-icon icon="mdi-cog" start />
                                    {{
                                        xStatus.configured
                                            ? $t('admin.channels.reconfigure')
                                            : $t('admin.channels.configure')
                                    }}
                                </v-btn>
                                <v-btn
                                    v-if="xStatus.configured"
                                    color="error"
                                    variant="text"
                                    @click="confirmDelete('X (Twitter)', 'x')"
                                    :disabled="loading"
                                >
                                    <v-icon icon="mdi-delete" start />
                                    {{ $t('admin.channels.delete') }}
                                </v-btn>
                            </v-card-actions>
                        </v-card>
                    </v-col>
                </v-row>
            </v-col>
        </v-row>
        </v-container>

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
    </DashboardLayout>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
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

const openConfigureDialog = async (channel) => {
    selectedChannel.value = channel;
    selectedChannelName.value = channel === 'linkedin' ? 'LinkedIn' : 'X (Twitter)';
    
    // Check if channel is already configured and load existing credentials
    const isConfigured = (channel === 'linkedin' && linkedinStatus.value.configured) || 
                         (channel === 'x' && xStatus.value.configured);
    
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
            const response = await channelsRepository.getOAuthCredentials(channel, true);
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
</style>
