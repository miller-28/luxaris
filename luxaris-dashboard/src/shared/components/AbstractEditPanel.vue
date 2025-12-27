<template>
    <v-card>
        <v-card-title class="d-flex align-center">
            <slot name="title">
                <span>{{ title }}</span>
            </slot>
            <v-spacer />
            <v-btn 
                icon="mdi-close" 
                variant="text"
                @click="$emit('close')"
            />
        </v-card-title>
        
        <v-card-text>
            <slot name="content">
                <!-- Content goes here -->
            </slot>
        </v-card-text>

        <v-card-actions v-if="!hideActions">
            <slot name="actions">
                <v-spacer />
                <v-btn 
                    variant="text"
                    @click="$emit('close')"
                    :disabled="loading"
                >
                    {{ cancelText || $t('common.cancel') }}
                </v-btn>
                <v-btn 
                    :color="submitColor"
                    @click="$emit('submit')"
                    :loading="loading"
                    :disabled="disabled"
                >
                    {{ submitText || $t('common.save') }}
                </v-btn>
            </slot>
        </v-card-actions>
    </v-card>
</template>

<script setup>
import { useI18n } from 'vue-i18n';

const { t: $t } = useI18n();

defineProps({
    title: {
        type: String,
        default: ''
    },
    loading: {
        type: Boolean,
        default: false
    },
    disabled: {
        type: Boolean,
        default: false
    },
    hideActions: {
        type: Boolean,
        default: false
    },
    submitText: {
        type: String,
        default: null
    },
    cancelText: {
        type: String,
        default: null
    },
    submitColor: {
        type: String,
        default: 'primary'
    }
});

defineEmits(['close', 'submit']);
</script>

<style scoped>
.v-card {
    max-height: 90vh;
    overflow-y: auto;
}
</style>
