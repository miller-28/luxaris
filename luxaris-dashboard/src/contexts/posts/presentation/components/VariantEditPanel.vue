<template>
    <v-card>
        <v-card-title class="d-flex align-center">
            <span>{{ isEditMode ? $t('posts.variants.editVariant') : $t('posts.variants.createVariant') }}</span>
            <v-spacer />
            <v-btn 
                icon="mdi-close" 
                variant="text"
                @click="$emit('close')"
            />
        </v-card-title>
        
        <v-card-text>
            <v-form ref="formRef" @submit.prevent="handleSubmit">
                <v-autocomplete
                    v-model="formData.channel_id"
                    :label="$t('posts.variants.fields.channel')"
                    :items="channels"
                    item-title="name"
                    item-value="id"
                    :rules="[rules.required]"
                    :error-messages="getFieldError('channel_id')"
                    variant="outlined"
                    class="mb-4"
                    :disabled="isEditMode"
                    clearable
                    auto-select-first
                />
                
                <v-textarea
                    v-model="formData.content"
                    :label="$t('posts.variants.fields.content')"
                    :rules="[rules.required, rules.maxLength(5000)]"
                    :error-messages="getFieldError('content')"
                    counter="5000"
                    variant="outlined"
                    rows="8"
                    class="mb-4"
                />
                
                <v-combobox
                    v-model="formData.media_urls"
                    :label="$t('posts.variants.fields.mediaUrls')"
                    multiple
                    chips
                    closable-chips
                    :rules="[rules.maxMedia]"
                    :error-messages="getFieldError('media_urls')"
                    variant="outlined"
                    class="mb-4"
                    :hint="$t('posts.variants.hints.mediaUrls')"
                />
                
                <!-- Error alert hidden - errors shown via toast in parent component -->
                <v-alert 
                    v-if="false && error" 
                    type="error" 
                    variant="tonal"
                    closable
                    @click:close="clearError"
                    class="mb-4"
                >
                    {{ error }}
                </v-alert>
                
                <v-divider class="mb-4" />
                
                <div class="d-flex justify-space-between align-center">
                    <div class="text-caption text-grey">
                        <div v-if="stats">
                            {{ $t('posts.stats.words') }}: {{ stats.word_count }} | 
                            {{ $t('posts.stats.characters') }}: {{ stats.character_count }} | 
                            {{ $t('posts.variants.stats.mediaUrls') }}: {{ stats.media_count }}
                        </div>
                    </div>
                    
                    <div class="d-flex gap-2">
                        <v-btn 
                            variant="text"
                            @click="$emit('close')"
                            :disabled="loading"
                        >
                            {{ $t('posts.actions.cancel') }}
                        </v-btn>
                        <v-btn 
                            color="primary"
                            type="submit"
                            :loading="loading"
                        >
                            {{ isEditMode ? $t('posts.actions.update') : $t('posts.actions.create') }}
                        </v-btn>
                    </div>
                </div>
            </v-form>
        </v-card-text>
    </v-card>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { usePostVariants } from '../../application/composables/usePostVariants';

const { t: $t } = useI18n();

const props = defineProps({
    variant: {
        type: Object,
        default: null
    },
    channels: {
        type: Array,
        default: () => []
    },
    loading: {
        type: Boolean,
        default: false
    },
    validationErrors: {
        type: Array,
        default: () => []
    }
});

const emit = defineEmits(['submit', 'close', 'clear-error']);

// Get error from the variants store
const { error, clearError } = usePostVariants();

const formRef = ref(null);
const formData = ref({
    channel_id: null,
    content: '',
    media_urls: []
});

const isEditMode = computed(() => !!props.variant);

const rules = {
    required: (value) => !!value || $t('posts.validation.required'),
    maxLength: (max) => (value) => {
        if (!value) {
            return true;
        }
        return value.length <= max || $t('posts.validation.maxLength', { max });
    },
    maxMedia: (value) => {
        if (!value || !Array.isArray(value)) {
            return true;
        }
        return value.length <= 10 || $t('posts.variants.validation.maxMedia');
    }
};

const stats = computed(() => {
    const content = formData.value.content || '';
    
    return {
        word_count: content.split(/\s+/).filter(w => w.length > 0).length,
        character_count: content.length,
        media_count: formData.value.media_urls?.length || 0
    };
});

const getFieldError = (field) => {
    const error = props.validationErrors.find(e => e.field === field);
    return error ? [error.message] : [];
};

const handleSubmit = async () => {
    const { valid } = await formRef.value.validate();
    if (!valid) {
        return;
    }
    emit('submit', formData.value);
};

// Initialize form data when variant changes
watch(() => props.variant, (newVariant) => {
    if (newVariant) {
        formData.value = {
            channel_id: newVariant.channel_id,
            content: newVariant.content || '',
            media_urls: newVariant.media_urls || []
        };
    } else {
        formData.value = {
            channel_id: null,
            content: '',
            media_urls: []
        };
    }
}, { immediate: true });
</script>
