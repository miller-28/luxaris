<template>
    <DashboardLayout>

        <!-- Header -->
        <div class="d-flex align-center justify-space-between mb-6">
            <h1 class="text-h4">{{ $t('posts.title') }}</h1>
            <v-btn 
                color="primary" 
                prepend-icon="mdi-plus"
                @click="openCreateDialog"
            >
                {{ $t('posts.createPost') }}
            </v-btn>
        </div>
        
        <!-- Filters -->
            <v-card class="mb-4">
                <v-card-text>
                    <v-row>
                        <v-col cols="12" md="4">
                            <v-text-field
                                v-model="searchQuery"
                                :label="$t('posts.searchPosts')"
                                prepend-inner-icon="mdi-magnify"
                                variant="outlined"
                                density="compact"
                                clearable
                                hide-details
                            />
                        </v-col>
                        
                        <v-col cols="12" md="3">
                            <v-select
                                v-model="statusFilter"
                                :label="$t('posts.fields.status')"
                                :items="statusOptions"
                                variant="outlined"
                                density="compact"
                                clearable
                                hide-details
                            />
                        </v-col>
                        
                        <v-col cols="12" md="3">
                            <v-combobox
                                v-model="tagsFilter"
                                :label="$t('posts.fields.tags')"
                                multiple
                                chips
                                variant="outlined"
                                density="compact"
                                clearable
                                hide-details
                            />
                        </v-col>
                        
                        <v-col cols="12" md="2" class="d-flex align-center">
                            <v-btn 
                                color="grey" 
                                variant="text"
                                @click="clearFilters"
                                block
                            >
                                {{ $t('posts.clearFilters') }}
                            </v-btn>
                        </v-col>
                    </v-row>
                </v-card-text>
            </v-card>
            
            <!-- Error Alert -->
            <v-alert 
                v-if="error" 
                type="error" 
                variant="tonal"
                closable
                @click:close="clearError"
                class="mb-4"
            >
                {{ error }}
            </v-alert>
            
            <!-- Posts Table -->
            <PostsGridTable
                :posts="posts"
                :loading="loading"
                :items-per-page="itemsPerPage"
                :page="currentPage"
                :sort-by="sortBy"
                :total-records="pagination.total"
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
    </DashboardLayout>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import PostsGridTable from '../components/PostsGridTable.vue';
import PostEditPanel from '../components/PostEditPanel.vue';
import DeleteConfirmModal from '../components/DeleteConfirmModal.vue';
import { usePosts } from '../../application/composables/usePosts';
import { useToast } from '@/shared/composables/useToast';

const { t: $t } = useI18n();
const { showToastSuccess, showToastError } = useToast();
const router = useRouter();

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
const searchQuery = ref('');
const statusFilter = ref(null);
const tagsFilter = ref([]);
const editDialog = ref(false);
const deleteDialog = ref(false);
const selectedPost = ref(null);
const currentPage = ref(1);
const itemsPerPage = ref(10);
const sortBy = ref([{ key: 'updated_at', order: 'desc' }]);

const statusOptions = [
    { title: $t('posts.status.all'), value: null },
    { title: $t('posts.status.draft'), value: 'draft' },
    { title: $t('posts.status.published'), value: 'published' }
];

// Watch filters and trigger server-side filtering
watch([searchQuery, statusFilter, tagsFilter], () => {
    currentPage.value = 1; // Reset to first page
    loadPosts({
        search: searchQuery.value,
        status: statusFilter.value,
        tags: tagsFilter.value,
        page: 1,
        sortBy: sortBy.value[0]?.key,
        sortOrder: sortBy.value[0]?.order
    }, true); // resetPage = true to go back to first page on filter change
});

// Actions
const handlePageChange = (page) => {
    currentPage.value = page;
    loadPosts({
        search: searchQuery.value,
        status: statusFilter.value,
        tags: tagsFilter.value,
        page,
        per_page: itemsPerPage.value,
        sortBy: sortBy.value[0]?.key,
        sortOrder: sortBy.value[0]?.order
    }, false);
};

const handleSortChange = (newSort) => {
    currentPage.value = 1;
    loadPosts({
        search: searchQuery.value,
        status: statusFilter.value,
        tags: tagsFilter.value,
        page: 1,
        sortBy: newSort[0]?.key,
        sortOrder: newSort[0]?.order
    }, true);
};

const handlePerPageChange = (perPage) => {
    currentPage.value = 1;
    itemsPerPage.value = perPage;
    loadPosts({
        search: searchQuery.value,
        status: statusFilter.value,
        tags: tagsFilter.value,
        page: 1,
        per_page: perPage,
        sortBy: sortBy.value[0]?.key,
        sortOrder: sortBy.value[0]?.order
    }, true);
};

const openCreateDialog = () => {
    selectedPost.value = null;
    clearValidationErrors();
    clearError();
    editDialog.value = true;
};

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
        await loadPosts({}, false);
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
        await loadPosts({}, false);
    } else {
        const errorMsg = result.error || $t('posts.messages.publishError');
        showToastError(errorMsg);
    }
};

const handleUnpublish = async (post) => {
    const result = await unpublishPost(post.id);
    
    if (result.success) {
        showToastSuccess($t('posts.messages.unpublishSuccess'));
        await loadPosts({}, false);
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

const clearFilters = () => {
    searchQuery.value = '';
    statusFilter.value = null;
    tagsFilter.value = [];
    currentPage.value = 1;
    clearStoreFilters();
};

// Load posts on mount
onMounted(async () => {
    await loadPosts({ 
        page: 1,
        sortBy: 'updated_at',
        sortOrder: 'desc'
    }, true);
});
</script>


