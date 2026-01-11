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
                :total-records="postsStore.pagination.total"
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
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import AbstractPageHeader from '@/shared/components/AbstractPageHeader.vue';
import AbstractGridTableFilter from '@/shared/components/AbstractGridTableFilter.vue';
import PostsGridTable from '../components/PostsGridTable.vue';
import PostEditPanel from '../components/PostEditPanel.vue';
import DeleteConfirmModal from '@/shared/components/DeleteConfirmModal.vue';
import { usePosts } from '../../application/composables/usePosts';
import { usePostsStore } from '../../infrastructure/store/postsStore';
import { useToast } from '@/shared/composables/useToast';

const { t: $t } = useI18n();
const { showToastSuccess, showToastError } = useToast();
const router = useRouter();
const postsStore = usePostsStore();

// Local state for posts (loaded fresh each time)
const posts = ref([]);
const loading = ref(false);
const error = ref(null);
const validationErrors = ref([]);

const {
    createPost,
    updatePost,
    deletePost,
    publishPost,
    unpublishPost
} = usePosts();

const clearError = () => {
    error.value = null; 
};
const clearValidationErrors = () => {
    validationErrors.value = []; 
};

// Use store state directly instead of local refs for persistence
const filters = computed({
    get: () => postsStore.filters,
    set: (value) => {
        postsStore.filters = { ...postsStore.filters, ...value };
    }
});

const currentPage = computed({
    get: () => postsStore.pagination.page,
    set: (value) => {
        postsStore.pagination.page = value;
    }
});

const itemsPerPage = computed({
    get: () => postsStore.pagination.limit,
    set: (value) => {
        postsStore.pagination.limit = value;
    }
});

// Local state for dialog and non-persistent data
const editDialog = ref(false);
const deleteDialog = ref(false);
const selectedPost = ref(null);

// Sort state persisted in store
const sortBy = computed({
    get: () => postsStore.sortBy,
    set: (value) => {
        postsStore.sortBy = value;
    }
});

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
    postsStore.clearFilters();
    loadPostsWithFilters();
};

// Load posts with current filters
const loadPostsWithFilters = async () => {
    loading.value = true;
    await postsStore.loadPosts({
        ...filters.value,
        page: currentPage.value,
        per_page: itemsPerPage.value,
        sortBy: sortBy.value[0]?.key,
        sortOrder: sortBy.value[0]?.order
    });
    // Copy fresh posts from store to local ref
    posts.value = [...postsStore.posts];
    loading.value = false;
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
    
    // Clear previous errors
    clearValidationErrors();
    clearError();
    
    if (selectedPost.value) {
        result = await updatePost(selectedPost.value.id, formData);
        if (result.success) {
            showToastSuccess($t('posts.messages.updateSuccess'));
        } else {
            if (result.errors) {
                validationErrors.value = result.errors;
            }
            const errorMsg = result.errors?.[0]?.message || result.error || $t('posts.messages.updateError');
            error.value = errorMsg;
            showToastError(errorMsg);
        }
    } else {
        result = await createPost(formData);
        if (result.success) {
            showToastSuccess($t('posts.messages.createSuccess'));
        } else {
            if (result.errors) {
                validationErrors.value = result.errors;
            }
            const errorMsg = result.errors?.[0]?.message || result.error || $t('posts.messages.createError');
            error.value = errorMsg;
            showToastError(errorMsg);
        }
    }
    
    if (result.success) {
        closeEditDialog();
        await loadPostsWithFilters();
    }
};

const handleDelete = async () => {
    if (!selectedPost.value) {
        return;
    }
    
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

// Always reload posts on mount to ensure fresh data, but preserve filters/pagination state
onMounted(async () => {
    // Load fresh posts with stored filters and pagination
    await loadPostsWithFilters();
});
</script>