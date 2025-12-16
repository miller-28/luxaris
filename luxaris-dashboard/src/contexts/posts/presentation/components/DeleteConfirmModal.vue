<template>
    <v-dialog v-model="internalDialog" max-width="500">
        <v-card>
            <v-card-title class="text-h5">
                {{ title }}
            </v-card-title>
            
            <v-card-text>
                {{ message }}
            </v-card-text>
            
            <v-card-actions>
                <v-spacer />
                <v-btn 
                    color="grey" 
                    variant="text"
                    @click="handleCancel"
                    :disabled="loading"
                >
                    Cancel
                </v-btn>
                <v-btn 
                    color="error" 
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
import { computed, ref } from 'vue';

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
    }
});

const emit = defineEmits(['update:modelValue', 'confirm', 'cancel']);

const loading = ref(false);

const internalDialog = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value)
});

const handleConfirm = async () => {
    loading.value = true;
    await emit('confirm');
    loading.value = false;
    internalDialog.value = false;
};

const handleCancel = () => {
    emit('cancel');
    internalDialog.value = false;
};
</script>
