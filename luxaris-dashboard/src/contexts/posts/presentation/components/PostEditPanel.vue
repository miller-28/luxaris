<template>
    <v-card>
        <v-card-title class="d-flex align-center">
            <span>{{ isEditMode ? $t('posts.editPost') : $t('posts.createPost') }}</span>
            <v-spacer />
            <v-btn 
                icon="mdi-close" 
                variant="text"
                @click="$emit('close')"
            />
        </v-card-title>
        
        <v-card-text>
            <v-form ref="formRef" @submit.prevent="handleSubmit">
                <v-text-field
                    v-model="formData.title"
                    :label="$t('posts.fields.title')"
                    :rules="[rules.required, rules.maxLength(200)]"
                    :error-messages="getFieldError('title')"
                    counter="200"
                    variant="outlined"
                    class="mb-4"
                />
                
                <v-textarea
                    v-model="formData.description"
                    :label="$t('posts.fields.description')"
                    :rules="[rules.required, rules.maxLength(10000)]"
                    :error-messages="getFieldError('description')"
                    counter="10000"
                    variant="outlined"
                    rows="10"
                    class="mb-4"
                />
                
                <v-combobox
                    v-model="formData.tags"
                    :label="$t('posts.fields.tags')"
                    multiple
                    chips
                    closable-chips
                    :rules="[rules.maxTags]"
                    :error-messages="getFieldError('tags')"
                    variant="outlined"
                    class="mb-4"
                    :hint="$t('posts.hints.tags')"
                />
                
                <v-select
                    v-model="formData.status"
                    :label="$t('posts.fields.status')"
                    :items="statusOptions"
                    item-title="text"
                    item-value="value"
                    :error-messages="getFieldError('status')"
                    variant="outlined"
                    class="mb-4"
                />
                
                <v-alert 
                    v-if="error" 
                    type="error" 
                    variant="tonal"
                    closable
                    @click:close="$emit('clear-error')"
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
                            {{ $t('posts.stats.tags') }}: {{ stats.tag_count }}
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
                            v-if="isEditMode && formData.status === 'published'"
                            color="grey"
                            @click="handleSaveAsDraft"
                            :loading="loading"
                        >
                            {{ $t('posts.actions.saveAsDraft') }}
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

const { t: $t } = useI18n();

const props = defineProps({
    post: {
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
    title: '',
    description: '',
    tags: [],
    status: 'draft'
});

const isEditMode = computed(() => !!props.post);

const statusOptions = [
    { text: $t('posts.status.draft'), value: 'draft' },
    { text: $t('posts.status.published'), value: 'published' }
];

const rules = {
    required: (value) => !!value || $t('posts.validation.required'),
    maxLength: (max) => (value) => {
        if (!value) return true;
        return value.length <= max || $t('posts.validation.maxLength', { max });
    },
    maxTags: (value) => {
        if (!value || !Array.isArray(value)) return true;
        return value.length <= 10 || $t('posts.validation.maxTags');
    }
};

const stats = computed(() => {
    if (!formData.value.description) return null;
    
    return {
        word_count: formData.value.description.split(/\s+/).filter(w => w.length > 0).length,
        character_count: formData.value.description.length,
        tag_count: formData.value.tags?.length || 0
    };
});

const getFieldError = (field) => {
    const error = props.validationErrors.find(e => e.field === field);
    return error ? [error.message] : [];
};

const handleSubmit = async () => {
    const { valid } = await formRef.value.validate();
    if (!valid) return;
    
    emit('submit', { ...formData.value });
};

const handleSaveAsDraft = async () => {
    const { valid } = await formRef.value.validate();
    if (!valid) return;
    
    emit('submit', { ...formData.value, status: 'draft' });
};

// Initialize form data when post changes
watch(() => props.post, (newPost) => {
    if (newPost) {
        formData.value = {
            title: newPost.title || '',
            description: newPost.description || '',
            tags: newPost.tags || [],
            status: newPost.status || 'draft'
        };
    } else {
        formData.value = {
            title: '',
            description: '',
            tags: [],
            status: 'draft'
        };
    }
}, { immediate: true });
</script>
