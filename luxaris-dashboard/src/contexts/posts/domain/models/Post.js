/**
 * Post Domain Model
 * Represents a social media post entity
 */
export class Post {
    
    constructor({
        id = null,
        user_id = null,
        title = '',
        description = null,
        tags = [],
        status = 'draft',
        metadata = {}
    } = {}) {
        this.id = id;
        this.user_id = user_id;
        this.title = title;
        this.description = description;
        this.tags = Array.isArray(tags) ? tags : [];
        this.status = status;
        this.metadata = metadata || {};
    }

    /**
     * Check if post is published
     */
    get isPublished() {
        return this.status === 'published';
    }

    /**
     * Check if post is draft
     */
    get isDraft() {
        return this.status === 'draft';
    }

    /**
     * Check if post is soft deleted
     */
    get isDeleted() {
        return this.deleted_at !== null;
    }

    /**
     * Convert to API format
     */
    toApi() {
        return {
            title: this.title,
            description: this.description || null,
            tags: this.tags,
            status: this.status
        };
    }

    /**
     * Create from API response
     */
    static fromApi(data) {
        return new Post({
            id: data.id,
            user_id: data.user_id,
            title: data.title,
            description: data.description,
            tags: data.tags || [],
            status: data.status
        });
    }
}
