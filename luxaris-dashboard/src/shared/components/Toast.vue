<template>
    <!-- Vue3-toastify container is automatically handled by the library -->
</template>

<script setup>
// This component is now a placeholder as vue3-toastify handles rendering automatically
// You can remove this file if not referenced elsewhere, or keep it for future customization
</script>

<style>
/* Global toast customization */
:root {
  --toastify-color-dark: #1e1e1e;
  --toastify-text-color-dark: #ffffff;
  --toastify-color-success: #4caf50;
  --toastify-color-error: #f44336;
  --toastify-color-warning: #ff9800;
  --toastify-color-info: #2196f3;
}

.Toastify__toast-container {
  z-index: 9999 !important;
}

.Toastify__toast {
  border-radius: 8px !important;
  font-family: inherit !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4) !important;
}

.Toastify__toast-icon {
  width: 24px !important;
}

.Toastify__progress-bar {
  height: 4px !important;
}
</style>
