<template>
    <AuthLayout>
        <v-form @submit.prevent="handleLogin">
            <h2 class="text-h5 text-center mb-6">{{ $t('auth.login.title') }}</h2>

            <v-text-field
                v-model="email"
                :label="$t('auth.login.email')"
                type="email"
                prepend-inner-icon="mdi-email"
                variant="outlined"
                required
                class="mb-4"
            ></v-text-field>

            <v-text-field
                v-model="password"
                :label="$t('auth.login.password')"
                :type="showPassword ? 'text' : 'password'"
                prepend-inner-icon="mdi-lock"
                :append-inner-icon="showPassword ? 'mdi-eye' : 'mdi-eye-off'"
                @click:append-inner="showPassword = !showPassword"
                variant="outlined"
                required
                class="mb-4"
            ></v-text-field>

            <v-btn
                type="submit"
                color="primary"
                block
                size="large"
                :loading="isLoading"
                class="mb-4"
            >
                {{ $t('auth.login.submit') }}
            </v-btn>

            <div class="text-center">
                <span class="text-body-2">{{ $t('auth.login.noAccount') }}</span>
                <router-link to="/register" class="text-primary font-weight-medium ml-1">
                    {{ $t('auth.register.title') }}
                </router-link>
            </div>
        </v-form>
    </AuthLayout>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import AuthLayout from '@/layouts/AuthLayout.vue';
import httpClient from '@/core/http/client';
import * as TokenManager from '@/core/auth/tokenManager';

const router = useRouter();
const email = ref('');
const password = ref('');
const showPassword = ref(false);
const isLoading = ref(false);

const handleLogin = async () => {
    isLoading.value = true;
    try {
        const response = await httpClient.post('/auth/login', {
            email: email.value,
            password: password.value,
        });

        const { token, refresh_token } = response.data;
        TokenManager.setTokens(token, refresh_token);
    
        router.push('/dashboard');
    } catch (error) {
        console.error('Login failed:', error);
    // TODO: Show error toast
    } finally {
        isLoading.value = false;
    }
};
</script>
