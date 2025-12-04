class PostTemplate {
  constructor(data) {
    this.id = data.id;
    this.owner_principal_id = data.owner_principal_id;
    this.name = data.name;
    this.description = data.description || null;
    this.template_body = data.template_body;
    this.default_channel_id = data.default_channel_id || null;
    this.constraints = typeof data.constraints === 'string' 
      ? JSON.parse(data.constraints) 
      : (data.constraints || {});
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  /**
   * Substitute placeholders in template body with provided values
   * @param {Object} values - Key-value pairs for placeholder substitution
   * @returns {string} - Rendered template body
   */
  render(values) {
    let rendered = this.template_body;
    
    // Replace {{placeholder}} with values
    for (const [key, value] of Object.entries(values)) {
      const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      rendered = rendered.replace(placeholder, value);
    }
    
    return rendered;
  }

  /**
   * Extract placeholder names from template body
   * @returns {string[]} - Array of placeholder names
   */
  get_placeholders() {
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
}

module.exports = PostTemplate;
