<template>
    <DashboardLayout>
        <div class="page-content">

            <!-- Header -->
            <AbstractPageHeader
                :title="$t('posts.title')"
                :subtitle="$t('posts.subtitle')"
                :actions="pageActions"
            />
            
            <!-- Filters -->
            <AbstractGridTableFilter
                v-model="filters"
                :filter-fields="filterFields"
                @filter-change="handleFilterChange"
                @clear-filters="handleClearFilters"
                @search="handleSearch"
            />
            
            <!-- Posts Table -->
            <PostsGridTable
                class="flex-1"
                :posts="posts"
                :loading="loading"
                :items-per-page="itemsPerPage"
                :page="currentPage"
                :sort-by="sortBy"
                :total-records="pagination.total"
                :selectable="true"
                :selected-items="postsStore.selectedItems"
                @update:selected-items="postsStore.setSelectedItems"
                @row-click="handleRowClick"
                @view="handleViewPost"
                @edit="openEditDialog"
                @delete="openDeleteDialog"
                @publish="handlePublish"
                @unpublish="handleUnpublish"
                @create="openCreateDialog"
                @sort-change="handleSortChange"
                @page-change="handlePageChange"
                @per-page-change="handlePerPageChange"
            />
            
            <!-- Create/Edit Dialog -->
            <v-dialog 
                v-model="editDialog" 
                max-width="800"
                persistent
            >
                <PostEditPanel 
                    :post="selectedPost"
                    :loading="loading"
                    :error="error"
                    :validation-errors="validationErrors"
                    @submit="handleSubmit"
                    @close="closeEditDialog"
                    @clear-error="clearError"
                />
            </v-dialog>
            
            <!-- Delete Confirmation Dialog -->
            <DeleteConfirmModal 
                v-model="deleteDialog"
                :title="$t('posts.delete.title')"
                :message="$t('posts.delete.message')"
                @confirm="handleDelete"
            />
        </div>
    </DashboardLayout>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import AbstractPageHeader from '@/shared/components/AbstractPageHeader.vue';
import AbstractGridTableFilter from '@/shared/components/AbstractGridTableFilter.vue';
import PostsGridTable from '../components/PostsGridTable.vue';
import PostEditPanel from '../components/PostEditPanel.vue';
import DeleteConfirmModal from '../components/DeleteConfirmModal.vue';
import { usePosts } from '../../application/composables/usePosts';
import { usePostsStore } from '../../infrastructure/store/postsStore';
import { useToast } from '@/shared/composables/useToast';

const { t: $t } = useI18n();
const { showToastSuccess, showToastError } = useToast();
const router = useRouter();
const postsStore = usePostsStore();

const {
    posts,
    loading,
    error,
    validationErrors,
    pagination,
    loadPosts,
    createPost,
    updatePost,
    deletePost,
    publishPost,
    unpublishPost,
    clearFilters: clearStoreFilters,
    clearError,
    clearValidationErrors
} = usePosts();

// Local state
const filters = ref({
    search: '',
    status: null,
    tags: []
});
const editDialog = ref(false);
const deleteDialog = ref(false);
const selectedPost = ref(null);
const currentPage = ref(1);
const itemsPerPage = ref(10);
const sortBy = ref([{ key: 'updated_at', order: 'desc' }]);

// Filter field definitions for AbstractGridTableFilter
const filterFields = computed(() => [
    {
        key: 'search',
        type: 'text',
        label: $t('posts.searchPosts'),
        icon: 'mdi-magnify',
        cols: 12,
        md: 4
    },
    {
        key: 'status',
        type: 'select',
        label: $t('posts.fields.status'),
        options: [
            { title: $t('posts.status.all'), value: null },
            { title: $t('posts.status.draft'), value: 'draft' },
            { title: $t('posts.status.published'), value: 'published' }
        ],
        cols: 12,
        md: 3
    },
    {
        key: 'tags',
        type: 'combobox',
        label: $t('posts.fields.tags'),
        cols: 12,
        md: 2
    },
    {
        key: 'search',
        type: 'search-button',
        label: $t('posts.search'),
        icon: 'mdi-magnify',
        color: 'primary',
        variant: 'flat',
        cols: 12,
        md: 'auto'
    },
    {
        key: 'clear',
        type: 'clear-button',
        label: $t('posts.clearFilters'),
        icon: 'mdi-filter-remove',
        color: 'grey',
        variant: 'flat',
        cols: 12,
        md: 'auto'
    }
]);

// Handle filter changes from AbstractGridTableFilter
const handleFilterChange = (newFilters) => {
    currentPage.value = 1; // Reset to first page
    loadPostsWithFilters();
};

// Handle search button click
const handleSearch = (filters) => {
    currentPage.value = 1;
    loadPostsWithFilters();
};

// Handle clear filters from AbstractGridTableFilter
const handleClearFilters = () => {
    currentPage.value = 1;
    clearStoreFilters();
    loadPostsWithFilters();
};

// Load posts with current filters
const loadPostsWithFilters = () => {
    loadPosts({
        search: filters.value.search,
        status: filters.value.status,
        tags: filters.value.tags,
        page: currentPage.value,
        per_page: itemsPerPage.value,
        sortBy: sortBy.value[0]?.key,
        sortOrder: sortBy.value[0]?.order
    }, currentPage.value === 1);
};

// Actions
const handlePageChange = (page) => {
    currentPage.value = page;
    loadPostsWithFilters();
};

const handleSortChange = (newSort) => {
    sortBy.value = newSort;
    currentPage.value = 1;
    loadPostsWithFilters();
};

const handlePerPageChange = (perPage) => {
    itemsPerPage.value = perPage;
    currentPage.value = 1;
    loadPostsWithFilters();
};

const openCreateDialog = () => {
    selectedPost.value = null;
    clearValidationErrors();
    clearError();
    editDialog.value = true;
};

const pageActions = computed(() => ([
    {
        key: 'create',
        label: $t('posts.createPost'),
        icon: 'mdi-plus',
        color: 'primary',
        variant: 'flat',
        size: 'default',
        onClick: openCreateDialog
    }
]));

const openEditDialog = (post) => {
    selectedPost.value = post;
    clearValidationErrors();
    clearError();
    editDialog.value = true;
};

const closeEditDialog = () => {
    editDialog.value = false;
    selectedPost.value = null;
    clearValidationErrors();
    clearError();
};

const openDeleteDialog = (post) => {
    selectedPost.value = post;
    deleteDialog.value = true;
};

const handleSubmit = async (formData) => {
    let result;
    
    if (selectedPost.value) {
        result = await updatePost(selectedPost.value.id, formData);
        if (result.success) {
            showToastSuccess($t('posts.messages.updateSuccess'));
        } else {
            const errorMsg = result.errors?.[0]?.message || result.error || $t('posts.messages.updateError');
            showToastError(errorMsg);
        }
    } else {
        result = await createPost(formData);
        if (result.success) {
            showToastSuccess($t('posts.messages.createSuccess'));
        } else {
            const errorMsg = result.errors?.[0]?.message || result.error || $t('posts.messages.createError');
            showToastError(errorMsg);
        }
    }
    
    if (result.success) {
        closeEditDialog();
        await loadPostsWithFilters();
    }
};

const handleDelete = async () => {
    if (!selectedPost.value) return;
    
    const result = await deletePost(selectedPost.value.id);
    
    if (result.success) {
        showToastSuccess($t('posts.messages.deleteSuccess'));
        deleteDialog.value = false;
        selectedPost.value = null;
    } else {
        const errorMsg = result.error || $t('posts.messages.deleteError');
        showToastError(errorMsg);
    }
};

const handlePublish = async (post) => {
    const result = await publishPost(post.id);
    
    if (result.success) {
        showToastSuccess($t('posts.messages.publishSuccess'));
        await loadPostsWithFilters();
    } else {
        const errorMsg = result.error || $t('posts.messages.publishError');
        showToastError(errorMsg);
    }
};

const handleUnpublish = async (post) => {
    const result = await unpublishPost(post.id);
    
    if (result.success) {
        showToastSuccess($t('posts.messages.unpublishSuccess'));
        await loadPostsWithFilters();
    } else {
        const errorMsg = result.error || $t('posts.messages.unpublishError');
        showToastError(errorMsg);
    }
};

const handleRowClick = (post) => {
    router.push(`/dashboard/posts/${post.id}`);
};

const handleViewPost = (post) => {
    router.push(`/dashboard/posts/${post.id}`);
};

// Load posts on mount
onMounted(async () => {
    await loadPostsWithFilters();
});

// Watch for errors and show as toast
watch(error, (newError) => {
    if (newError) {
        showToastError(newError);
        clearError();
    }
});
</script>

<style scoped>

.flex-1 {
    flex: 1;
    min-height: 0;
    overflow: hidden;
}

/* Mobile: allow scrolling and remove fixed constraints */
@media (max-width: 960px) {
   
     .flex-1 {
        overflow: visible;
        height: auto;
        min-height: auto;
        flex: none;
        margin-bottom: 70px;
    }
}
</style>