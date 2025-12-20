<template>
    <v-card class="mb-4">
        <v-card-text class="py-3">
            <v-row align="center">
                <!-- Pagination Controls -->
                <v-col cols="12" md="6" class="d-flex align-center justify-center justify-md-start">
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
                        class="mx-1"
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
                </v-col>
                
                <!-- Info and Per Page Selector -->
                <v-col cols="12" md="6" class="d-flex align-center justify-center justify-md-end">
                    <div class="d-flex align-center">
                        <span class="text-body-2 mr-4">
                            Total Pages: <strong>{{ totalPages }}</strong>
                        </span>
                        <span class="text-body-2 mr-4">
                            Total Records: <strong>{{ totalRecords }}</strong>
                        </span>
                        <v-select
                            :model-value="itemsPerPage"
                            :items="perPageOptions"
                            density="compact"
                            variant="outlined"
                            hide-details
                            style="min-width: 140px"
                            @update:model-value="handlePerPageChange"
                        />
                    </div>
                </v-col>
            </v-row>
        </v-card-text>
    </v-card>
</template>

<script setup>
import { computed } from 'vue';

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

const perPageOptions = [
    { title: '1 per page', value: 1 },
    { title: '3 per page', value: 3 },
    { title: '10 per page', value: 10 },
    { title: '25 per page', value: 25 },
    { title: '50 per page', value: 50 },
    { title: '100 per page', value: 100 }
];

const visiblePages = computed(() => {
    const pages = [];
    const maxVisible = props.maxVisiblePages;
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
.v-btn {
    min-width: 36px;
}
</style>
