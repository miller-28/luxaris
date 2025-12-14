<template>
    <v-app>
        <router-view />
        <v-snackbar
            v-model="snackbar.show"
            :color="snackbar.color"
            :timeout="snackbar.timeout"
        >
            {{ snackbar.message }}
        </v-snackbar>
    </v-app>
</template>

<script setup>
import { reactive } from 'vue';

// Global snackbar state (can be moved to Pinia store later)
const snackbar = reactive({
    show: false,
    message: '',
    color: 'info',
    timeout: 3000,
});
</script>

<style>
  /* Remove yellow background from autofilled inputs */
  input:-webkit-autofill,
  input:-webkit-autofill:hover,
  input:-webkit-autofill:focus,
  input:-webkit-autofill:active {
    -webkit-box-shadow: 0 0 0 30px #1A1A1A inset !important;
    -webkit-text-fill-color: #E5E5E5 !important;
    caret-color: #E5E5E5 !important;
    transition: background-color 5000s ease-in-out 0s;
  }

  /* For fields with borders */
  input:-webkit-autofill {
    border-color: #262626 !important;
  }

  /* Global Vuetify Dialog Positioning and Overlay */
  .v-overlay__scrim {
    opacity: 0.92 !important;
  }

  .v-overlay__content {
    align-self: flex-start !important;
    margin-top: 10vh !important;
  }
</style>
