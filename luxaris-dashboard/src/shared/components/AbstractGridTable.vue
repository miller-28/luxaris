<template>
    <div>
        <!-- Pagination Top -->
        <AbstractGridPagination
            v-if="totalRecords > 0"
            :current-page="page"
            :total-pages="Math.ceil(totalRecords / itemsPerPage)"
            :total-records="totalRecords"
            :items-per-page="itemsPerPage"
            @page-change="handlePageChange"
            @per-page-change="handlePerPageChange"
        />
        
        <!-- Table -->
        <v-card>
            <v-data-table
            :headers="headers"
            :items="items"
            :loading="loading"
            :items-per-page="itemsPerPage"
            :page="page"
            v-model:sort-by="localSortBy"
            hide-default-footer
            @click:row="handleRowClick"
            @update:sort-by="handleSortChange"
            hover
            :class="tableClass"
            must-sort
            :sort-asc-icon="'mdi-arrow-up'"
            :sort-desc-icon="'mdi-arrow-down'"
        >
            <!-- Pass through all slots to parent -->
            <template v-for="(_, name) in $slots" #[name]="slotData">
                <slot :name="name" v-bind="slotData" />
            </template>

            <!-- Default no-data slot -->
            <template v-if="!$slots['no-data']" #no-data>
                <div class="text-center py-8">
                    <v-icon :icon="emptyIcon" size="64" color="grey" class="mb-4" />
                    <div class="text-h6 text-grey">{{ emptyTitle }}</div>
                    <div class="text-body-2 text-grey mt-2">{{ emptyMessage }}</div>
                    <v-btn 
                        v-if="showEmptyAction"
                        color="primary" 
                        class="mt-4"
                        @click="$emit('empty-action')"
                    >
                        {{ emptyActionText }}
                    </v-btn>
                </div>
            </template>
        </v-data-table>
    </v-card>
    
    <!-- Pagination Bottom -->
    <AbstractGridPagination
        v-if="totalRecords > 0"
        :current-page="page"
        :total-pages="Math.ceil(totalRecords / itemsPerPage)"
        :total-records="totalRecords"
        :items-per-page="itemsPerPage"
        class="mt-4"
        @page-change="handlePageChange"
        @per-page-change="handlePerPageChange"
    />
    </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import AbstractGridPagination from './AbstractGridPagination.vue';

const props = defineProps({
    headers: {
        type: Array,
        required: true
    },
    items: {
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
        default: () => [{ key: 'updated_at', order: 'desc' }]
    },
    tableClass: {
        type: String,
        default: 'abstract-grid-table'
    },
    emptyIcon: {
        type: String,
        default: 'mdi-file-document-outline'
    },
    emptyTitle: {
        type: String,
        default: 'No items found'
    },
    emptyMessage: {
        type: String,
        default: 'Create your first item to get started'
    },
    emptyActionText: {
        type: String,
        default: 'Create Item'
    },
    showEmptyAction: {
        type: Boolean,
        default: true
    },
    totalRecords: {
        type: Number,
        required: true
    }
});

const emit = defineEmits(['row-click', 'sort-change', 'empty-action', 'page-change', 'per-page-change']);

const localSortBy = ref([...props.sortBy]);

watch(() => props.sortBy, (newVal) => {
    localSortBy.value = [...newVal];
}, { deep: true });

const handleRowClick = (event, { item }) => {
    emit('row-click', event, { item });
};

const handleSortChange = (newSort) => {
    emit('sort-change', newSort);
};

const handlePageChange = (page) => {
    emit('page-change', page);
};

const handlePerPageChange = (perPage) => {
    emit('per-page-change', perPage);
};
</script>

<style scoped>
/* Table header styling */
:deep(.v-table thead) {
    background-color: rgba(var(--v-theme-primary), 0.15) !important;
}

:deep(.v-table thead th) {
    background-color: rgba(var(--v-theme-primary), 0.15) !important;
    font-weight: 600 !important;
    font-size: 0.875rem !important;
    text-transform: uppercase !important;
    letter-spacing: 0.5px !important;
    color: rgb(var(--v-theme-on-surface)) !important;
}

/* Zebra striping for rows */
:deep(.v-table tbody tr:nth-child(odd)) {
    background-color: rgba(var(--v-theme-surface), 1) !important;
}

:deep(.v-table tbody tr:nth-child(even)) {
    background-color: rgba(var(--v-theme-surface-variant), 0.6) !important;
}

/* Hover effect */
:deep(.v-table tbody tr:hover) {
    background-color: rgba(var(--v-theme-primary), 0.08) !important;
}
</style>


