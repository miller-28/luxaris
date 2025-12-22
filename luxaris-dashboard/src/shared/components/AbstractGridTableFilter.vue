<template>
    <v-card class="filters-card ml-4 mt-4 mr-4">
        <v-card-text>
            <v-row>
                <!-- Dynamic filter fields from parent -->
                <v-col
                    v-for="field in filterFields"
                    :key="field.key"
                    :cols="field.cols || 12"
                    :md="field.md || 4"
                    :class="field.class"
                >
                    <!-- Text Field -->
                    <v-text-field
                        v-if="field.type === 'text'"
                        v-model="localFilters[field.key]"
                        :label="field.label"
                        :prepend-inner-icon="field.icon"
                        variant="outlined"
                        density="compact"
                        clearable
                        hide-details
                    />
                    
                    <!-- Select Field -->
                    <v-select
                        v-else-if="field.type === 'select'"
                        v-model="localFilters[field.key]"
                        :label="field.label"
                        :items="field.options"
                        variant="outlined"
                        density="compact"
                        clearable
                        hide-details
                    />
                    
                    <!-- Combobox (Multi-select with chips) -->
                    <v-combobox
                        v-else-if="field.type === 'combobox'"
                        v-model="localFilters[field.key]"
                        :label="field.label"
                        multiple
                        chips
                        variant="outlined"
                        density="compact"
                        clearable
                        hide-details
                    />
                    
                    <!-- Date Picker -->
                    <v-text-field
                        v-else-if="field.type === 'date'"
                        v-model="localFilters[field.key]"
                        :label="field.label"
                        type="date"
                        variant="outlined"
                        density="compact"
                        clearable
                        hide-details
                    />
                    
                    <!-- Search Button -->
                    <v-btn
                        v-else-if="field.type === 'search-button'"
                        :color="field.color || 'primary'"
                        :variant="field.variant || 'flat'"
                        :prepend-icon="field.icon || 'mdi-magnify'"
                        block
                        :style="{ minWidth: field.minWidth || '120px' }"
                        @click="handleSearch"
                    >
                        {{ field.label }}
                    </v-btn>
                    
                    <!-- Clear Button -->
                    <v-btn
                        v-else-if="field.type === 'clear-button'"
                        :color="field.color || 'grey'"
                        :variant="field.variant || 'flat'"
                        :prepend-icon="field.icon || 'mdi-filter-remove'"
                        block
                        :style="{ minWidth: field.minWidth || '120px' }"
                        @click="handleClearFilters"
                    >
                        {{ field.label }}
                    </v-btn>
                </v-col>
            </v-row>
        </v-card-text>
    </v-card>
</template>

<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
    filterFields: {
        type: Array,
        required: true,
        validator: (fields) => {
            return fields.every(field => 
                field.key && 
                field.type && 
                ['text', 'select', 'combobox', 'date', 'search-button', 'clear-button'].includes(field.type)
            );
        }
    },
    modelValue: {
        type: Object,
        default: () => ({})
    }
});

const emit = defineEmits(['update:modelValue', 'filter-change', 'clear-filters', 'search']);

// Local reactive filter state
const localFilters = ref({});

// Initialize local filters from filterFields
const initializeFilters = () => {
    const filters = {};
    props.filterFields.forEach(field => {
        if (field.type !== 'clear-button' && field.type !== 'search-button') {
            filters[field.key] = props.modelValue[field.key] || (field.type === 'combobox' ? [] : null);
        }
    });
    localFilters.value = filters;
};

// Initialize on mount
initializeFilters();

// Watch local filters and emit changes
watch(localFilters, (newFilters) => {
    emit('update:modelValue', { ...newFilters });
    emit('filter-change', { ...newFilters });
}, { deep: true });

// Handle search button click
const handleSearch = () => {
    emit('search', { ...localFilters.value });
};

// Handle clear filters
const handleClearFilters = () => {
    const clearedFilters = {};
    props.filterFields.forEach(field => {
        if (field.type !== 'clear-button' && field.type !== 'search-button') {
            clearedFilters[field.key] = field.type === 'combobox' ? [] : null;
        }
    });
    localFilters.value = clearedFilters;
    emit('clear-filters');
};
</script>

<style scoped>
.filters-card {
    flex-shrink: 0;
}
</style>
