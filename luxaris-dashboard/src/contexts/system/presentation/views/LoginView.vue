<template>
  <AuthLayout>
    <v-card elevation="0" class="mx-auto auth-card" max-width="500">
      <v-card-title class="text-h4 font-weight-bold pa-6 text-center">
        <div class="d-flex align-center justify-center">
          <span>{{ $t('app.title') }}</span>
        </div>
        <div class="text-subtitle-1 font-weight-regular mt-2" style="color: #A3A3A3;">
          {{ $t('app.signInToYourAccount') }}
        </div>
      </v-card-title>

      <!-- Pending Approval Message -->
      <v-alert
        v-if="showPendingMessage"
        type="info"
        variant="tonal"
        class="mx-6 mb-0"
        closable
        @click:close="showPendingMessage = false"
      >
        {{ $t('auth.login.pendingApproval') }}
      </v-alert>

      <!-- OAuth Error Message -->
      <v-alert
        v-if="showOAuthError"
        type="error"
        variant="tonal"
        class="mx-6 mb-0"
        closable
        @click:close="showOAuthError = false"
      >
        {{ $t('auth.login.oauthError') }}
      </v-alert>

      <LoginForm
        ref="loginFormRef"
        @submit="handleLogin"
        @google-login="handleGoogleLogin"
      />
    </v-card>
  </AuthLayout>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useAuth } from '../../application/composables/useAuth';
import AuthLayout from '@/layouts/AuthLayout.vue';
import LoginForm from '../components/LoginForm.vue';

const route = useRoute();
const { login, loginWithGoogle } = useAuth();

const loginFormRef = ref(null);
const showPendingMessage = ref(false);
const showOAuthError = ref(false);

onMounted(() => {
  // Check for query parameters
  if (route.query.message === 'pending') {
    showPendingMessage.value = true;
  }
  if (route.query.error === 'oauth_failed') {
    showOAuthError.value = true;
  }
});

const handleLogin = async (credentials) => {
  loginFormRef.value?.setLoading(true);
  
  const result = await login(credentials.email, credentials.password);
  
  if (!result.success) {
    loginFormRef.value?.setError(result.error || 'Login failed');
  }
  
  loginFormRef.value?.setLoading(false);
};

const handleGoogleLogin = async () => {
  await loginWithGoogle();
};
</script>

<style scoped>
.auth-card {
  background: #1A1A1A;
  border: 1px solid #262626;
  border-radius: 12px;
}
</style>
