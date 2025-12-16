/**
 * PostVariant Domain Model
 * Represents a platform-specific variation of a post
 */
export class PostVariant {
    
    constructor({
        id = null,
        post_id = null,
        channel_connection_id = null,
        content = '',
        media_urls = [],
        platform_specific_data = {},
        character_count = 0,
        created_at = null,
        updated_at = null,
        deleted_at = null,
        // Populated from relations
        channel_connection = null
    } = {}) {
        this.id = id;
        this.post_id = post_id;
        this.channel_connection_id = channel_connection_id;
        this.content = content;
        this.media_urls = Array.isArray(media_urls) ? media_urls : [];
        this.platform_specific_data = platform_specific_data || {};
        this.character_count = character_count;
        this.created_at = created_at;
        this.updated_at = updated_at;
        this.deleted_at = deleted_at;
        this.channel_connection = channel_connection;
    }

    /**
     * Get channel name
     */
    get channelName() {
        return this.channel_connection?.channel?.name || 'Unknown';
    }

    /**
     * Get channel platform
     */
    get platform() {
        return this.channel_connection?.channel?.platform || 'unknown';
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
            channel_connection_id: this.channel_connection_id,
            content: this.content,
            media_urls: this.media_urls,
            platform_specific_data: this.platform_specific_data
        };
    }

    /**
     * Create from API response
     */
    static fromApi(data) {
        return new PostVariant({
            id: data.id,
            post_id: data.post_id,
            channel_connection_id: data.channel_connection_id,
            content: data.content,
            media_urls: data.media_urls || [],
            platform_specific_data: data.platform_specific_data || {},
            character_count: data.character_count || 0,
            created_at: data.created_at,
            updated_at: data.updated_at,
            deleted_at: data.deleted_at,
            channel_connection: data.channel_connection
        });
    }
}
