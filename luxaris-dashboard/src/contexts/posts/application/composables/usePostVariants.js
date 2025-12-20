/**
 * usePostVariants Composable
 * Vue composable for post variants operations
 */
import { computed, ref } from 'vue';
import { usePostVariantsStore } from '../../infrastructure/store/postVariantsStore';
import { PostVariantCreateSchema, PostVariantUpdateSchema } from '../../domain/rules/postSchemas';

export function usePostVariants() {

    const store = usePostVariantsStore();
    const validationErrors = ref([]);

    // State
    const variants = computed(() => store.variants);
    const loading = computed(() => store.loading);
    const error = computed(() => store.error);

    // Actions
    const loadVariants = async (postId) => {
        const result = await store.loadVariants(postId);
        return result;
    };

    const createVariant = async (postId, variantData) => {
        validationErrors.value = [];
        try {
            const validatedData = PostVariantCreateSchema.parse(variantData);
            const result = await store.createVariant(postId, validatedData);
            return result;
        } catch (error) {
            if (error.issues && Array.isArray(error.issues)) {
                const errors = error.issues.map(err => ({
                    field: err.path.join('.'),
                    message: err.message
                }));
                validationErrors.value = errors;
                return { success: false, errors };
            }
            return { success: false, error: error.message };
        }
    };

    const updateVariant = async (postId, variantId, variantData) => {
        validationErrors.value = [];
        try {
            const validatedData = PostVariantUpdateSchema.parse(variantData);
            const result = await store.updateVariant(variantId, validatedData);
            return result;
        } catch (error) {
            if (error.issues && Array.isArray(error.issues)) {
                const errors = error.issues.map(err => ({
                    field: err.path.join('.'),
                    message: err.message
                }));
                validationErrors.value = errors;
                return { success: false, errors };
            }
            return { success: false, error: error.message };
        }
    };

    const deleteVariant = async (postId, variantId) => {
        const result = await store.deleteVariant(postId, variantId);
        return result;
    };

    const clearError = () => {
        store.clearError();
    };

    const clearValidationErrors = () => {
        validationErrors.value = [];
    };

    // Utilities
    const getVariantByChannel = (channelId) => {
        return variants.value.find(v => v.channel_id === channelId);
    };

    const getVariantsByPlatform = (platform) => {
        return variants.value.filter(v => v.platform === platform);
    };

    const hasVariantForChannel = (channelId) => {
        return variants.value.some(v => v.channel_id === channelId);
    };

    const getVariantStats = (variant) => {
        return {
            character_count: variant.character_count || 0,
            media_count: variant.media_urls?.length || 0,
            has_media: variant.hasMedia,
            platform: variant.platform,
            channel_name: variant.channelName
        };
    };

    return {
        
        // State
        variants,
        loading,
        error,
        validationErrors,

        // Actions
        loadVariants,
        createVariant,
        updateVariant,
        deleteVariant,
        clearError,
        clearValidationErrors,

        // Utilities
        getVariantByChannel,
        getVariantsByPlatform,
        hasVariantForChannel,
        getVariantStats
    };
}
