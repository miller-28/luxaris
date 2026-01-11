<template>
    <AbstractEditPanel
        :title="isEditMode ? $t('templates.editTemplate') : $t('templates.createTemplate')"
        :loading="loading"
        @close="$emit('close')"
        @submit="handleSubmit"
    >
        <template #content>
            <v-form ref="formRef" @submit.prevent="handleSubmit">
                <!-- Basic Information Section -->
                <v-card variant="outlined" class="mb-4">
                    <v-card-title class="text-subtitle-1">
                        {{ $t('templates.sections.basicInfo') }}
                    </v-card-title>
                    <v-card-text>
                        <v-row>
                            <v-col cols="12">
                                <v-text-field
                                    v-model="formData.name"
                                    :label="$t('templates.fields.name')"
                                    :rules="[rules.required, rules.maxLength(200)]"
                                    :error-messages="getFieldError('name')"
                                    counter="200"
                                    variant="outlined"
                                    density="compact"
                                />
                            </v-col>
                            <v-col cols="12">
                                <v-textarea
                                    v-model="formData.description"
                                    :label="$t('templates.fields.description')"
                                    :rules="[rules.maxLength(500)]"
                                    :error-messages="getFieldError('description')"
                                    counter="500"
                                    variant="outlined"
                                    density="compact"
                                    rows="3"
                                />
                            </v-col>
                        </v-row>
                    </v-card-text>
                </v-card>

                <!-- Template Body Section -->
                <v-card variant="outlined" class="mb-4">
                    <v-card-title class="text-subtitle-1">
                        {{ $t('templates.sections.templateBody') }}
                    </v-card-title>
                    <v-card-text>
                        <v-textarea
                            v-model="formData.template_body"
                            :label="$t('templates.fields.templateBody')"
                            :rules="[rules.required, rules.maxLength(5000)]"
                            :error-messages="getFieldError('template_body')"
                            counter="5000"
                            variant="outlined"
                            density="compact"
                            rows="12"
                            :hint="$t('templates.hints.templateBody')"
                            persistent-hint
                            class="template-textarea"
                        />
                        
                        <!-- Placeholders preview -->
                        <v-alert 
                            v-if="detectedPlaceholders.length > 0" 
                            type="info"
                            variant="tonal"
                            class="mt-4"
                        >
                            <div class="text-caption font-weight-bold mb-2">
                                {{ $t('templates.placeholdersDetected') }}: {{ detectedPlaceholders.length }}
                            </div>
                            <div class="d-flex flex-wrap ga-2">
                                <v-chip
                                    v-for="placeholder in detectedPlaceholders"
                                    :key="placeholder"
                                    size="small"
                                    variant="outlined"
                                >
                                    {{ formatPlaceholder(placeholder) }}
                                </v-chip>
                            </div>
                        </v-alert>

                        <div class="text-caption text-grey mt-2">
                            {{ $t('templates.stats.characters') }}: {{ characterCount }}
                        </div>
                    </v-card-text>
                </v-card>

                <!-- Advanced Settings Section -->
                <v-card variant="outlined" class="mb-4">
                    <v-card-title class="text-subtitle-1">
                        {{ $t('templates.advancedSettings') }}
                    </v-card-title>
                    <v-card-text>
                        <v-row>
                            <v-col cols="12" md="6">
                                <v-text-field
                                    v-model.number="formData.constraints.max_length"
                                    :label="$t('templates.fields.maxLength')"
                                    type="number"
                                    variant="outlined"
                                    density="compact"
                                    :hint="$t('templates.hints.maxLength')"
                                    persistent-hint
                                />
                            </v-col>
                            <v-col cols="12" md="6">
                                <v-text-field
                                    v-model="formData.constraints.call_to_action"
                                    :label="$t('templates.fields.callToAction')"
                                    variant="outlined"
                                    density="compact"
                                />
                            </v-col>
                            <v-col cols="12" md="6">
                                <v-switch
                                    v-model="formData.constraints.include_emoji"
                                    :label="$t('templates.fields.includeEmoji')"
                                    color="primary"
                                    density="compact"
                                />
                            </v-col>
                            <v-col cols="12" md="6">
                                <v-switch
                                    v-model="formData.constraints.include_hashtags"
                                    :label="$t('templates.fields.includeHashtags')"
                                    color="primary"
                                    density="compact"
                                />
                            </v-col>
                        </v-row>
                    </v-card-text>
                </v-card>
            </v-form>
        </template>

        <template #actions>
            <v-spacer />
            <v-btn 
                variant="text"
                @click="$emit('close')"
                :disabled="loading"
            >
                {{ $t('templates.actions.cancel') }}
            </v-btn>
            <v-btn 
                color="primary"
                @click="handleSubmit"
                :loading="loading"
            >
                {{ isEditMode ? $t('templates.actions.update') : $t('templates.actions.create') }}
            </v-btn>
        </template>
    </AbstractEditPanel>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import AbstractEditPanel from '@/shared/components/AbstractEditPanel.vue';

const { t: $t } = useI18n();

const props = defineProps({
    template: {
        type: Object,
        default: null
    },
    loading: {
        type: Boolean,
        default: false
    },
    error: {
        type: String,
        default: null
    },
    validationErrors: {
        type: Array,
        default: () => []
    }
});

const emit = defineEmits(['submit', 'close', 'clear-error']);

const formRef = ref(null);
const formData = ref({
    name: '',
    description: '',
    template_body: '',
    default_channel_id: null,
    constraints: {
        max_length: null,
        tone: [],
        include_emoji: false,
        include_hashtags: false,
        call_to_action: ''
    }
});

const isEditMode = computed(() => !!props.template);

const characterCount = computed(() => {
    return formData.value.template_body ? formData.value.template_body.length : 0;
});

const detectedPlaceholders = computed(() => {
    if (!formData.value.template_body) return [];
    
    const placeholderRegex = /\{\{(\w+)\}\}/g;
    const placeholders = [];
    let match;
    
    while ((match = placeholderRegex.exec(formData.value.template_body)) !== null) {
        if (!placeholders.includes(match[1])) {
            placeholders.push(match[1]);
        }
    }
    
    return placeholders;
});

const rules = {
    required: (value) => !!value || $t('templates.validation.required'),
    maxLength: (max) => (value) => {
        if (!value) return true;
        return value.length <= max || $t('templates.validation.maxLength', { max });
    }
};

const getFieldError = (field) => {
    const error = props.validationErrors.find(e => e.field === field);
    return error ? [error.message] : [];
};

const formatPlaceholder = (placeholder) => {
    return `{{${placeholder}}}`;
};

const handleSubmit = async () => {
    const { valid } = await formRef.value.validate();
    if (!valid) return;
    
    // Clean up constraints - remove null/empty values
    const cleanConstraints = {};
    if (formData.value.constraints.max_length) {
        cleanConstraints.max_length = formData.value.constraints.max_length;
    }
    if (formData.value.constraints.call_to_action) {
        cleanConstraints.call_to_action = formData.value.constraints.call_to_action;
    }
    cleanConstraints.include_emoji = formData.value.constraints.include_emoji;
    cleanConstraints.include_hashtags = formData.value.constraints.include_hashtags;
    
    emit('submit', {
        ...formData.value,
        constraints: cleanConstraints
    });
};

// Initialize form data when template changes
watch(() => props.template, (newTemplate) => {
    if (newTemplate) {
        formData.value = {
            name: newTemplate.name || '',
            description: newTemplate.description || '',
            template_body: newTemplate.template_body || '',
            default_channel_id: newTemplate.default_channel_id || null,
            constraints: {
                max_length: newTemplate.constraints?.max_length || null,
                tone: newTemplate.constraints?.tone || [],
                include_emoji: newTemplate.constraints?.include_emoji || false,
                include_hashtags: newTemplate.constraints?.include_hashtags || false,
                call_to_action: newTemplate.constraints?.call_to_action || ''
            }
        };
    } else {
        formData.value = {
            name: '',
            description: '',
            template_body: '',
            default_channel_id: null,
            constraints: {
                max_length: null,
                tone: [],
                include_emoji: false,
                include_hashtags: false,
                call_to_action: ''
            }
        };
    }
}, { immediate: true });
</script>

<style scoped>
.template-textarea :deep(textarea) {
    font-family: 'Courier New', monospace;
}
</style>
