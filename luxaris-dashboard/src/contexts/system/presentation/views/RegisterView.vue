<template>
    <AuthLayout>
        <v-card elevation="0" class="mx-auto auth-card" max-width="500">
            <v-card-title class="text-h4 font-weight-bold pa-6 text-center">
                <div class="d-flex align-center justify-center">
                    <span>{{ $t('app.title') }}</span>
                </div>
                <div class="text-subtitle-1 font-weight-regular mt-2" style="color: #A3A3A3;">
                    {{ $t('app.createYourAccount') }}
                </div>
            </v-card-title>

            <RegisterForm
                ref="registerFormRef"
                @attempt-register="handleRegister"
                @google-register="handleGoogleRegister"
            />
        </v-card>

        <!-- Success Modal (First User - Auto-approved) -->
        <ConfirmationModal
            v-model="showSuccessDialog"
            :title="$t('auth.register.successTitle')"
            icon="mdi-check-circle"
            icon-color="success"
            :confirm-text="$t('auth.register.understand')"
            @confirm="handleSuccessOk"
        >
            {{ $t('auth.register.successMessage') }}
        </ConfirmationModal>

        <!-- Pending Approval Modal -->
        <ConfirmationModal
            v-model="showPendingDialog"
            :title="$t('auth.register.pendingTitle')"
            icon="mdi-clock-alert-outline"
            icon-color="warning"
            :confirm-text="$t('auth.register.understand')"
            @confirm="handlePendingOk"
        >
            <div v-html="$t('auth.register.pendingMessage')"></div>
        </ConfirmationModal>
    </AuthLayout>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuth } from '../../application/composables/useAuth';
import AuthLayout from '@/layouts/AuthLayout.vue';
import RegisterForm from '../components/RegisterForm.vue';
import ConfirmationModal from '@/shared/components/ConfirmationModal.vue';

const { register: registerUser, loginWithGoogle } = useAuth();
const router = useRouter();

const registerFormRef = ref(null);
const showSuccessDialog = ref(false);
const showPendingDialog = ref(false);
const registrationTokens = ref(null);

const handleRegister = async (userData) => {
    registerFormRef.value?.setLoading(true);
  
    try {
        const result = await registerUser(userData);

        if (result.success) {
            if (result.isPending) {
                showPendingDialog.value = true;
            } else {
                // First user - auto-approved, store tokens and show success modal
                registrationTokens.value = result.tokens;
                showSuccessDialog.value = true;
            }
        } else {
            registerFormRef.value?.setError(result.error || 'Registration failed');
        }
    } catch (error) {
        console.error('Handle register error:', error);
        registerFormRef.value?.setError('An unexpected error occurred');
    } finally {
        registerFormRef.value?.setLoading(false);
    }
};

const handlePendingOk = () => {
    showPendingDialog.value = false;
    router.push('/login?message=pending');
};

const handleSuccessOk = async () => {
    showSuccessDialog.value = false;
  
    // Complete the registration by setting tokens
    const { completeRegistration } = useAuth();
    await completeRegistration(registrationTokens.value);
  
    router.push('/dashboard');
};

const handleGoogleRegister = async () => {
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


