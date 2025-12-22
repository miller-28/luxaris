/**
 * Posts Store
 * Pinia store for managing posts state
 */
import { defineStore } from 'pinia';
import { postsRepository } from '../api/postsRepository';
import { Post } from '../../domain/models/Post';
import { AbstractStore } from '@/shared/store/AbstractStore';

export const usePostsStore = defineStore('posts', {

    state: () => AbstractStore.mergeState({
        posts: [],
        currentPost: null,
        filters: {
            status: null,
            tags: [],
            search: ''
        },
        pagination: {
            page: 1,
            limit: 10,
            total: 0
        }
    }),

    getters: AbstractStore.mergeGetters({
        /**
         * Get post by ID
         */
        getPostById: (state) => (id) => {
            return state.posts.find(post => post.id === id);
        }
    }),

    actions: AbstractStore.mergeActions({

        /**
         * Load posts with filters
         */
        async loadPosts(filters = {}, resetPage = false) {
            this.loading = true;
            this.error = null;

            // Update store filters with new values
            this.filters = { ...this.filters, ...filters };

            // Resolve pagination values
            const requestedLimit = filters.per_page ?? this.pagination.limit;
            const requestedPage = resetPage ? 1 : (filters.page ?? this.pagination.page);

            this.pagination.limit = requestedLimit;
            this.pagination.page = requestedPage;

            try {
                const offset = (this.pagination.page - 1) * this.pagination.limit;

                const response = await postsRepository.list(
                    this.filters,
                    {
                        page: this.pagination.page,
                        per_page: this.pagination.limit,
                        offset,
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
         * Clear current post
         */
        clearCurrentPost() {
            this.currentPost = null;
        }
    }, 'id')
});
