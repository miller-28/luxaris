/**
 * PostVariant Domain Model
 * Represents a platform-specific variation of a post
 */
export class PostVariant {
    
    constructor({
        id = null,
        post_id = null,
        channel_id = null,
        content = '',
        media_urls = [],
        platform_specific_data = {},
        character_count = 0,
        created_at = null,
        updated_at = null,
        deleted_at = null,
        // Populated from relations
        channel = null
    } = {}) {
        this.id = id;
        this.post_id = post_id;
        this.channel_id = channel_id;
        this.content = content;
        this.media_urls = Array.isArray(media_urls) ? media_urls : [];
        this.platform_specific_data = platform_specific_data || {};
        this.character_count = character_count;
        this.created_at = created_at;
        this.updated_at = updated_at;
        this.deleted_at = deleted_at;
        this.channel = channel;
    }

    /**
     * Get channel name
     */
    get channelName() {
        return this.channel?.name || 'None';
    }

    /**
     * Get channel platform
     */
    get platform() {
        return this.channel?.key || 'None';
    }

    /**
     * Calculate character count from content
     */
    get characterCount() {
        return this.content ? this.content.length : 0;
    }

    /**
     * Check if has media
     */
    get hasMedia() {
        return this.media_urls.length > 0;
    }

    /**
     * Check if soft deleted
     */
    get isDeleted() {
        return this.deleted_at !== null;
    }

    /**
     * Convert to API format
     */
    toApi() {
        return {
            channel_id: this.channel_id,
            content: this.content,
            media: {
                urls: this.media_urls
            },
            metadata: this.platform_specific_data
        };
    }

    /**
     * Create from API response
     */
    static fromApi(data) {
        return new PostVariant({
            id: data.id,
            post_id: data.post_id,
            channel_id: data.channel_id,
            content: data.content,
            media_urls: data.media?.urls || [],
            platform_specific_data: data.metadata || {},
            character_count: data.character_count || 0,
            created_at: data.created_at,
            updated_at: data.updated_at,
            deleted_at: data.deleted_at,
            channel: data.channel
        });
    }
}
