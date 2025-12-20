/**
 * Post Variants Store
 * Pinia store for managing post variants state
 */
import { defineStore } from 'pinia';
import { variantsRepository } from '../api/variantsRepository';
import { PostVariant } from '../../domain/models/PostVariant';

export const usePostVariantsStore = defineStore('postVariants', {

    state: () => ({
        variants: [],
        loading: false,
        error: null
    }),

    getters: {
        /**
         * Get variant by ID
         */
        getVariantById: (state) => (id) => {
            return state.variants.find(variant => variant.id === id);
        },

        /**
         * Get variants by channel ID
         */
        getVariantsByChannel: (state) => (channelId) => {
            return state.variants.filter(v => v.channel_id === channelId);
        },

        /**
         * Get variants by platform
         */
        getVariantsByPlatform: (state) => (platform) => {
            return state.variants.filter(v => v.platform === platform);
        },

        /**
         * Check if has variant for channel
         */
        hasVariantForChannel: (state) => (channelId) => {
            return state.variants.some(v => v.channel_id === channelId);
        },

        /**
         * Check if loading
         */
        isLoading: (state) => state.loading,

        /**
         * Check if has error
         */
        hasError: (state) => !!state.error
    },

    actions: {

        /**
         * Transform frontend variant data to API format
         * @private
         */
        _transformVariantDataForApi(variantData) {
            const apiData = { ...variantData };
            
            // Transform media_urls array to media object
            if (variantData.media_urls !== undefined) {
                apiData.media = {
                    urls: variantData.media_urls
                };
                delete apiData.media_urls;
            }
            
            // Transform platform_specific_data to metadata
            if (variantData.platform_specific_data !== undefined) {
                apiData.metadata = variantData.platform_specific_data;
                delete apiData.platform_specific_data;
            }
            
            return apiData;
        },

        /**
         * Load variants for a post
         */
        async loadVariants(postId) {
            this.loading = true;
            this.error = null;

            try {
                const response = await variantsRepository.list(postId);
                this.variants = (response.data || []).map(variant => PostVariant.fromApi(variant));
                return { success: true, variants: this.variants };
            } catch (error) {
                console.error('[Post Variants Store] Load variants failed:', error);
                this.error = error.response?.data?.errors?.[0]?.error_description || 'Failed to load variants';
                return { success: false, error: this.error };
            } finally {
                this.loading = false;
            }
        },

        /**
         * Create variant
         */
        async createVariant(postId, variantData) {
            this.loading = true;
            this.error = null;

            try {
                const apiData = this._transformVariantDataForApi(variantData);
                const response = await variantsRepository.create(postId, apiData);
                const newVariant = PostVariant.fromApi(response.data);
                
                this.variants.push(newVariant);
                
                return { success: true, variant: newVariant };
            } catch (error) {
                console.error('[Post Variants Store] Create variant failed:', error);
                this.error = error.response?.data?.errors?.[0]?.error_description || 'Failed to create variant';
                return { success: false, error: this.error };
            } finally {
                this.loading = false;
            }
        },

        /**
         * Update variant
         */
        async updateVariant(variantId, variantData) {
            this.loading = true;
            this.error = null;

            try {
                const apiData = this._transformVariantDataForApi(variantData);
                const response = await variantsRepository.update(variantId, apiData);
                const updatedVariant = PostVariant.fromApi(response.data);
                
                const index = this.variants.findIndex(v => v.id === variantId);
                if (index !== -1) {
                    this.variants[index] = updatedVariant;
                }
                
                return { success: true, variant: updatedVariant };
            } catch (error) {
                console.error('[Post Variants Store] Update variant failed:', error);
                this.error = error.response?.data?.errors?.[0]?.error_description || 'Failed to update variant';
                return { success: false, error: this.error };
            } finally {
                this.loading = false;
            }
        },

        /**
         * Delete variant
         */
        async deleteVariant(postId, variantId) {
            this.loading = true;
            this.error = null;

            try {
                await variantsRepository.remove(postId, variantId);
                
                this.variants = this.variants.filter(v => v.id !== variantId);
                
                return { success: true };
            } catch (error) {
                console.error('[Post Variants Store] Delete variant failed:', error);
                this.error = error.response?.data?.errors?.[0]?.error_description || 'Failed to delete variant';
                return { success: false, error: this.error };
            } finally {
                this.loading = false;
            }
        },

        /**
         * Clear error
         */
        clearError() {
            this.error = null;
        },

        /**
         * Clear variants
         */
        clearVariants() {
            this.variants = [];
        }
    }
});
