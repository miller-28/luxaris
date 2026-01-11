/**
 * Template Domain Model
 * Represents a reusable post template entity
 */
export class Template {
    
    constructor({
        id = null,
        owner_principal_id = null,
        name = '',
        description = null,
        template_body = '',
        default_channel_id = null,
        constraints = {},
        created_at = null,
        updated_at = null
    } = {}) {
        this.id = id;
        this.owner_principal_id = owner_principal_id;
        this.name = name;
        this.description = description;
        this.template_body = template_body;
        this.default_channel_id = default_channel_id;
        this.constraints = constraints || {};
        this.created_at = created_at;
        this.updated_at = updated_at;
    }

    /**
     * Extract placeholder names from template body
     * @returns {string[]} - Array of placeholder names
     */
    get placeholders() {
        const placeholderRegex = /\{\{(\w+)\}\}/g;
        const placeholders = [];
        let match;
    
        while ((match = placeholderRegex.exec(this.template_body)) !== null) {
            if (!placeholders.includes(match[1])) {
                placeholders.push(match[1]);
            }
        }
    
        return placeholders;
    }

    /**
     * Get character count of template body
     */
    get characterCount() {
        return this.template_body ? this.template_body.length : 0;
    }

    /**
     * Check if template has placeholders
     */
    get hasPlaceholders() {
        return this.placeholders.length > 0;
    }

    /**
     * Render template with provided values
     * @param {Object} values - Key-value pairs for placeholder substitution
     * @returns {string} - Rendered template body
     */
    render(values) {
        let rendered = this.template_body;
    
        for (const [key, value] of Object.entries(values)) {
            const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
            rendered = rendered.replace(placeholder, value);
        }
    
        return rendered;
    }

    /**
     * Convert to API format
     */
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            description: this.description,
            template_body: this.template_body,
            default_channel_id: this.default_channel_id,
            constraints: this.constraints
        };
    }

    /**
     * Create from API response
     */
    static fromAPI(data) {
        return new Template({
            id: data.id,
            owner_principal_id: data.owner_principal_id,
            name: data.name,
            description: data.description,
            template_body: data.template_body,
            default_channel_id: data.default_channel_id,
            constraints: data.constraints,
            created_at: data.created_at,
            updated_at: data.updated_at
        });
    }
}
