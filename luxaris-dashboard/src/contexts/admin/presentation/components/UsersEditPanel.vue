<template>
    <AbstractEditPanel
        :title="isEditMode ? $t('admin.users.editUser') : $t('admin.users.viewUser')"
        :loading="loading"
        :disabled="!canEdit"
        @close="$emit('close')"
        @submit="handleSubmit"
    >
        <template #content>
            <v-form ref="formRef" @submit.prevent="handleSubmit">
                <!-- Status Banner for Pending Users -->
                <v-alert 
                    v-if="user?.status === 'pending_approval'"
                    type="warning"
                    variant="tonal"
                    class="mb-4"
                >
                    <div class="d-flex align-center justify-space-between">
                        <div>
                            <strong>{{ $t('admin.users.edit.pendingApprovalBanner') }}</strong>
                        </div>
                        <v-btn
                            color="success"
                            variant="flat"
                            @click="handleApprove"
                            :loading="loading"
                        >
                            {{ $t('admin.users.actions.approve') }}
                        </v-btn>
                    </div>
                </v-alert>

                <!-- Status Action Buttons -->
                <v-alert 
                    v-if="user?.status === 'active' && !user?.is_root"
                    type="info"
                    variant="tonal"
                    class="mb-4"
                >
                    <div class="d-flex align-center justify-space-between">
                        <div>
                            <strong>{{ $t('admin.users.edit.accountActive') }}</strong>
                        </div>
                        <v-btn
                            color="warning"
                            variant="flat"
                            @click="handleDisable"
                            :loading="loading"
                        >
                            {{ $t('admin.users.actions.disable') }}
                        </v-btn>
                    </div>
                </v-alert>

                <v-alert 
                    v-if="user?.status === 'disabled' && !user?.is_root"
                    type="error"
                    variant="tonal"
                    class="mb-4"
                >
                    <div class="d-flex align-center justify-space-between">
                        <div>
                            <strong>{{ $t('admin.users.edit.accountDisabled') }}</strong>
                        </div>
                        <v-btn
                            color="success"
                            variant="flat"
                            @click="handleEnable"
                            :loading="loading"
                        >
                            {{ $t('admin.users.actions.enable') }}
                        </v-btn>
                    </div>
                </v-alert>

                <!-- User Info Section -->
                <v-card variant="outlined" class="mb-4">
                    <v-card-title class="text-subtitle-1">
                        {{ $t('admin.users.edit.sections.userInfo') }}
                    </v-card-title>
                    <v-card-text>
                        <v-row>
                            <v-col cols="12" md="6">
                                <v-text-field
                                    v-model="formData.name"
                                    :label="$t('admin.users.edit.fields.name')"
                                    :rules="[rules.required]"
                                    variant="outlined"
                                    density="compact"
                                    :readonly="!canEdit"
                                />
                            </v-col>
                            <v-col cols="12" md="6">
                                <v-text-field
                                    v-model="formData.email"
                                    :label="$t('admin.users.edit.fields.email')"
                                    :rules="[rules.required, rules.email]"
                                    variant="outlined"
                                    density="compact"
                                    readonly
                                    disabled
                                />
                            </v-col>
                            <v-col cols="12" md="6">
                                <v-select
                                    v-model="formData.status"
                                    :label="$t('admin.users.edit.fields.status')"
                                    :items="statusOptions"
                                    variant="outlined"
                                    density="compact"
                                    :readonly="!canEdit || user?.is_root"
                                />
                            </v-col>
                            <v-col cols="12" md="6">
                                <v-text-field
                                    :model-value="user?.auth_method ? $t(`admin.users.authMethod.${user.auth_method}`) : ''"
                                    :label="$t('admin.users.edit.fields.authMethod')"
                                    variant="outlined"
                                    density="compact"
                                    readonly
                                    disabled
                                />
                            </v-col>
                        </v-row>
                    </v-card-text>
                </v-card>

                <!-- Password Section (only for password auth) -->
                <v-card v-if="user?.auth_method === 'password' && canEdit" variant="outlined" class="mb-4">
                    <v-card-title class="text-subtitle-1">
                        {{ $t('admin.users.edit.sections.password') }}
                    </v-card-title>
                    <v-card-text>
                        <v-row>
                            <v-col cols="12">
                                <v-text-field
                                    v-model="formData.new_password"
                                    :label="$t('admin.users.edit.fields.newPassword')"
                                    type="password"
                                    variant="outlined"
                                    density="compact"
                                    :hint="$t('admin.users.edit.hints.passwordOptional')"
                                    persistent-hint
                                />
                            </v-col>
                            <v-col cols="12">
                                <v-text-field
                                    v-model="formData.confirm_password"
                                    :label="$t('admin.users.edit.fields.confirmPassword')"
                                    type="password"
                                    variant="outlined"
                                    density="compact"
                                    :rules="formData.new_password ? [rules.passwordMatch] : []"
                                />
                            </v-col>
                        </v-row>
                    </v-card-text>
                </v-card>

                <!-- Preferences Section -->
                <v-card variant="outlined" class="mb-4">
                    <v-card-title class="text-subtitle-1">
                        {{ $t('admin.users.edit.sections.preferences') }}
                    </v-card-title>
                    <v-card-text>
                        <v-row>
                            <v-col cols="12" md="6">
                                <v-select
                                    v-model="formData.timezone"
                                    :label="$t('admin.users.edit.fields.timezone')"
                                    :items="timezoneOptions"
                                    variant="outlined"
                                    density="compact"
                                    :readonly="!canEdit"
                                />
                            </v-col>
                            <v-col cols="12" md="6">
                                <v-select
                                    v-model="formData.locale"
                                    :label="$t('admin.users.edit.fields.locale')"
                                    :items="localeOptions"
                                    variant="outlined"
                                    density="compact"
                                    :readonly="!canEdit"
                                />
                            </v-col>
                        </v-row>
                    </v-card-text>
                </v-card>

                <!-- Permissions Section (Mock) -->
                <v-card variant="outlined" class="mb-4">
                    <v-card-title class="text-subtitle-1 d-flex align-center justify-space-between">
                        <span>{{ $t('admin.users.edit.sections.permissions') }}</span>
                        <v-btn
                            v-if="canEdit && !user?.is_root"
                            variant="outlined"
                            size="small"
                            @click="openPermissionsModal"
                        >
                            <v-icon start>mdi-pencil</v-icon>
                            {{ $t('admin.users.actions.editPermissions') }}
                        </v-btn>
                    </v-card-title>
                    <v-card-text>
                        <v-chip-group>
                            <v-chip
                                v-if="user?.is_root"
                                color="error"
                                size="small"
                            >
                                {{ $t('admin.users.rootAdmin') }} - {{ $t('admin.users.allPermissions') }}
                            </v-chip>
                            <v-chip
                                v-else
                                color="default"
                                size="small"
                            >
                                {{ $t('admin.users.edit.permissionsCount', { count: 0 }) }}
                            </v-chip>
                        </v-chip-group>
                        <div class="text-caption text-grey mt-2">
                            {{ $t('admin.users.edit.hints.permissionsFeature') }}
                        </div>
                    </v-card-text>
                </v-card>

                <!-- Activity Section -->
                <v-card variant="outlined" class="mb-4">
                    <v-card-title class="text-subtitle-1">
                        {{ $t('admin.users.edit.sections.activity') }}
                    </v-card-title>
                    <v-card-text>
                        <v-row>
                            <v-col cols="12" md="4">
                                <div class="text-caption text-grey">{{ $t('admin.users.edit.fields.createdAt') }}</div>
                                <div>{{ formatDateTime(user?.created_at) }}</div>
                            </v-col>
                            <v-col cols="12" md="4">
                                <div class="text-caption text-grey">{{ $t('admin.users.edit.fields.updatedAt') }}</div>
                                <div>{{ formatDateTime(user?.updated_at) }}</div>
                            </v-col>
                            <v-col cols="12" md="4">
                                <div class="text-caption text-grey">{{ $t('admin.users.edit.fields.lastLoginAt') }}</div>
                                <div>{{ formatDateTime(user?.last_login_at) }}</div>
                            </v-col>
                        </v-row>
                    </v-card-text>
                </v-card>
            </v-form>
        </template>

        <template #actions>
            <v-spacer />
            <v-btn 
                variant="text"
                @click="$emit('close')"
                :disabled="loading"
            >
                {{ $t('common.cancel') }}
            </v-btn>
            <v-btn 
                v-if="canEdit"
                color="primary"
                @click="handleSubmit"
                :loading="loading"
            >
                {{ $t('common.save') }}
            </v-btn>
        </template>
    </AbstractEditPanel>

    <!-- Permissions Modal (Mock) -->
    <v-dialog v-model="permissionsModal" max-width="600">
        <v-card>
            <v-card-title>{{ $t('admin.users.edit.permissionsModal.title') }}</v-card-title>
            <v-card-text>
                <v-alert type="info" variant="tonal">
                    {{ $t('admin.users.edit.permissionsModal.comingSoon') }}
                </v-alert>
            </v-card-text>
            <v-card-actions>
                <v-spacer />
                <v-btn @click="permissionsModal = false">{{ $t('common.close') }}</v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import AbstractEditPanel from '@/shared/components/AbstractEditPanel.vue';

const { t: $t } = useI18n();

const props = defineProps({
    user: {
        type: Object,
        default: null
    },
    loading: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits(['close', 'submit', 'approve', 'disable', 'enable']);

const formRef = ref(null);
const permissionsModal = ref(false);

const formData = ref({
    name: '',
    email: '',
    status: 'active',
    new_password: '',
    confirm_password: '',
    timezone: 'UTC',
    locale: 'en'
});

const isEditMode = computed(() => !!props.user?.id);
const canEdit = computed(() => !props.user?.is_root);

const statusOptions = computed(() => [
    { title: $t('admin.users.status.active'), value: 'active' },
    { title: $t('admin.users.status.pending_approval'), value: 'pending_approval' },
    { title: $t('admin.users.status.disabled'), value: 'disabled' }
]);

const timezoneOptions = [
    { title: 'UTC', value: 'UTC' },
    { title: 'America/New_York', value: 'America/New_York' },
    { title: 'America/Chicago', value: 'America/Chicago' },
    { title: 'America/Los_Angeles', value: 'America/Los_Angeles' },
    { title: 'Europe/London', value: 'Europe/London' },
    { title: 'Europe/Paris', value: 'Europe/Paris' },
    { title: 'Asia/Tokyo', value: 'Asia/Tokyo' },
    { title: 'Asia/Shanghai', value: 'Asia/Shanghai' }
];

const localeOptions = [
    { title: 'English', value: 'en' },
    { title: 'Español', value: 'es' },
    { title: 'Français', value: 'fr' },
    { title: 'Deutsch', value: 'de' }
];

const rules = {
    required: (value) => !!value || $t('validation.required'),
    email: (value) => {
        const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return pattern.test(value) || $t('validation.email');
    },
    passwordMatch: (value) => {
        return value === formData.value.new_password || $t('admin.users.edit.validation.passwordsMatch');
    }
};

watch(() => props.user, (newUser) => {
    if (newUser) {
        formData.value = {
            name: newUser.name || '',
            email: newUser.email || '',
            status: newUser.status || 'active',
            new_password: '',
            confirm_password: '',
            timezone: newUser.timezone || 'UTC',
            locale: newUser.locale || 'en'
        };
    }
}, { immediate: true });

const formatDateTime = (dateString) => {
    if (!dateString) {
        return $t('common.never');
    }
    const date = new Date(dateString);
    return date.toLocaleString();
};

const openPermissionsModal = () => {
    permissionsModal.value = true;
};

const handleApprove = () => {
    emit('approve', props.user.id);
};

const handleDisable = () => {
    emit('disable', props.user.id);
};

const handleEnable = () => {
    emit('enable', props.user.id);
};

const handleSubmit = async () => {
    const { valid } = await formRef.value.validate();
    
    if (!valid) {
        return;
    }

    const updateData = {
        name: formData.value.name,
        status: formData.value.status,
        timezone: formData.value.timezone,
        locale: formData.value.locale
    };

    // Only include password if it's set
    if (formData.value.new_password) {
        updateData.new_password = formData.value.new_password;
    }

    emit('submit', updateData);
};
</script>

<style scoped>
/* Custom styles for user edit panel */
</style>
