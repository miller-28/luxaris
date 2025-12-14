<template>
  <v-form @submit.prevent="handleSubmit" ref="formRef">
    <v-card-text>
      <!-- Email Field -->
      <v-text-field
        v-model="form.email"
        :label="$t('auth.login.email')"
        type="email"
        variant="outlined"
        prepend-inner-icon="mdi-email"
        :error-messages="errors.email"
        :disabled="loading"
        autofocus
        required
        @input="validateEmail"
        @blur="validateEmail"
      />
      <div class="text-caption mb-4" style="color: #71717A; margin-top: -16px;">
        {{ $t('auth.login.emailHint') }}
      </div>

      <!-- Password Field -->
      <v-text-field
        v-model="form.password"
        :label="$t('auth.login.password')"
        :type="showPassword ? 'text' : 'password'"
        variant="outlined"
        prepend-inner-icon="mdi-lock"
        :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
        :error-messages="errors.password"
        :disabled="loading"
        required
        @click:append-inner="showPassword = !showPassword"
        @input="validatePassword"
        @blur="validatePassword"
      />
      <div class="text-caption mb-4" style="color: #71717A; margin-top: -16px;">
        {{ $t('auth.login.passwordHint') }}
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
          {{ $t('auth.login.submit') }}
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
        <template #default>{{ $t('auth.login.or') }}</template>
      </v-divider>

      <!-- Google Login -->
      <v-btn
        variant="outlined"
        size="large"
        block
        :disabled="loading"
        @click="handleGoogleLogin"
      >
        <v-icon start>mdi-google</v-icon>
        {{ $t('auth.login.continueWithGoogle') }}
      </v-btn>

      <!-- Register Button -->
      <router-link to="/register" class="text-decoration-none">
        <v-btn
          variant="outlined"
          size="large"
          block
          color="white"
          :disabled="loading"
          class="mt-3"
        >
          <v-icon start>mdi-account-plus</v-icon>
          {{ $t('auth.login.orRegister') }}
        </v-btn>
      </router-link>
    </v-card-text>
  </v-form>
</template>

<script setup>
import { ref, computed } from 'vue';
import { UserLoginSchema, getZodErrorMessages } from '../../domain/rules/userSchemas';

const emit = defineEmits(['submit', 'googleLogin']);

const formRef = ref(null);
const form = ref({
  email: '',
  password: '',
});
const errors = ref({
  email: '',
  password: '',
});
const showPassword = ref(false);
const loading = ref(false);
const errorMessage = ref('');

const isFormValid = computed(() => {
  // Check all fields have values
  if (!form.value.email || !form.value.password) return false;
  
  // Check no validation errors from Zod
  if (errors.value.email || errors.value.password) return false;
  
  // Validate with Zod schema to ensure data is valid
  try {
    UserLoginSchema.parse(form.value);
    return true;
  } catch {
    return false;
  }
});

const validateEmail = () => {
  if (!form.value.email) {
    errors.value.email = '';
    return;
  }
  
  try {
    UserLoginSchema.pick({ email: true }).parse({ email: form.value.email });
    errors.value.email = '';
  } catch (error) {
    const fieldErrors = getZodErrorMessages(error);
    errors.value.email = fieldErrors.email || '';
  }
};

const validatePassword = () => {
  if (!form.value.password) {
    errors.value.password = '';
    return;
  }
  
  try {
    UserLoginSchema.pick({ password: true }).parse({ password: form.value.password });
    errors.value.password = '';
  } catch (error) {
    const fieldErrors = getZodErrorMessages(error);
    errors.value.password = fieldErrors.password || '';
  }
};

const handleSubmit = async () => {
  validateEmail();
  validatePassword();

  if (!isFormValid.value) {
    return;
  }

  loading.value = true;
  errorMessage.value = '';

  emit('submit', form.value);
};

const handleGoogleLogin = () => {
  emit('googleLogin');
};

defineExpose({
  setLoading: (value) => { loading.value = value; },
  setError: (message) => { errorMessage.value = message; },
});
</script>
