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
import { SessionManager } from '@/core/sessionManager';
import { useAuthStore } from '@/contexts/system/infrastructure/store/authStore';
import { usePresetStore } from '@/contexts/system/infrastructure/store/presetStore';
import AuthLayout from '@/layouts/AuthLayout.vue';

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const authStore = useAuthStore();
const presetStore = usePresetStore();

const loading = ref(true);
const error = ref(null);
const isPending = ref(false);

onMounted(async () => {
    // Check if we have session_id from the API (OAuth already processed server-side)
    const sessionId = route.query.session_id;
    const success = route.query.success;
    const errorParam = route.query.error;

    console.log('[OAuth Callback] Parameters received:', {
        hasSessionId: !!sessionId,
        success,
        error: errorParam
    });

    // Handle error from API
    if (success === 'false' || errorParam) {
        error.value = errorParam || t('auth.oauth.authenticationFailedGeneric');
        loading.value = false;
        return;
    }

    // Validate we have the required session ID
    if (!sessionId) {
        error.value = t('auth.oauth.invalidOAuthParameters');
        loading.value = false;
        return;
    }

    // Store session ID and load user
    try {
        SessionManager.setSessionId(sessionId);
        console.log('[OAuth Callback] Session ID stored, loading user with permissions...');
        
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
        
        // Load preset data for UI settings (required for menu display)
        if (authStore.currentUser?.id) {
            console.log('[OAuth Callback] Loading user preset...');
            try {
                await presetStore.loadPreset(authStore.currentUser.id);
                console.log('[OAuth Callback] Preset loaded successfully, preset state:', {
                    loaded: presetStore.isLoaded,
                    loading: presetStore.isLoading,
                    presetId: presetStore.presetId
                });
            } catch (presetError) {
                console.error('[OAuth Callback] Failed to load preset:', presetError);
                // Continue anyway - preset is not critical for initial login
            }
        }
        
        // Ensure permissions are fully loaded before navigating
        if (!authStore.currentUser?.permissions || authStore.currentUser.permissions.length === 0) {
            console.warn('[OAuth Callback] No permissions loaded, this may cause menu issues');
        }
        
        // Set loading to false to show success message
        loading.value = false;
        
        // Small delay to show success message, then do a full page reload
        // This ensures all stores are properly initialized
        await new Promise(resolve => setTimeout(resolve, 800));
        
        console.log('[OAuth Callback] Performing full page reload to ensure all stores are initialized');
        
        // Use window.location to do a full page reload to /dashboard
        // This ensures all stores are properly initialized on fresh page load
        window.location.href = '/dashboard';
    } catch (err) {
        console.error('[OAuth Callback] Error loading user:', err);
        error.value = err.message || t('auth.oauth.authenticationFailedGeneric');
        loading.value = false;
    }
});
</script>
