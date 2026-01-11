<template>
    <v-card
        :class="['template-card', { 'template-card--selected': selected }]"
        @click="handleClick"
        elevation="2"
        hover
    >
        <v-card-title class="d-flex align-center justify-space-between">
            <span class="text-truncate">{{ template.name }}</span>
            <v-chip
                v-if="template.hasPlaceholders"
                size="x-small"
                color="primary"
                variant="tonal"
            >
                {{ template.placeholders.length }} vars
            </v-chip>
        </v-card-title>

        <v-card-text>
            <div v-if="template.description" class="text-body-2 text-grey mb-2">
                {{ truncateText(template.description, 100) }}
            </div>
            
            <div class="template-body text-body-2 text-grey-darken-1">
                {{ truncateText(template.template_body, 150) }}
            </div>

            <div v-if="template.hasPlaceholders" class="mt-3">
                <div class="text-caption text-grey mb-1">Placeholders:</div>
                <div class="d-flex flex-wrap ga-1">
                    <v-chip
                        v-for="placeholder in template.placeholders"
                        :key="placeholder"
                        size="x-small"
                        variant="outlined"
                    >
                        {{ formatPlaceholder(placeholder) }}
                    </v-chip>
                </div>
            </div>

            <v-divider class="my-3" />

            <div class="d-flex justify-space-between align-center">
                <div class="text-caption text-grey">
                    {{ formatDate(template.created_at) }}
                </div>
                <div class="text-caption text-grey">
                    {{ template.characterCount }} chars
                </div>
            </div>
        </v-card-text>

        <v-card-actions v-if="showActions">
            <v-spacer />
            <v-btn
                icon="mdi-pencil"
                size="small"
                variant="text"
                @click.stop="$emit('edit', template)"
            />
            <v-btn
                icon="mdi-delete"
                size="small"
                variant="text"
                color="error"
                @click.stop="$emit('delete', template)"
            />
        </v-card-actions>
    </v-card>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
    template: {
        type: Object,
        required: true
    },
    selected: {
        type: Boolean,
        default: false
    },
    showActions: {
        type: Boolean,
        default: true
    }
});

defineEmits(['click', 'edit', 'delete']);

const handleClick = () => {
    // Emit click event (can be used for selection)
};

const truncateText = (text, maxLength) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
};

const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
};

const formatPlaceholder = (placeholder) => {
    return `{{${placeholder}}}`;
};
</script>

<style scoped>
.template-card {
    cursor: pointer;
    transition: all 0.2s ease;
}

.template-card--selected {
    border: 2px solid rgb(var(--v-theme-primary));
}

.template-body {
    font-family: monospace;
    background-color: rgba(0, 0, 0, 0.05);
    padding: 8px;
    border-radius: 4px;
    white-space: pre-wrap;
}

.v-theme--dark .template-body {
    background-color: rgba(255, 255, 255, 0.05);
}
</style>
