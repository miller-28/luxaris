<template>
    <v-form @submit.prevent="handleSubmit" ref="formRef">
        <v-card-text>
            <!-- Name Field -->
            <v-text-field
                v-model="form.name"
                :label="$t('auth.register.name')"
                variant="outlined"
                prepend-inner-icon="mdi-account"
                :error="!!errors.name"
                :disabled="loading"
                autofocus
                required
                @input="handleNameInput"
                @blur="validateName"
            />
            <div class="text-caption mb-4" :style="{ color: errors.name ? '#EF4444' : '#71717A', marginTop: '-16px' }">
                {{ errors.name || $t('auth.register.nameHint') }}
            </div>

            <!-- Email Field -->
            <v-text-field
                v-model="form.email"
                :label="$t('auth.register.email')"
                type="email"
                variant="outlined"
                prepend-inner-icon="mdi-email"
                :error="!!errors.email"
                :disabled="loading"
                required
                @input="handleEmailInput"
                @blur="validateEmail"
            />
            <div class="text-caption mb-4" :style="{ color: errors.email ? '#EF4444' : '#71717A', marginTop: '-16px' }">
                {{ errors.email || $t('auth.register.emailHint') }}
            </div>

            <!-- Password Field -->
            <v-text-field
                v-model="form.password"
                :label="$t('auth.register.password')"
                :type="showPassword ? 'text' : 'password'"
                variant="outlined"
                prepend-inner-icon="mdi-lock"
                :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
                :error="!!errors.password"
                :disabled="loading"
                required
                @click:append-inner="showPassword = !showPassword"
                @input="handlePasswordInput"
                @blur="validatePassword"
            />
            <div class="text-caption mb-4" :style="{ color: errors.password ? '#EF4444' : '#71717A', marginTop: '-16px' }">
                {{ errors.password || $t('auth.register.passwordHint') }}
            </div>

            <!-- Confirm Password Field -->
            <v-text-field
                v-model="form.passwordConfirm"
                :label="$t('auth.register.confirmPassword')"
                :type="showPasswordConfirm ? 'text' : 'password'"
                variant="outlined"
                prepend-inner-icon="mdi-lock-check"
                :append-inner-icon="showPasswordConfirm ? 'mdi-eye-off' : 'mdi-eye'"
                :error="!!errors.passwordConfirm"
                :disabled="loading"
                required
                @click:append-inner="showPasswordConfirm = !showPasswordConfirm"
                @input="handlePasswordConfirmInput"
                @blur="validatePasswordConfirm"
            />
            <div class="text-caption mb-4" :style="{ color: errors.passwordConfirm ? '#EF4444' : '#71717A', marginTop: '-16px' }">
                {{ errors.passwordConfirm || $t('auth.register.confirmPasswordHint') }}
            </div>

            <!-- Submit Button -->
            <div class="d-flex justify-center">
                <v-btn
                    type="submit"
                    color="primary"
                    size="large"
                    :loading="loading"
                    :disabled="!isFormValid"
                    width="200"
                >
                    {{ $t('auth.register.submit') }}
                </v-btn>
            </div>
      
            <!-- Error Alert - Reserved Space -->
            <div class="mt-4" style="min-height: 48px;">
                <v-alert
                    v-if="errorMessage"
                    type="error"
                    variant="tonal"
                    density="compact"
                    closable
                    @click:close="errorMessage = ''"
                >
                    {{ errorMessage }}
                </v-alert>
            </div>

            <!-- Divider -->
            <v-divider class="my-6">
                <template #default>{{ $t('auth.register.or') }}</template>
            </v-divider>

            <!-- Google Register -->
            <v-btn
                variant="outlined"
                size="large"
                block
                :disabled="loading"
                @click="handleGoogleRegister"
            >
                <v-icon start>mdi-google</v-icon>
                {{ $t('auth.register.continueWithGoogle') }}
            </v-btn>

            <!-- Login Button -->
            <router-link to="/login" class="text-decoration-none">
                <v-btn
                    variant="outlined"
                    size="large"
                    block
                    color="white"
                    :disabled="loading"
                    class="mt-3"
                >
                    <v-icon start>mdi-login</v-icon>
                    {{ $t('auth.register.orLogin') }}
                </v-btn>
            </router-link>
        </v-card-text>
    </v-form>
</template>

<script setup>

import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { 
    PasswordConfirmationSchema,
    NameSchema,
    EmailSchema,
    PasswordSchema,
    validateField
} from '../../domain/validations/userSchemas';

const { t } = useI18n();

const emit = defineEmits(['attemptRegister', 'googleRegister']);

const form = ref({
    name: '',
    email: '',
    password: '',
    passwordConfirm: '',
});
const errors = ref({
    name: '',
    email: '',
    password: '',
    passwordConfirm: '',
});
const showPassword = ref(false);
const showPasswordConfirm = ref(false);
const loading = ref(false);
const errorMessage = ref('');
const touched = ref({
    name: false,
    email: false,
    password: false,
    passwordConfirm: false,
});

const isFormValid = computed(() => {
    // Check all fields have values
    if (!form.value.name || !form.value.email || !form.value.password || !form.value.passwordConfirm) {
        return false;
    }
    // Check no validation errors
    return !errors.value.name && !errors.value.email && !errors.value.password && !errors.value.passwordConfirm;
});

// Name validation ->

const handleNameInput = () => {
    touched.value.name = true;
    validateName();
};

const validateName = () => {
    if (!touched.value.name) {
        return;
    }
  
    errors.value.name = validateField(
        NameSchema,
        form.value.name,
        t,
        'auth.validation.nameRequired',
        'auth.validation.invalidName'
    );
};

// Email validation -> 

const handleEmailInput = () => {
    touched.value.email = true;
    validateEmail();
};

const validateEmail = () => {
    if (!touched.value.email) {
        return;
    }
  
    errors.value.email = validateField(
        EmailSchema,
        form.value.email,
        t,
        'auth.validation.emailRequired',
        'auth.validation.invalidEmail'
    );
};

// Password validation -> 

const handlePasswordInput = () => {
    touched.value.password = true;
    validatePassword();
};

const validatePassword = () => {
    if (!touched.value.password) {
        return;
    }
  
    errors.value.password = validateField(
        PasswordSchema,
        form.value.password,
        t,
        'auth.validation.passwordRequired',
        'auth.validation.invalidPassword'
    );
};

// Password confirmation validation -> 

const handlePasswordConfirmInput = () => {
    touched.value.passwordConfirm = true;
    validatePasswordConfirm();
};

const validatePasswordConfirm = () => {
    if (!touched.value.passwordConfirm) {
        return;
    }
  
    errors.value.passwordConfirm = validateField(
        PasswordConfirmationSchema,
        {
            password: form.value.password,
            passwordConfirm: form.value.passwordConfirm
        },
        t,
        'auth.validation.passwordConfirmRequired',
        'auth.validation.passwordsDoNotMatch'
    );
};

// Form submission -> 

const handleSubmit = async () => {
    // Mark all fields as touched on submit
    touched.value.name = true;
    touched.value.email = true;
    touched.value.password = true;
    touched.value.passwordConfirm = true;
  
    validateName();
    validateEmail();
    validatePassword();
    validatePasswordConfirm();

    if (!isFormValid.value) {
        return;
    }

    loading.value = true;
    errorMessage.value = '';

    emit('attemptRegister', {
        name: form.value.name,
        email: form.value.email,
        password: form.value.password,
    });
};

const handleGoogleRegister = () => {
    emit('googleRegister');
};

defineExpose({
    setLoading: (value) => {
        loading.value = value; 
    },
    setError: (message) => {
        errorMessage.value = message; 
    },
});

</script>
