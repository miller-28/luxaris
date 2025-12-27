<template>
    <v-card class="pagination-card ml-4 mt-4 mr-4">
        <v-card-text class="py-3">
            <v-row align="center" class="pagination-row">
                <!-- Pagination Controls -->
                <v-col cols="auto" md="6" class="d-flex align-center justify-center justify-md-start gap-1 pagination-controls">
                    <v-btn
                        icon="mdi-chevron-double-left"
                        variant="text"
                        size="small"
                        :disabled="currentPage === 1"
                        @click="handleFirst"
                    />
                    
                    <v-btn
                        icon="mdi-chevron-left"
                        variant="text"
                        size="small"
                        :disabled="currentPage === 1"
                        @click="handlePrevious"
                    />
                    
                    <v-btn
                        v-for="pageNum in visiblePages"
                        :key="pageNum"
                        :variant="pageNum === currentPage ? 'flat' : 'text'"
                        :color="pageNum === currentPage ? 'primary' : undefined"
                        size="small"
                        @click="handlePageClick(pageNum)"
                        :disabled="pageNum === '...'"
                    >
                        {{ pageNum }}
                    </v-btn>
                    
                    <v-btn
                        icon="mdi-chevron-right"
                        variant="text"
                        size="small"
                        :disabled="currentPage === totalPages"
                        @click="handleNext"
                    />
                    
                    <span v-if="totalPages > 5" class="text-body-2 ml-2 out-of-pages-label">
                        out of <strong class="clickable-page" @click="handlePageClick(totalPages)">{{ formattedTotalPages }}</strong> pages
                    </span>
                </v-col>
                
                <!-- Info and Per Page Selector -->
                <v-col cols="auto" md="6" class="d-flex align-center justify-center justify-md-end pagination-info">
                    <div class="d-flex align-center">
                        <span class="text-body-2 mr-3">
                            <strong>{{ formattedTotalRecords }}</strong> Records
                        </span>
                        <v-select
                            :model-value="itemsPerPage"
                            :items="perPageOptions"
                            density="compact"
                            variant="outlined"
                            hide-details
                            class="mx-2"
                            style="min-width: 100px; max-width: 120px"
                            @update:model-value="handlePerPageChange"
                        />
                        <span class="text-body-2 ml-2">items per page</span>
                    </div>
                </v-col>
            </v-row>
        </v-card-text>
    </v-card>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import numbro from 'numbro';

const props = defineProps({
    currentPage: {
        type: Number,
        required: true
    },
    totalPages: {
        type: Number,
        required: true
    },
    totalRecords: {
        type: Number,
        required: true
    },
    itemsPerPage: {
        type: Number,
        default: 10
    },
    maxVisiblePages: {
        type: Number,
        default: 5
    }
});

const emit = defineEmits(['page-change', 'per-page-change']);

const { t } = useI18n();

const isMobile = ref(false);

const updateIsMobile = () => {
    isMobile.value = window.innerWidth <= 960;
};

// Format numbers with thousand separators
const formattedTotalPages = computed(() => {
    return numbro(props.totalPages).format({
        thousandSeparated: true,
        mantissa: 0
    });
});

const formattedTotalRecords = computed(() => {
    return numbro(props.totalRecords).format({
        thousandSeparated: true,
        mantissa: 0
    });
});

onMounted(() => {
    updateIsMobile();
    window.addEventListener('resize', updateIsMobile);
});

onUnmounted(() => {
    window.removeEventListener('resize', updateIsMobile);
});

const perPageCounts = [1, 3, 10, 25, 50, 100, 250, 500, 1000];

const perPageOptions = computed(() => perPageCounts.map((count) => ({
    title: count.toString(),
    value: count
})));

const visiblePages = computed(() => {
    const pages = [];
    const maxVisible = isMobile.value ? 3 : props.maxVisiblePages;
    const total = props.totalPages;
    const current = props.currentPage;
    
    if (total <= maxVisible) {
        // Show all pages if total is less than or equal to max visible
        for (let i = 1; i <= total; i++) {
            pages.push(i);
        }
    } else {
        // Calculate which pages to show
        const halfVisible = Math.floor(maxVisible / 2);
        let startPage = Math.max(1, current - halfVisible);
        let endPage = Math.min(total, startPage + maxVisible - 1);
        
        // Adjust startPage if we're near the end
        if (endPage - startPage < maxVisible - 1) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }
        
        // Add pages
        for (let i = startPage; i <= endPage; i++) {
            pages.push(i);
        }
        
        // Add ellipsis if needed
        if (endPage < total) {
            pages.push('...');
        }
    }
    
    return pages;
});

const handlePageClick = (page) => {
    if (page !== '...' && page !== props.currentPage) {
        emit('page-change', page);
    }
};

const handleFirst = () => {
    if (props.currentPage > 1) {
        emit('page-change', 1);
    }
};

const handlePrevious = () => {
    if (props.currentPage > 1) {
        emit('page-change', props.currentPage - 1);
    }
};

const handleNext = () => {
    if (props.currentPage < props.totalPages) {
        emit('page-change', props.currentPage + 1);
    }
};

const handlePerPageChange = (value) => {
    emit('per-page-change', value);
};
</script>

<style scoped>
.pagination-card {
    flex-shrink: 0;
}

/* Mobile: sticky pagination at bottom */
@media (max-width: 960px) {
    .pagination-card {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        z-index: 100;
        margin: 0;
        box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.3) !important;
    }
    
    .pagination-card :deep(.v-card-text) {
        padding: 8px 12px !important;
    }
    
    /* Hide "out of X pages" label on mobile */
    .out-of-pages-label {
        display: none !important;
    }
    
    /* Keep in same row but swap positions */
    .pagination-row {
        flex-wrap: nowrap;
    }
    
    .pagination-controls {
        order: 1;
        flex: 0 0 auto;
    }
    
    .pagination-info {
        order: 2;
        flex: 1;
        justify-content: flex-end !important;
    }
    
    .pagination-info .d-flex {
        gap: 4px;
        flex-wrap: nowrap;
    }
    
    .pagination-info .text-body-2 {
        font-size: 0.7rem;
        white-space: nowrap;
    }
    
    .pagination-info .v-select {
        min-width: 60px !important;
        max-width: 80px !important;
    }
    
    .pagination-info .mx-2 {
        margin-left: 4px !important;
        margin-right: 4px !important;
    }
    
    .pagination-info .mr-3 {
        margin-right: 8px !important;
    }
    
    .pagination-info .ml-2 {
        margin-left: 4px !important;
    }
}

.v-btn {
    min-width: 36px;
}

.clickable-page {
    cursor: pointer;
    color: rgb(var(--v-theme-primary));
    text-decoration: underline;
}

.clickable-page:hover {
    opacity: 0.8;
}
</style>
