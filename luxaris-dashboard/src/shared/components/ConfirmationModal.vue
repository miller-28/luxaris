<template>
    <v-dialog 
        :model-value="modelValue" 
        @update:model-value="$emit('update:modelValue', $event)"
        max-width="600" 
        :persistent="persistent" 
        scrim="rgba(0, 0, 0, 0.92)"
    >
        <v-card style="background: #1A1A1A; border: 1px solid #262626;">
            <v-card-title class="text-h5 pa-6">
                <v-icon v-if="icon" :color="iconColor" size="32" class="mr-2">{{ icon }}</v-icon>
                {{ title }}
            </v-card-title>
            <v-card-text class="pa-6" style="color: #A3A3A3;">
                <slot>
                    <div v-html="content"></div>
                </slot>
            </v-card-text>
            <v-card-actions class="pa-6 pt-0 d-flex justify-center">
                <v-btn 
                    v-if="cancelText"
                    class="mb-4 mr-2" 
                    color="secondary" 
                    variant="outlined" 
                    size="large" 
                    :width="buttonWidth"
                    @click="handleCancel"
                >
                    {{ cancelText }}
                </v-btn>
                <v-btn 
                    class="mb-4" 
                    :color="confirmColor" 
                    variant="elevated" 
                    size="large" 
                    :width="buttonWidth"
                    @click="handleConfirm"
                >
                    {{ confirmText }}
                </v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script setup>
defineProps({
    modelValue: {
        type: Boolean,
        required: true
    },
    title: {
        type: String,
        required: true
    },
    content: {
        type: String,
        default: ''
    },
    icon: {
        type: String,
        default: ''
    },
    iconColor: {
        type: String,
        default: 'primary'
    },
    confirmText: {
        type: String,
        default: 'Confirm'
    },
    confirmColor: {
        type: String,
        default: 'primary'
    },
    cancelText: {
        type: String,
        default: ''
    },
    persistent: {
        type: Boolean,
        default: true
    },
    buttonWidth: {
        type: [String, Number],
        default: 200
    }
});

const emit = defineEmits(['update:modelValue', 'confirm', 'cancel']);

const handleConfirm = () => {
    emit('confirm');
};

const handleCancel = () => {
    emit('cancel');
};
</script>
