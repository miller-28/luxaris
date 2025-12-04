class GenerationSession {
  constructor(data) {
    this.id = data.id;
    this.owner_principal_id = data.owner_principal_id;
    this.post_id = data.post_id || null;
    this.template_id = data.template_id || null;
    this.prompt = data.prompt;
    this.status = data.status || 'in_progress';
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }
}

module.exports = GenerationSession;
