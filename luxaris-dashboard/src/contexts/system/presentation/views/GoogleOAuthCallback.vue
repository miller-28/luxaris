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
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { TokenManager } from '@/contexts/system/application/tokenManager';
import { useAuthStore } from '@/contexts/system/infrastructure/store/authStore';
import AuthLayout from '@/layouts/AuthLayout.vue';

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const authStore = useAuthStore();

const loading = ref(true);
const error = ref(null);
const isPending = ref(false);

onMounted(async () => {
    // Check if we have direct tokens from the API (OAuth already processed server-side)
    const token = route.query.token;
    const refreshToken = route.query.refresh_token;
    const success = route.query.success;
    const errorParam = route.query.error;

    console.log('[OAuth Callback] Parameters received:', {
        hasToken: !!token,
        hasRefreshToken: !!refreshToken,
        success,
        error: errorParam
    });

    // Handle error from API
    if (success === 'false' || errorParam) {
        error.value = errorParam || t('auth.oauth.authenticationFailedGeneric');
        loading.value = false;
        return;
    }

    // Validate we have the required tokens
    if (!token || !refreshToken) {
        error.value = t('auth.oauth.invalidOAuthParameters');
        loading.value = false;
        return;
    }

    // Store tokens and load user
    try {
        TokenManager.setToken(token);
        TokenManager.setRefreshToken(refreshToken);
        
        // Update authStore state with tokens
        authStore.token = token;
        authStore.refreshToken = refreshToken;
        
        console.log('[OAuth Callback] Tokens stored, loading user with permissions...');
        
        // Load user data including permissions before redirecting
        await authStore.loadUser();
        
        console.log('[OAuth Callback] User loaded successfully:', {
            userName: authStore.currentUser?.name,
            userEmail: authStore.currentUser?.email,
            hasPermissions: authStore.currentUser?.permissions?.length > 0,
            permissionsCount: authStore.currentUser?.permissions?.length,
            roles: authStore.currentUser?.roles?.map(r => r.name).join(', '),
            isAdmin: authStore.currentUser?.is_root
        });
        
        // Ensure permissions are fully loaded before navigating
        if (!authStore.currentUser?.permissions || authStore.currentUser.permissions.length === 0) {
            console.warn('[OAuth Callback] No permissions loaded, this may cause menu issues');
        }
        
        // Wait a moment for UI to update, then redirect
        loading.value = false;
        await new Promise(resolve => setTimeout(resolve, 800));
        
        console.log('[OAuth Callback] Redirecting to dashboard with user:', {
            hasUser: !!authStore.currentUser,
            permissions: authStore.currentUser?.permissions?.length
        });
        
        // Use replace instead of push to avoid back button issues
        await router.replace('/dashboard');
    } catch (err) {
        console.error('[OAuth Callback] Error loading user:', err);
        error.value = err.message || t('auth.oauth.authenticationFailedGeneric');
        loading.value = false;
    }
});
</script>
