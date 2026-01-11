<template>
    <v-dialog 
        :model-value="modelValue"
        @update:model-value="handleDialogChange"
        max-width="500"
        persistent
    >
        <v-card>
            <v-card-title class="text-h5 d-flex align-center justify-space-between">
                <span>{{ title }}</span>
                <v-btn
                    icon="mdi-close"
                    variant="text"
                    size="small"
                    @click="handleCancel"
                    :disabled="loading"
                />
            </v-card-title>
            
            <v-card-text class="pt-4">
                <slot>
                    <div v-html="message"></div>
                </slot>
            </v-card-text>
            
            <v-card-actions class="pa-4">
                <v-spacer />
                <v-btn 
                    color="grey" 
                    variant="text"
                    @click="handleCancel"
                    :disabled="loading"
                >
                    {{ cancelText }}
                </v-btn>
                <v-btn 
                    :color="confirmColor"
                    variant="flat"
                    @click="handleConfirm"
                    :loading="loading"
                >
                    {{ confirmText }}
                </v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({
    modelValue: {
        type: Boolean,
        required: true
    },
    title: {
        type: String,
        default: 'Confirm Delete'
    },
    message: {
        type: String,
        default: 'Are you sure you want to delete this item? This action cannot be undone.'
    },
    confirmText: {
        type: String,
        default: 'Delete'
    },
    cancelText: {
        type: String,
        default: 'Cancel'
    },
    confirmColor: {
        type: String,
        default: 'error'
    }
});

const emit = defineEmits(['update:modelValue', 'confirm', 'cancel']);

const loading = ref(false);

const handleDialogChange = (value) => {
    if (!loading.value) {
        emit('update:modelValue', value);
    }
};

const handleConfirm = async () => {
    loading.value = true;
    try {
        await emit('confirm');
    } finally {
        loading.value = false;
        emit('update:modelValue', false);
    }
};

const handleCancel = () => {
    if (!loading.value) {
        emit('update:modelValue', false);
        emit('cancel');
    }
};
</script>
