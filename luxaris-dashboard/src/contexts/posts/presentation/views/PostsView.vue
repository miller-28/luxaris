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
            
            <!-- Posts Grid -->
            <PostsGrid 
                :posts="posts"
                :loading="loading"
                @select="openPostDetail"
                @edit="openEditDialog"
                @delete="openDeleteDialog"
                @publish="handlePublish"
                @unpublish="handleUnpublish"
                @create="openCreateDialog"
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
import PostsGrid from '../components/PostsGrid.vue';
import PostEditPanel from '../components/PostEditPanel.vue';
import DeleteConfirmModal from '../components/DeleteConfirmModal.vue';
import { usePosts } from '../../application/composables/usePosts';

const { t: $t } = useI18n();
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

const statusOptions = [
    { title: $t('posts.status.all'), value: null },
    { title: $t('posts.status.draft'), value: 'draft' },
    { title: $t('posts.status.published'), value: 'published' }
];

// Watch filters and trigger server-side filtering
watch([searchQuery, statusFilter, tagsFilter], () => {
    loadPosts({
        search: searchQuery.value,
        status: statusFilter.value,
        tags: tagsFilter.value
    }, true); // resetPage = true to go back to first page on filter change
});

// Actions
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
    } else {
        result = await createPost(formData);
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
        deleteDialog.value = false;
        selectedPost.value = null;
    }
};

const handlePublish = async (post) => {
    const result = await publishPost(post.id);
    
    if (result.success) {
        await loadPosts({}, false);
    }
};

const handleUnpublish = async (post) => {
    const result = await unpublishPost(post.id);
    
    if (result.success) {
        await loadPosts({}, false);
    }
};

const openPostDetail = (post) => {
    router.push(`/dashboard/posts/${post.id}`);
};

const clearFilters = () => {
    searchQuery.value = '';
    statusFilter.value = null;
    tagsFilter.value = [];
    clearStoreFilters();
};

// Load posts on mount
onMounted(async () => {
    await loadPosts({}, true);
});
</script>
