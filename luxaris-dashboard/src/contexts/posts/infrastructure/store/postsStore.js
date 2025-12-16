/**
 * Posts Store
 * Pinia store for managing posts state
 */
import { defineStore } from 'pinia';
import { postsRepository } from '../api/postsRepository';
import { variantsRepository } from '../api/variantsRepository';
import { Post } from '../../domain/models/Post';
import { PostVariant } from '../../domain/models/PostVariant';

export const usePostsStore = defineStore('posts', {

    state: () => ({
        posts: [],
        currentPost: null,
        variants: [],
        loading: false,
        error: null,
        filters: {
            status: null,
            tags: [],
            search: ''
        },
        pagination: {
            page: 1,
            limit: 20,
            total: 0
        }
    }),

    getters: {
        /**
         * Get post by ID
         */
        getPostById: (state) => (id) => {
            return state.posts.find(post => post.id === id);
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
         * Load posts with filters
         */
        async loadPosts(filters = {}, resetPage = false) {
            this.loading = true;
            this.error = null;

            // Update store filters with new values
            this.filters = { ...this.filters, ...filters };

            if (resetPage) {
                this.pagination.page = 1;
            }

            try {
                const response = await postsRepository.list(
                    this.filters,
                    {
                        offset: (this.pagination.page - 1) * this.pagination.limit,
                        limit: this.pagination.limit
                    }
                );

                this.posts = (response.data || []).map(post => Post.fromApi(post));
                this.pagination.total = response.pagination?.total || this.posts.length;
                
                return { success: true };
            } catch (error) {
                console.error('[Posts Store] Load posts failed:', error);
                this.error = error.response?.data?.errors?.[0]?.error_description || 'Failed to load posts';
                return { success: false, error: this.error };
            } finally {
                this.loading = false;
            }
        },

        /**
         * Load single post by ID
         */
        async loadPost(id) {
            this.loading = true;
            this.error = null;

            try {
                const response = await postsRepository.getById(id);
                this.currentPost = Post.fromApi(response.data);
                
                // Load variants for this post
                await this.loadVariants(id);
                
                return { success: true, post: this.currentPost };
            } catch (error) {
                console.error('[Posts Store] Load post failed:', error);
                this.error = error.response?.data?.errors?.[0]?.error_description || 'Failed to load post';
                return { success: false, error: this.error };
            } finally {
                this.loading = false;
            }
        },

        /**
         * Create new post
         */
        async createPost(postData) {
            this.loading = true;
            this.error = null;

            try {
                const response = await postsRepository.create(postData);
                const newPost = Post.fromApi(response.data);
                
                this.posts.unshift(newPost);
                this.currentPost = newPost;
                
                return { success: true, post: newPost };
            } catch (error) {
                console.error('[Posts Store] Create post failed:', error);
                this.error = error.response?.data?.errors?.[0]?.error_description || 'Failed to create post';
                return { success: false, error: this.error };
            } finally {
                this.loading = false;
            }
        },

        /**
         * Update existing post
         */
        async updatePost(id, postData) {
            this.loading = true;
            this.error = null;

            try {
                const response = await postsRepository.update(id, postData);
                const updatedPost = Post.fromApi(response.data);
                
                // Update in posts array
                const index = this.posts.findIndex(p => p.id === id);
                if (index !== -1) {
                    this.posts[index] = updatedPost;
                }
                
                // Update current post if it's the one being edited
                if (this.currentPost?.id === id) {
                    this.currentPost = updatedPost;
                }
                
                return { success: true, post: updatedPost };
            } catch (error) {
                console.error('[Posts Store] Update post failed:', error);
                this.error = error.response?.data?.errors?.[0]?.error_description || 'Failed to update post';
                return { success: false, error: this.error };
            } finally {
                this.loading = false;
            }
        },

        /**
         * Delete post
         */
        async deletePost(id) {
            this.loading = true;
            this.error = null;

            try {
                await postsRepository.remove(id);
                
                // Remove from posts array
                this.posts = this.posts.filter(p => p.id !== id);
                
                // Clear current post if it's the one being deleted
                if (this.currentPost?.id === id) {
                    this.currentPost = null;
                }
                
                return { success: true };
            } catch (error) {
                console.error('[Posts Store] Delete post failed:', error);
                this.error = error.response?.data?.errors?.[0]?.error_description || 'Failed to delete post';
                return { success: false, error: this.error };
            } finally {
                this.loading = false;
            }
        },

        /**
         * Load variants for a post
         */
        async loadVariants(postId) {
            try {
                const response = await variantsRepository.list(postId);
                this.variants = (response.data || []).map(variant => PostVariant.fromApi(variant));
                return { success: true, variants: this.variants };
            } catch (error) {
                console.error('[Posts Store] Load variants failed:', error);
                this.error = error.response?.data?.errors?.[0]?.error_description || 'Failed to load variants';
                return { success: false, error: this.error };
            }
        },

        /**
         * Create variant
         */
        async createVariant(postId, variantData) {
            this.loading = true;
            this.error = null;

            try {
                const response = await variantsRepository.create(postId, variantData);
                const newVariant = PostVariant.fromApi(response.data);
                
                this.variants.push(newVariant);
                
                return { success: true, variant: newVariant };
            } catch (error) {
                console.error('[Posts Store] Create variant failed:', error);
                this.error = error.response?.data?.errors?.[0]?.error_description || 'Failed to create variant';
                return { success: false, error: this.error };
            } finally {
                this.loading = false;
            }
        },

        /**
         * Update variant
         */
        async updateVariant(postId, variantId, variantData) {
            this.loading = true;
            this.error = null;

            try {
                const response = await variantsRepository.update(postId, variantId, variantData);
                const updatedVariant = PostVariant.fromApi(response.data);
                
                const index = this.variants.findIndex(v => v.id === variantId);
                if (index !== -1) {
                    this.variants[index] = updatedVariant;
                }
                
                return { success: true, variant: updatedVariant };
            } catch (error) {
                console.error('[Posts Store] Update variant failed:', error);
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
                console.error('[Posts Store] Delete variant failed:', error);
                this.error = error.response?.data?.errors?.[0]?.error_description || 'Failed to delete variant';
                return { success: false, error: this.error };
            } finally {
                this.loading = false;
            }
        },

        /**
         * Update filters
         */
        setFilters(filters) {
            this.filters = { ...this.filters, ...filters };
        },

        /**
         * Clear filters
         */
        clearFilters() {
            this.filters = {
                status: null,
                tags: [],
                search: ''
            };
        },

        /**
         * Set pagination
         */
        setPagination(pagination) {
            this.pagination = { ...this.pagination, ...pagination };
        },

        /**
         * Clear error
         */
        clearError() {
            this.error = null;
        },

        /**
         * Clear current post
         */
        clearCurrentPost() {
            this.currentPost = null;
            this.variants = [];
        }
    }
});
