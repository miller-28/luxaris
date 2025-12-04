class GenerationSuggestion {
  constructor(data) {
    this.id = data.id;
    this.generation_session_id = data.generation_session_id;
    this.channel_id = data.channel_id;
    this.content = data.content;
    this.score = data.score ? parseFloat(data.score) : null;
    this.accepted = data.accepted || false;
    this.created_at = data.created_at;
  }
}

module.exports = GenerationSuggestion;
