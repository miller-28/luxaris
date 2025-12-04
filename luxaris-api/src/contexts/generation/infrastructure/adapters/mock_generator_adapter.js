const GeneratorAdapter = require('./generator_adapter');

/**
 * Mock Generator Adapter
 * 
 * Simple implementation for testing and development.
 * Generates predictable content based on prompt.
 */
class MockGeneratorAdapter extends GeneratorAdapter {
  constructor() {
    super();
    this.call_count = 0;
  }

  /**
   * Generate mock content suggestions
   */
  async generate_content(params) {
    this.call_count++;
    
    const { prompt, channel_id, channel_constraints, template_body, constraints, count = 3 } = params;
    const max_length = channel_constraints?.max_length || constraints?.max_length || 280;
    
    const suggestions = [];
    
    for (let i = 0; i < count; i++) {
      let content;
      
      if (template_body) {
        // Generate based on template
        content = `${template_body} [Generated variant ${i + 1}]`;
      } else {
        // Generate from prompt
        content = `${prompt} - Generated content variant ${i + 1} for channel ${channel_id}`;
      }
      
      // Truncate to max length if needed
      if (content.length > max_length) {
        content = content.substring(0, max_length - 3) + '...';
      }
      
      // Assign scores (higher for earlier suggestions)
      const score = 100 - (i * 10);
      
      suggestions.push({
        content,
        score
      });
    }
    
    return suggestions;
  }

  /**
   * Get call count for testing
   */
  get_call_count() {
    return this.call_count;
  }

  /**
   * Reset call count
   */
  reset_call_count() {
    this.call_count = 0;
  }
}

module.exports = MockGeneratorAdapter;
