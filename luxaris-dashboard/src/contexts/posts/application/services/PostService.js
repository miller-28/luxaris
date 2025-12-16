/**
 * Post Service
 * Business logic layer for posts operations
 */
import { PostCreateSchema, PostUpdateSchema } from '../../domain/rules/postSchemas';

export class PostService {

    /**
     * Validate post creation data
     */
    static validateCreate(data) {
        try {
            return {
                success: true,
                data: PostCreateSchema.parse(data)
            };
        } catch (error) {
            return {
                success: false,
                errors: error.errors?.map(err => ({
                    field: err.path.join('.'),
                    message: err.message
                })) || [{ field: 'general', message: error.message || 'Validation failed' }]
            };
        }
    }

    /**
     * Validate post update data
     */
    static validateUpdate(data) {
        try {
            return {
                success: true,
                data: PostUpdateSchema.parse(data)
            };
        } catch (error) {
            return {
                success: false,
                errors: error.errors?.map(err => ({
                    field: err.path.join('.'),
                    message: err.message
                })) || [{ field: 'general', message: error.message || 'Validation failed' }]
            };
        }
    }

    /**
     * Prepare post data for creation
     */
    static prepareCreateData(formData) {
        const trimmedContent = formData.description?.trim() || '';
        return {
            title: formData.title.trim(),
            description: trimmedContent || null,
            tags: formData.tags || [],
            status: formData.status || 'draft',
            metadata: formData.metadata || {}
        };
    }

    /**
     * Prepare post data for update
     */
    static prepareUpdateData(formData) {
        const updateData = {};

        if (formData.title !== undefined) {
            updateData.title = formData.title.trim();
        }

        if (formData.description !== undefined) {
            updateData.description = formData.description?.trim() || null;
        }

        if (formData.tags !== undefined) {
            updateData.tags = formData.tags;
        }

        if (formData.status !== undefined) {
            updateData.status = formData.status;
        }

        if (formData.metadata !== undefined) {
            updateData.metadata = formData.metadata;
        }

        return updateData;
    }

    /**
     * Calculate post statistics
     */
    static calculateStats(post) {
        return {
            word_count: post.description ? post.description.split(/\s+/).length : 0,
            character_count: post.description?.length || 0,
            tag_count: post.tags?.length || 0,
            has_content: !!post.description,
            is_complete: !!(post.title && post.description)
        };
    }

    /**
     * Check if post can be published
     * Note: Error messages should be translated in the UI layer using i18n keys:
     * - posts.errors.titleRequired
     * - posts.errors.descriptionRequired
     */
    static canPublish(post) {
        return {
            can_publish: !!(post.title && post.description),
            reasons: [
                !post.title && 'posts.errors.titleRequired',
                !post.description && 'posts.errors.descriptionRequired'
            ].filter(Boolean)
        };
    }

    /**
     * Format post for display
     * Note: Status text should be translated in the UI layer using i18n keys:
     * - posts.status.draft
     * - posts.status.published
     */
    static formatForDisplay(post) {
        return {
            ...post,
            formatted_created_at: new Date(post.created_at).toLocaleString(),
            formatted_updated_at: new Date(post.updated_at).toLocaleString(),
            excerpt: post.description ? post.description.substring(0, 150) + '...' : '',
            status_badge: {
                draft: { color: 'grey', text: 'posts.status.draft' },
                published: { color: 'success', text: 'posts.status.published' }
            }[post.status]
        };
    }

    /**
     * Search posts by query
     */
    static searchPosts(posts, query) {
        if (!query || !query.trim()) {
            return posts;
        }

        const searchTerm = query.toLowerCase().trim();
        
        return posts.filter(post => {
            return post.title.toLowerCase().includes(searchTerm) ||
                   post.description?.toLowerCase().includes(searchTerm) ||
                   post.tags?.some(tag => tag.toLowerCase().includes(searchTerm));
        });
    }

    /**
     * Filter posts by status
     */
    static filterByStatus(posts, status) {
        if (!status) {
            return posts;
        }

        return posts.filter(post => post.status === status);
    }

    /**
     * Filter posts by tags
     */
    static filterByTags(posts, tags) {
        if (!tags || tags.length === 0) {
            return posts;
        }

        return posts.filter(post => {
            return tags.some(tag => post.tags?.includes(tag));
        });
    }

    /**
     * Sort posts
     */
    static sortPosts(posts, sortBy = 'created_at', order = 'desc') {
        const sorted = [...posts].sort((a, b) => {
            let aVal = a[sortBy];
            let bVal = b[sortBy];

            if (sortBy === 'created_at' || sortBy === 'updated_at') {
                aVal = new Date(aVal).getTime();
                bVal = new Date(bVal).getTime();
            }

            if (order === 'asc') {
                return aVal > bVal ? 1 : -1;
            } else {
                return aVal < bVal ? 1 : -1;
            }
        });

        return sorted;
    }
}
