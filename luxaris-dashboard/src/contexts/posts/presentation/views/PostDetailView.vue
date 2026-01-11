<template>
    <DashboardLayout>
        <div class="page-content">
            <!-- Header -->
            <AbstractPageHeader
                :title="currentPost?.title || $t('posts.title')"
                :actions="pageActions"
            />
            
            <!-- Loading State -->
            <v-card v-if="loading && !currentPost">
                <v-skeleton-loader type="article, article" />
            </v-card>
            
            <!-- Error Alert -->
            <v-alert 
                v-if="error" 
                type="error" 
                variant="tonal"
                closable
                @click:close="clearError"
            >
                {{ error }}
            </v-alert>
            
            <!-- Post Content -->
            <v-card v-if="currentPost" class="post-content-card ml-4 mt-4 mr-4">
                <v-card-text class="post-content-scrollable">
                    <div v-if="currentPost.description" class="text-body-1 mb-4" style="white-space: pre-wrap;">
                        {{ currentPost.description }}
                    </div>
                    
                    <div v-if="currentPost.tags && currentPost.tags.length > 0" class="text-caption text-grey mb-2">{{ $t('posts.fields.tags') }}:</div>
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
            <v-card v-if="currentPost" class="variants-card ma-4">
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
                
                <v-card-text class="variants-content-scrollable">
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
                    :channels="channels"
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
        </div>
    </DashboardLayout>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import AbstractPageHeader from '@/shared/components/AbstractPageHeader.vue';
import PostEditPanel from '../components/PostEditPanel.vue';
import VariantsGrid from '../components/VariantsGrid.vue';
import VariantEditPanel from '../components/VariantEditPanel.vue';
import DeleteConfirmModal from '@/shared/components/DeleteConfirmModal.vue';
import { usePosts } from '../../application/composables/usePosts';
import { usePostVariants } from '../../application/composables/usePostVariants';
import { useToast } from '@/shared/composables/useToast';
import { useChannels } from '@/contexts/channels/application/composables/useChannels';

const { t: $t } = useI18n();
const { showToastSuccess, showToastError } = useToast();
const router = useRouter();
const route = useRoute();

const { channels, loadChannels } = useChannels();

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

// Page actions for header
const pageActions = computed(() => ([
    {
        key: 'back',
        label: $t('posts.backToGrid'),
        icon: 'mdi-arrow-left',
        color: 'primary',
        variant: 'flat',
        size: 'default',
        onClick: goBack
    }
]));

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
        if (result.success) {
            showToastSuccess($t('posts.messages.updateSuccess'));
        } else {
            const errorMsg = result.errors?.[0]?.message || result.error || $t('posts.messages.updateError');
            showToastError(errorMsg);
        }
    } else {
        // Create new post
        result = await createPost(formData);
        if (result.success) {
            showToastSuccess($t('posts.messages.createSuccess'));
            if (result.post) {
                // Navigate to the new post's detail page
                router.push(`/dashboard/posts/${result.post.id}`);
            }
        } else {
            const errorMsg = result.errors?.[0]?.message || result.error || $t('posts.messages.createError');
            showToastError(errorMsg);
        }
    }
    
    if (result.success) {
        closeEditDialog();
    }
};

const handleDelete = async () => {
    const result = await deletePost(postId.value);
    
    if (result.success) {
        showToastSuccess($t('posts.messages.deleteSuccess'));
        deleteDialog.value = false;
        goBack();
    } else {
        const errorMsg = result.error || $t('posts.messages.deleteError');
        showToastError(errorMsg);
    }
};

const handlePublish = async () => {
    const result = await publishPost(postId.value);
    
    if (result.success) {
        showToastSuccess($t('posts.messages.publishSuccess'));
        await loadPost(postId.value);
    } else {
        const errorMsg = result.error || $t('posts.messages.publishError');
        showToastError(errorMsg);
    }
};

const handleUnpublish = async () => {
    const result = await unpublishPost(postId.value);
    
    if (result.success) {
        showToastSuccess($t('posts.messages.unpublishSuccess'));
        await loadPost(postId.value);
    } else {
        const errorMsg = result.error || $t('posts.messages.unpublishError');
        showToastError(errorMsg);
    }
};

const handleVariantSubmit = async (formData) => {
    let result;
    
    if (selectedVariant.value) {
        result = await updateVariant(postId.value, selectedVariant.value.id, formData);
        if (result.success) {
            showToastSuccess($t('posts.messages.variantUpdateSuccess'));
        } else {
            const errorMsg = result.errors?.[0]?.message || result.error || $t('posts.messages.variantUpdateError');
            showToastError(errorMsg);
        }
    } else {
        result = await createVariant(postId.value, formData);
        if (result.success) {
            showToastSuccess($t('posts.messages.variantCreateSuccess'));
        } else {
            const errorMsg = result.errors?.[0]?.message || result.error || $t('posts.messages.variantCreateError');
            showToastError(errorMsg);
        }
    }
    
    if (result.success) {
        closeVariantDialog();
        await loadVariants(postId.value);
    }
};

const handleDeleteVariant = async () => {
    if (!selectedVariant.value) {
        return;
    }
    
    const result = await deleteVariant(postId.value, selectedVariant.value.id);
    
    if (result.success) {
        showToastSuccess($t('posts.messages.variantDeleteSuccess'));
        deleteVariantDialog.value = false;
        selectedVariant.value = null;
    } else {
        const errorMsg = result.error || $t('posts.messages.variantDeleteError');
        showToastError(errorMsg);
    }
};

const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
};

// Load post and variants when ID changes
watch(postId, async (newId) => {
    if (newId) {
        await loadPost(newId);
        await loadVariants(newId);
    }
}, { immediate: true });

// Load channels on mount
onMounted(async () => {
    await loadChannels();
});

// Cleanup on unmount
onMounted(() => {
    return () => {
        clearCurrentPost();
    };
});
</script>

<style scoped>
.post-content-card {
    display: flex;
    flex-direction: column;
}

.post-content-scrollable {
    overflow-y: auto;
}

.variants-card {
    display: flex;
    flex-direction: column;
}

.variants-content-scrollable {
    overflow-y: auto;
}

/* Mobile: constrain content height to prevent pushing content off screen */
@media (max-width: 960px) {
    .post-content-scrollable {
        max-height: 40vh;
    }
    
    .variants-content-scrollable {
        max-height: 40vh;
    }
}
</style>

