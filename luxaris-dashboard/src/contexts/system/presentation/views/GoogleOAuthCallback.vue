<template>
    <AuthLayout>
        <v-card elevation="8" class="mx-auto" max-width="500">
            <v-card-text class="text-center pa-12">
                <v-progress-circular
                    v-if="loading"
                    indeterminate
                    color="primary"
                    size="64"
                />
        
                <template v-else-if="error">
                    <v-icon size="64" color="error">mdi-alert-circle</v-icon>
                    <div class="text-h6 mt-4">{{ $t('auth.oauth.authenticationFailed') }}</div>
                    <div class="text-body-2 mt-2">{{ error }}</div>
                    <v-btn
                        color="primary"
                        class="mt-6"
                        @click="$router.push('/login')"
                    >
                        {{ $t('auth.oauth.returnToLogin') }}
                    </v-btn>
                </template>
        
                <template v-else-if="isPending">
                    <v-icon size="64" color="info">mdi-clock-outline</v-icon>
                    <div class="text-h6 mt-4">{{ $t('auth.oauth.pendingApproval') }}</div>
                    <div class="text-body-2 mt-2">
                        {{ $t('auth.oauth.pendingApprovalMessage') }}
                    </div>
                    <v-btn
                        color="primary"
                        class="mt-6"
                        @click="$router.push('/login')"
                    >
                        {{ $t('auth.oauth.returnToLogin') }}
                    </v-btn>
                </template>

                <template v-else>
                    <v-icon size="64" color="success">mdi-check-circle</v-icon>
                    <div class="text-h6 mt-4">{{ $t('auth.oauth.authenticationSuccessful') }}</div>
                    <div class="text-body-2 mt-2">{{ $t('auth.oauth.redirectingToDashboard') }}</div>
                </template>
            </v-card-text>
        </v-card>
    </AuthLayout>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuth } from '../../application/composables/useAuth';
import AuthLayout from '@/layouts/AuthLayout.vue';

const route = useRoute();
const { t } = useI18n();
const { handleGoogleCallback } = useAuth();

const loading = ref(true);
const error = ref(null);
const isPending = ref(false);

onMounted(async () => {
    const code = route.query.code;
    const state = route.query.state;

    if (!code || !state) {
        error.value = t('auth.oauth.invalidOAuthParameters');
        loading.value = false;
        return;
    }

    const result = await handleGoogleCallback(code, state);

    if (!result.success) {
        error.value = result.error || t('auth.oauth.authenticationFailedGeneric');
    } else if (result.isPending) {
        isPending.value = true;
    }

    loading.value = false;
});
</script>
