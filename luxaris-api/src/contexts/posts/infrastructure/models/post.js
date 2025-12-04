/**
 * Post Domain Model
 * 
 * Platform-agnostic content representation.
 * Posts can have multiple variants for different channels.
 */
class Post {
    constructor(data) {
        this.id = data.id;
        this.owner_principal_id = data.owner_principal_id;
        this.title = data.title;
        this.base_content = data.base_content;
        this.tags = data.tags || [];
        this.status = data.status;
        this.metadata = data.metadata || {};
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
        this.published_at = data.published_at;
    }
}

module.exports = Post;
