<template>
    <div class="">
        <div class="grid-wrapper d-flex">
        <!-- Pagination Top -->
        <AbstractGridPagination
            v-if="totalRecords > 0 && !hidePagination"
            class="d-none d-md-block"
            :current-page="page"
            :total-pages="Math.ceil(totalRecords / itemsPerPage)"
            :total-records="totalRecords"
            :items-per-page="itemsPerPage"
            @page-change="handlePageChange"
            @per-page-change="handlePerPageChange"
        />
        
        <div class="grid-scroll-area">
            <!-- Desktop Table View -->
            <v-card class="d-none d-md-block table-card ml-4 mt-4 mr-4">
                <v-data-table
                    :headers="computedHeaders"
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
                    <!-- Checkbox column header -->
                    <template v-if="selectable" #header.checkbox>
                        <v-checkbox-btn
                            :model-value="isAllSelected"
                            :indeterminate="isSomeSelected && !isAllSelected"
                            @update:model-value="toggleSelectAll"
                            hide-details
                            density="compact"
                        />
                    </template>

                    <!-- Checkbox column item -->
                    <template v-if="selectable" #item.checkbox="{ item }">
                        <div class="checkbox-cell-wrapper" @click.stop="toggleSelection(item)">
                            <v-checkbox-btn
                                :model-value="isSelected(item)"
                                hide-details
                                density="compact"
                                @click.stop
                            />
                        </div>
                    </template>
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
        
            <!-- Mobile Card View -->
            <div class="d-md-none">

                <v-card
                    v-for="(item, index) in items"
                    :key="index"
                    class="ma-4"
                    :class="{ 'mobile-card-odd': index % 2 === 0, 'mobile-card-even': index % 2 !== 0 }"
                    @click="handleRowClick(null, { item })"
                >
                    <v-card-text class="pa-3">
                        <v-row dense class="mobile-field-grid">
                            <v-col
                                v-for="header in visibleHeaders"
                                :key="header.key"
                                cols="6"
                                class="mobile-field-item"
                            >
                                <div class="text-caption text-grey-darken-1 mb-1">{{ header.title }}</div>
                                <div class="text-body-2">
                                    <slot :name="`item.${header.key}`" :item="item">
                                        {{ item[header.key] }}
                                    </slot>
                                </div>
                            </v-col>
                        </v-row>
                    </v-card-text>
                </v-card>
            
                <!-- Empty state for mobile -->
                <v-card v-if="items.length === 0 && !loading" class="text-center py-8">
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
                </v-card>

            </div>
        </div>
        
        <!-- Pagination Bottom -->
        <AbstractGridPagination
            class="mb-4"
            v-if="totalRecords > 0 && !hidePagination"
            :current-page="page"
            :total-pages="Math.ceil(totalRecords / itemsPerPage)"
            :total-records="totalRecords"
            :items-per-page="itemsPerPage"
            @page-change="handlePageChange"
            @per-page-change="handlePerPageChange"
        />
        </div>
    </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue';
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
    },
    hidePagination: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits([
    'row-click', 
    'sort-change', 
    'empty-action', 
    'page-change', 
    'per-page-change', 
    'update:selected-items'
]);

const localSortBy = ref([...props.sortBy]);

// Add checkbox column if selectable
const computedHeaders = computed(() => {
    if (!props.selectable) return props.headers;
    
    const checkboxHeader = {
        key: 'checkbox',
        title: '',
        sortable: false,
        width: '60px'
    };
    
    return [checkboxHeader, ...props.headers];
});

// Include all headers for mobile view
const visibleHeaders = computed(() => {
    return props.headers;
});

// Selection state
const isSelected = (item) => {
    return props.selectedItems.some(selected => selected[props.itemKey] === item[props.itemKey]);
};

const isAllSelected = computed(() => {
    return props.items.length > 0 && props.items.every(item => isSelected(item));
});

const isSomeSelected = computed(() => {
    return props.selectedItems.length > 0 && props.selectedItems.length < props.items.length;
});

const toggleSelection = (item) => {
    const newSelection = isSelected(item)
        ? props.selectedItems.filter(selected => selected[props.itemKey] !== item[props.itemKey])
        : [...props.selectedItems, item];
    
    emit('update:selected-items', newSelection);
};

const toggleSelectAll = () => {
    if (isAllSelected.value) {
        // Deselect all
        emit('update:selected-items', []);
    } else {
        // Select all current page items
        emit('update:selected-items', [...props.items]);
    }
};

watch(() => props.sortBy, (newVal) => {
    localSortBy.value = [...newVal];
}, { deep: true });

const handleRowClick = (event, { item }) => {
    // Prevent row click if clicking on checkbox column (first column when selectable)
    if (event?.target && props.selectable) {
        const clickedElement = event.target;
        const clickedCell = clickedElement.tagName === 'TD' ? 
            clickedElement : clickedElement.closest('td');
        if (clickedCell && clickedCell.cellIndex === 0) {
            // First column is the checkbox column when selectable is true
            return;
        }
    }
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
    background-color: #6B6A2E !important;
}

:deep(.v-table thead th) {
    background-color: #494817 !important;
    font-weight: 600 !important;
    font-size: 0.875rem !important;
    color: rgb(var(--v-theme-on-surface)) !important;
    position: sticky !important;
    top: 0 !important;
    z-index: 10 !important;
    border-right: 1px solid rgba(var(--v-theme-on-surface), 0.12) !important;
}

:deep(.v-table thead th:last-child) {
    border-right: none !important;
}

/* Table cell styling - column borders */
:deep(.v-table tbody td) {
    border-right: 1px solid rgba(var(--v-theme-on-surface), 0.12) !important;
}

:deep(.v-table tbody td:last-child) {
    border-right: none !important;
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

/* Mobile card styling */
.mobile-card-odd {
    background-color: rgba(var(--v-theme-surface), 1) !important;
}

.mobile-card-even {
    background-color: rgba(var(--v-theme-surface-variant), 0.6) !important;
}

.mobile-card-odd:hover,
.mobile-card-even:hover {
    background-color: rgba(var(--v-theme-primary), 0.08) !important;
    cursor: pointer;
}

/* Mobile field grid: 2 columns */
.mobile-field-grid {
    margin: 0 !important;
}

.mobile-field-item {
    padding: 8px !important;
    border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.12);
}

.mobile-field-item:nth-last-child(-n+2) {
    border-bottom: none;
}

/* Add vertical separator between columns */
.mobile-field-item:nth-child(odd) {
    border-right: 1px solid rgba(var(--v-theme-on-surface), 0.12);
}

.grid-wrapper {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
}

.grid-scroll-area {
    flex: 1;
    min-height: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
}

.table-card {
    flex: 1;
    min-height: 0;
    overflow: auto;
    display: flex;
    flex-direction: column;
}

.table-card :deep(.v-table) {
    display: flex;
    flex-direction: column;
    height: 100%;
}

.table-card :deep(.v-table__wrapper) {
    flex: 1;
    overflow-y: auto;
}

/* Checkbox column styling */
:deep(.v-data-table th[data-column="checkbox"]) {
    padding: 0 !important;
}

:deep(.v-data-table td[data-column="checkbox"]) {
    padding: 0 !important;
}

/* Make checkbox cell wrapper fill the cell and be clickable */
.checkbox-cell-wrapper {
    width: 100%;
    height: 100%;
    padding: 0 0px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
}

/* Mobile: remove flex constraints */
@media (max-width: 960px) {
    .grid-scroll-area {
        overflow: visible;
        height: auto;
        min-height: auto;
    }
    .table-card {
        overflow: visible;
        height: auto;
        min-height: auto;
    }
}
</style>


