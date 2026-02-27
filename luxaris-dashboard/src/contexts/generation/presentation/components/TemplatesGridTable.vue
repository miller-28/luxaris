<template>
    <AbstractGridTable
        :headers="headers"
        :items="templates"
        :loading="loading"
        :items-per-page="itemsPerPage"
        :page="page"
        :sort-by="sortBy"
        :total-records="totalRecords"
        :selectable="selectable"
        :selected-items="selectedItems"
        :item-key="itemKey"
        table-class="templates-grid-table"
        :empty-icon="'mdi-file-document-multiple-outline'"
        :empty-title="$t('templates.noTemplatesFound')"
        :empty-message="$t('templates.emptyMessage')"
        :empty-action-text="$t('templates.createYourFirstTemplate')"
        :show-empty-action="true"
        @row-click="handleRowClick"
        @sort-change="$emit('sort-change', $event)"
        @page-change="$emit('page-change', $event)"
        @per-page-change="$emit('per-page-change', $event)"
        @empty-action="$emit('create')"
        @update:selected-items="$emit('update:selected-items', $event)"
    >
        <!-- Name Column -->
        <template #item.name="{ item }">
            <div class="text-truncate" style="max-width: 250px;">
                {{ item.name }}
            </div>
        </template>

        <!-- Description Column -->
        <template #item.description="{ item }">
            <div class="text-truncate text-grey" style="max-width: 300px;">
                {{ item.description || '-' }}
            </div>
        </template>

        <!-- Template Body Column -->
        <template #item.template_body="{ item }">
            <div class="text-truncate text-grey" style="max-width: 400px; font-family: monospace; font-size: 0.85em;">
                {{ item.template_body }}
            </div>
        </template>

        <!-- Placeholders Column -->
        <template #item.placeholders="{ item }">
            <v-chip
                v-for="placeholder in (item.placeholders || []).slice(0, 2)"
                :key="placeholder"
                size="small"
                variant="outlined"
                class="mr-1"
            >
                {{ formatPlaceholder(placeholder) }}
            </v-chip>
            <span v-if="item.placeholders && item.placeholders.length > 2" class="text-caption text-grey">
                +{{ item.placeholders.length - 2 }}
            </span>
            <span v-if="!item.placeholders || item.placeholders.length === 0" class="text-grey">-</span>
        </template>

        <!-- Character Count Column -->
        <template #item.character_count="{ item }">
            <span class="text-caption">{{ item.template_body?.length || 0 }}</span>
        </template>

        <!-- Created At Column -->
        <template #item.created_at="{ item }">
            <span class="text-caption">
                <template v-if="item.created_at">
                    {{ new Date(item.created_at).toLocaleDateString() }}
                    <br>
                    {{ new Date(item.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) }}
                </template>
                <template v-else>-</template>
            </span>
        </template>

        <!-- Actions Column -->
        <template #item.actions="{ item }">
            <div class="d-flex gap-1">
                <v-btn
                    icon="mdi-pencil"
                    size="small"
                    variant="text"
                    @click.stop="$emit('edit', item)"
                />
                <v-btn
                    icon="mdi-delete"
                    size="small"
                    variant="text"
                    color="error"
                    @click.stop="$emit('delete', item)"
                />
            </div>
        </template>
    </AbstractGridTable>
</template>

<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import AbstractGridTable from '@/shared/components/AbstractGridTable.vue';

const { t: $t } = useI18n();

const props = defineProps({
    templates: {
        type: Array,
        default: () => []
    },
    loading: {
        type: Boolean,
        default: false
    },
    itemsPerPage: {
        type: Number,
        default: 10
    },
    page: {
        type: Number,
        default: 1
    },
    sortBy: {
        type: Array,
        default: () => [{ key: 'created_at', order: 'desc' }]
    },
    totalRecords: {
        type: Number,
        required: true
    },
    selectable: {
        type: Boolean,
        default: false
    },
    selectedItems: {
        type: Array,
        default: () => []
    },
    itemKey: {
        type: String,
        default: 'id'
    }
});

const emit = defineEmits([
    'row-click', 
    'edit', 
    'delete', 
    'create', 
    'sort-change', 
    'page-change', 
    'per-page-change', 
    'update:selected-items'
]);

// Table headers definition
const headers = computed(() => [
    { title: $t('templates.fields.name'), key: 'name', sortable: true },
    { title: $t('templates.fields.description'), key: 'description', sortable: false },
    { title: $t('templates.fields.templateBody'), key: 'template_body', sortable: false },
    { title: $t('templates.placeholdersDetected'), key: 'placeholders', sortable: false },
    { title: $t('templates.stats.characters'), key: 'character_count', sortable: false },
    { title: $t('common.createdAt'), key: 'created_at', sortable: true },
    { title: $t('common.actions'), key: 'actions', sortable: false }
]);

const handleRowClick = (event, { item }) => {
    emit('row-click', item);
};

const formatPlaceholder = (placeholder) => {
    return `{{${placeholder}}}`;
};
</script>
