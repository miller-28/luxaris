/**
 * usePosts Composable
 * Vue composable for posts operations
 */
import { computed, ref } from 'vue';
import { usePostsStore } from '../../infrastructure/store/postsStore';
import { PostService } from '../services/PostService';

export function usePosts() {

    const store = usePostsStore();
    const validationErrors = ref([]);

    // State
    const posts = computed(() => store.posts);
    const currentPost = computed(() => store.currentPost);
    const loading = computed(() => store.loading);
    const error = computed(() => store.error);
    const filters = computed(() => store.filters);
    const pagination = computed(() => store.pagination);

    // Actions
    const loadPosts = async (filters = {}, resetPage = false) => {
        const result = await store.loadPosts(filters, resetPage);
        return result;
    };

    const loadPost = async (id) => {
        const result = await store.loadPost(id);
        return result;
    };

    const createPost = async (postData) => {
        validationErrors.value = [];

        // Prepare data first (transform form fields to API fields)
        const preparedData = PostService.prepareCreateData(postData);

        // Validate prepared data
        const validation = PostService.validateCreate(preparedData);
        if (!validation.success) {
            validationErrors.value = validation.errors;
            return { success: false, errors: validation.errors };
        }

        // Create
        const result = await store.createPost(validation.data);
        return result;
    };

    const updatePost = async (id, postData) => {
        validationErrors.value = [];

        // Prepare data first (transform form fields to API fields)
        const preparedData = PostService.prepareUpdateData(postData);

        // Validate prepared data
        const validation = PostService.validateUpdate(preparedData);
        if (!validation.success) {
            validationErrors.value = validation.errors;
            return { success: false, errors: validation.errors };
        }

        // Update
        const result = await store.updatePost(id, validation.data);
        return result;
    };

    const deletePost = async (id) => {
        const result = await store.deletePost(id);
        return result;
    };

    const publishPost = async (id) => {
        const post = store.getPostById(id);
        
        if (!post) {
            return { success: false, error: 'Post not found' };
        }

        const canPublish = PostService.canPublish(post);
        if (!canPublish.can_publish) {
            return { 
                success: false, 
                error: 'Cannot publish post',
                reasons: canPublish.reasons
            };
        }

        return await updatePost(id, { status: 'published' });
    };

    const unpublishPost = async (id) => {
        return await updatePost(id, { status: 'draft' });
    };

    const setFilters = (newFilters) => {
        store.setFilters(newFilters);
    };

    const clearFilters = () => {
        store.clearFilters();
    };

    const clearError = () => {
        store.clearError();
    };

    const clearValidationErrors = () => {
        validationErrors.value = [];
    };

    const clearCurrentPost = () => {
        store.clearCurrentPost();
    };

    // Utilities
    const getPostStats = (post) => {
        return PostService.calculateStats(post);
    };

    const formatPostForDisplay = (post) => {
        return PostService.formatForDisplay(post);
    };

    const searchPosts = (query) => {
        return PostService.searchPosts(posts.value, query);
    };

    const sortPosts = (sortBy, order) => {
        return PostService.sortPosts(posts.value, sortBy, order);
    };

    return {

        // State
        posts,
        currentPost,
        loading,
        error,
        filters,
        pagination,
        validationErrors,

        // Actions
        loadPosts,
        loadPost,
        createPost,
        updatePost,
        deletePost,
        publishPost,
        unpublishPost,
        setFilters,
        clearFilters,
        clearError,
        clearValidationErrors,
        clearCurrentPost,

        // Utilities
        getPostStats,
        formatPostForDisplay,
        searchPosts,
        sortPosts
    };
}
