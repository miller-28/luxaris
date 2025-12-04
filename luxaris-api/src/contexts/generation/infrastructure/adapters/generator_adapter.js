/**
 * Generator Adapter Interface
 * 
 * Provides abstraction for AI content generation services.
 * Implementations can use OpenAI, Claude, or other AI providers.
 */
class GeneratorAdapter {
    /**
   * Generate content based on prompt and parameters
   * 
   * @param {Object} params - Generation parameters
   * @param {string} params.prompt - User's high-level request
   * @param {string} params.channel_id - Target channel ID
   * @param {Object} params.channel_constraints - Channel-specific limits (max_length, etc.)
   * @param {string} [params.template_body] - Optional template to base generation on
   * @param {Object} [params.constraints] - Additional generation constraints
   * @param {number} [params.count] - Number of suggestions to generate (default: 3)
   * @returns {Promise<Array>} - Array of {content, score} objects
   */
    async generate_content(params) {
        throw new Error('generate_content must be implemented by subclass');
    }
}

module.exports = GeneratorAdapter;
