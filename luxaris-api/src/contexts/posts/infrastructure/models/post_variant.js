/**
 * PostVariant Domain Model
 * 
 * Channel-specific content variant of a post.
 * Each variant targets a specific channel with adapted content.
 */
class PostVariant {
	constructor(data) {
		this.id = data.id;
		this.post_id = data.post_id;
		this.channel_id = data.channel_id;
		this.channel_connection_id = data.channel_connection_id;
		this.content = data.content;
		this.media = data.media || {};
		this.tone = data.tone;
		this.source = data.source;
		this.status = data.status;
		this.metadata = data.metadata || {};
		this.created_at = data.created_at;
		this.updated_at = data.updated_at;
		this.published_at = data.published_at;
	}
}

module.exports = PostVariant;
