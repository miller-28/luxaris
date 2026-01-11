<template class="">
    <v-card class="ml-4 mt-4 mr-4 abstract-page-header">
        <v-card-text class="d-flex align-center justify-space-between flex-wrap pa-2">
            <div class="header-title">
                <slot name="title">
                    <h1 class="text-h4 text-md-h4 text-h5 mb-1 mb-md-0">{{ title }}</h1>
                    <p v-if="subtitle" class="text-body-2 text-medium-emphasis mb-0">{{ subtitle }}</p>
                </slot>
            </div>
            <div class="header-actions">
                <slot name="actions" :actions="actions">
                    <v-btn
                        v-for="action in actions"
                        :key="action.key || action.label"
                        :color="action.color || 'primary'"
                        :variant="action.variant || 'flat'"
                        :size="action.size || 'default'"
                        :prepend-icon="action.icon"
                        :disabled="action.disabled"
                        :loading="action.loading"
                        class="header-action-btn"
                        @click="action.onClick && action.onClick()"
                    >
                        {{ action.label }}
                    </v-btn>
                </slot>
            </div>
        </v-card-text>
    </v-card>
</template>

<script setup>
const props = defineProps({
    title: {
        type: String,
        required: true
    },
    subtitle: {
        type: String,
        default: ''
    },
    actions: {
        type: Array,
        default: () => []
    }
});
</script>

<style scoped>

    
.abstract-page-header {
  /* width: 100%; */
  flex-shrink: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.header-action-btn {
  min-height: 36px;
}

/* Mobile adjustments */
@media (max-width: 960px) {
  .abstract-page-header {
    position: sticky;
    top: 0px;
    z-index: 100;
    margin-bottom: 0;
  }
  .abstract-page-header :deep(.v-card-text) {
    padding: 12px !important;
  }
  .header-title h1 {
    line-height: 1.2;
  }
}
</style>
