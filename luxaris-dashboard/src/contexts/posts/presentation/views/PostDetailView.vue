<template>
    <DashboardLayout>

        <!-- Header -->
        <div class="d-flex align-center justify-space-between mb-6">
            <h1 class="text-h4">{{ $t('posts.title') }}</h1>
            <v-btn 
                color="primary" 
                prepend-icon="mdi-arrow-left"
                @click="goBack"
            >
                {{ $t('posts.backToGrid') }}
            </v-btn>
        </div>
        
        <!-- Loading State -->
        <v-card v-if="loading && !currentPost" class="mb-4">
            <v-skeleton-loader type="article, article" />
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
        
        <!-- Post Content -->
        <v-card v-if="currentPost" class="mb-4">
                <v-card-text>
                    <div class="text-h5 mb-3">{{ currentPost.title }}</div>
                    
                    <v-divider class="mb-3" />
                    
                    <div v-if="currentPost.description" class="text-body-1 mb-4" style="white-space: pre-wrap;">
                        {{ currentPost.description }}
                    </div>
                    
                    <v-chip-group v-if="currentPost.tags && currentPost.tags.length > 0">
                        <v-chip 
                            v-for="tag in currentPost.tags" 
                            :key="tag"
                            variant="tonal"
                        >
                            {{ tag }}
                        </v-chip>
                    </v-chip-group>
                </v-card-text>
                
                <v-card-actions>
                    <v-btn 
                        prepend-icon="mdi-pencil"
                        @click="openEditDialog"
                    >
                        {{ $t('posts.actions.edit') }}
                    </v-btn>
                    <v-btn 
                        prepend-icon="mdi-delete"
                        color="error"
                        variant="text"
                        @click="openDeleteDialog"
                    >
                        {{ $t('posts.actions.delete') }}
                    </v-btn>
                    <v-spacer />
                    <v-btn 
                        v-if="currentPost.status === 'draft'"
                        color="primary"
                        prepend-icon="mdi-publish"
                        @click="handlePublish"
                    >
                        {{ $t('posts.actions.publish') }}
                    </v-btn>
                    <v-btn 
                        v-else
                        color="grey"
                        prepend-icon="mdi-undo"
                        @click="handleUnpublish"
                    >
                        {{ $t('posts.actions.unpublish') }}
                    </v-btn>
                </v-card-actions>
        </v-card>
        
        <!-- Variants Section -->
        <v-card v-if="currentPost">
            <v-card-title class="d-flex align-center">
                <span>{{ $t('posts.variants.title') }}</span>
                <v-spacer />
                <v-btn 
                    color="primary" 
                    prepend-icon="mdi-plus"
                    size="small"
                    @click="openCreateVariantDialog"
                >
                    {{ $t('posts.variants.addVariant') }}
                </v-btn>
            </v-card-title>
            
            <v-card-text>
                <VariantsGrid 
                    :variants="variants"
                    :loading="loading"
                    @create="openCreateVariantDialog"
                    @edit="openEditVariantDialog"
                    @delete="openDeleteVariantDialog"
                />
            </v-card-text>
        </v-card>
        
        <!-- Edit Post Dialog -->
        <v-dialog 
            v-model="editDialog" 
            max-width="800"
            persistent
        >
            <PostEditPanel 
                :post="currentPost"
                :loading="loading"
                :error="error"
                :validation-errors="validationErrors"
                @submit="handleSubmit"
                @close="closeEditDialog"
                @clear-error="clearError"
            />
        </v-dialog>
        
        <!-- Edit Variant Dialog -->
        <v-dialog 
            v-model="variantDialog" 
            max-width="800"
            persistent
        >
            <VariantEditPanel 
                :variant="selectedVariant"
                :channels="[]"
                :loading="loading"
                :error="error"
                :validation-errors="variantValidationErrors"
                @submit="handleVariantSubmit"
                @close="closeVariantDialog"
                @clear-error="clearError"
            />
        </v-dialog>
        
        <!-- Delete Post Confirmation -->
        <DeleteConfirmModal 
            v-model="deleteDialog"
            :title="$t('posts.delete.title')"
            :message="$t('posts.delete.message')"
            @confirm="handleDelete"
        />
            
        <!-- Delete Variant Confirmation -->
        <DeleteConfirmModal 
            v-model="deleteVariantDialog"
            :title="$t('posts.variants.delete.title')"
            :message="$t('posts.variants.delete.message')"
            @confirm="handleDeleteVariant"
        />
    </DashboardLayout>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import DashboardLayout from '@/layouts/DashboardLayout.vue';

const { t: $t } = useI18n();
import PostStatusBadge from '../components/PostStatusBadge.vue';
import PostEditPanel from '../components/PostEditPanel.vue';
import VariantsGrid from '../components/VariantsGrid.vue';
import VariantEditPanel from '../components/VariantEditPanel.vue';
import DeleteConfirmModal from '../components/DeleteConfirmModal.vue';
import { usePosts } from '../../application/composables/usePosts';
import { usePostVariants } from '../../application/composables/usePostVariants';

const router = useRouter();
const route = useRoute();

const {
    currentPost,
    loading,
    error,
    validationErrors,
    loadPost,
    createPost,
    updatePost,
    deletePost,
    publishPost,
    unpublishPost,
    clearError,
    clearValidationErrors,
    clearCurrentPost
} = usePosts();

const {
    variants,
    validationErrors: variantValidationErrors,
    loadVariants,
    createVariant,
    updateVariant,
    deleteVariant,
    clearValidationErrors: clearVariantValidationErrors
} = usePostVariants();

// Local state
const editDialog = ref(false);
const deleteDialog = ref(false);
const variantDialog = ref(false);
const deleteVariantDialog = ref(false);
const selectedVariant = ref(null);

const postId = computed(() => parseInt(route.params.id));

// Actions
const goBack = () => {
    router.push('/dashboard/posts');
};

const openEditDialog = () => {
    clearValidationErrors();
    clearError();
    editDialog.value = true;
};

const openCreateDialog = () => {
    clearCurrentPost();
    clearValidationErrors();
    clearError();
    editDialog.value = true;
};

const closeEditDialog = () => {
    editDialog.value = false;
    clearValidationErrors();
    clearError();
};

const openDeleteDialog = () => {
    deleteDialog.value = true;
};

const openCreateVariantDialog = () => {
    selectedVariant.value = null;
    clearVariantValidationErrors();
    clearError();
    variantDialog.value = true;
};

const openEditVariantDialog = (variant) => {
    selectedVariant.value = variant;
    clearVariantValidationErrors();
    clearError();
    variantDialog.value = true;
};

const closeVariantDialog = () => {
    variantDialog.value = false;
    selectedVariant.value = null;
    clearVariantValidationErrors();
    clearError();
};

const openDeleteVariantDialog = (variant) => {
    selectedVariant.value = variant;
    deleteVariantDialog.value = true;
};

const handleSubmit = async (formData) => {
    let result;
    
    if (currentPost.value) {
        // Update existing post
        result = await updatePost(postId.value, formData);
    } else {
        // Create new post
        result = await createPost(formData);
        if (result.success && result.post) {
            // Navigate to the new post's detail page
            router.push(`/dashboard/posts/${result.post.id}`);
        }
    }
    
    if (result.success) {
        closeEditDialog();
    }
};

const handleDelete = async () => {
    const result = await deletePost(postId.value);
    
    if (result.success) {
        deleteDialog.value = false;
        goBack();
    }
};

const handlePublish = async () => {
    const result = await publishPost(postId.value);
    
    if (result.success) {
        await loadPost(postId.value);
    }
};

const handleUnpublish = async () => {
    const result = await unpublishPost(postId.value);
    
    if (result.success) {
        await loadPost(postId.value);
    }
};

const handleVariantSubmit = async (formData) => {
    let result;
    
    if (selectedVariant.value) {
        result = await updateVariant(postId.value, selectedVariant.value.id, formData);
    } else {
        result = await createVariant(postId.value, formData);
    }
    
    if (result.success) {
        closeVariantDialog();
        await loadVariants(postId.value);
    }
};

const handleDeleteVariant = async () => {
    if (!selectedVariant.value) return;
    
    const result = await deleteVariant(postId.value, selectedVariant.value.id);
    
    if (result.success) {
        deleteVariantDialog.value = false;
        selectedVariant.value = null;
    }
};

const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
};

// Load post when ID changes
watch(postId, async (newId) => {
    if (newId) {
        await loadPost(newId);
    }
}, { immediate: true });

// Cleanup on unmount
onMounted(() => {
    return () => {
        clearCurrentPost();
    };
});
</script>
