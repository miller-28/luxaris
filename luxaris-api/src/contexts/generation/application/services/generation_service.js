const GenerationSession = require('../../infrastructure/models/generation_session');
const GenerationSuggestion = require('../../infrastructure/models/generation_suggestion');

class GenerationService {
  constructor(
    generation_session_repository,
    generation_suggestion_repository,
    post_template_repository,
    post_service,
    post_variant_service,
    channel_service,
    generator_adapter,
    system_logger,
    event_registry
  ) {
    this.session_repository = generation_session_repository;
    this.suggestion_repository = generation_suggestion_repository;
    this.template_repository = post_template_repository;
    this.post_service = post_service;
    this.variant_service = post_variant_service;
    this.channel_service = channel_service;
    this.generator = generator_adapter;
    this.logger = system_logger;
    this.event_registry = event_registry;
  }

  /**
   * Create a generation session and generate suggestions
   */
  async generate_suggestions(principal_id, generation_params) {
    this.logger.info({ logger: 'Starting generation session' });

    const { prompt, template_id, post_id, channel_ids, constraints } = generation_params;

    // Validate prompt
    if (!prompt || prompt.trim().length === 0) {
      throw new Error('PROMPT_REQUIRED');
    }

    // Validate channel IDs
    if (!channel_ids || channel_ids.length === 0) {
      throw new Error('CHANNEL_IDS_REQUIRED');
    }

    // Validate template if provided
    let template = null;
    if (template_id) {
      const template_record = await this.template_repository.find_by_id(template_id);
      if (!template_record) {
        throw new Error('TEMPLATE_NOT_FOUND');
      }
      if (template_record.owner_principal_id !== principal_id) {
        throw new Error('TEMPLATE_ACCESS_DENIED');
      }
      const PostTemplate = require('../infrastructure/models/post_template');
      template = new PostTemplate(template_record);
    }

    // Validate post if provided
    if (post_id) {
      const post = await this.post_service.get_post(principal_id, post_id);
      if (!post) {
        throw new Error('POST_NOT_FOUND');
      }
    }

    // Create generation session
    const session_record = await this.session_repository.create({
      owner_principal_id: principal_id,
      post_id: post_id || null,
      template_id: template_id || null,
      prompt,
      status: 'in_progress'
    });

    const session = new GenerationSession(session_record);

    // Record event
    await this.event_registry.record_event({
      event_type: 'generation',
      event_name: 'GENERATION_STARTED',
      entity_type: 'generation_session',
      entity_id: session.id,
      principal_id,
      metadata: {
        channel_count: channel_ids.length,
        has_template: !!template_id,
        has_post: !!post_id
      }
    });

    try {
      // Generate suggestions for each channel
      const all_suggestions = [];

      for (const channel_id of channel_ids) {
        // Get channel constraints
        const channel = await this.channel_service.get_channel(channel_id);
        const channel_constraints = channel.constraints || {};

        // Generate content using AI adapter
        const generated_content = await this.generator.generate_content({
          prompt,
          channel_id,
          channel_constraints,
          template_body: template?.template_body,
          constraints,
          count: constraints?.suggestions_per_channel || 3
        });

        // Store suggestions
        for (const item of generated_content) {
          const suggestion_data = {
            generation_session_id: session.id,
            channel_id,
            content: item.content,
            score: item.score || null,
            accepted: false
          };

          const suggestion_record = await this.suggestion_repository.create(suggestion_data);
          all_suggestions.push(new GenerationSuggestion(suggestion_record));
        }
      }

      // Mark session as completed
      await this.session_repository.update_status(session.id, 'completed');
      session.status = 'completed';

      // Record completion event
      await this.event_registry.record_event({
        event_type: 'generation',
        event_name: 'GENERATION_COMPLETED',
        entity_type: 'generation_session',
        entity_id: session.id,
        principal_id,
        metadata: {
          suggestions_count: all_suggestions.length,
          status: 'completed'
        }
      });

      this.logger.info({ logger: 'Generation session completed' });

      return {
        session,
        suggestions: all_suggestions
      };

    } catch (error) {
      // Mark session as aborted on error
      await this.session_repository.update_status(session.id, 'aborted');

      this.logger.error({ logger: 'Generation session aborted', error: error.message });

      throw new Error('GENERATION_FAILED: ' + error.message);
    }
  }

  /**
   * Get generation session with suggestions
   */
  async get_session(principal_id, session_id) {
    const session_record = await this.session_repository.find_by_id(session_id);

    if (!session_record) {
      throw new Error('SESSION_NOT_FOUND');
    }

    // Validate ownership
    if (session_record.owner_principal_id !== principal_id) {
      throw new Error('SESSION_ACCESS_DENIED');
    }

    const session = new GenerationSession(session_record);

    // Get suggestions for this session
    const suggestion_records = await this.suggestion_repository.list_by_session(session_id);
    const suggestions = suggestion_records.map(record => new GenerationSuggestion(record));

    return {
      session,
      suggestions
    };
  }

  /**
   * List generation sessions
   */
  async list_sessions(principal_id, filters = {}) {
    this.logger.info({ logger: 'Listing generation sessions' });

    const session_records = await this.session_repository.list_by_owner(principal_id, filters);
    const total = await this.session_repository.count_by_owner(principal_id, filters);

    const sessions = session_records.map(record => new GenerationSession(record));

    this.logger.info({ logger: 'Generation sessions listed' });
    return { sessions, total };
  }

  /**
   * Accept a suggestion and create post/variant
   */
  async accept_suggestion(principal_id, suggestion_id, options = {}) {
    this.logger.info({ logger: 'Accepting suggestion' });

    // Get suggestion
    const suggestion_record = await this.suggestion_repository.find_by_id(suggestion_id);
    if (!suggestion_record) {
      throw new Error('SUGGESTION_NOT_FOUND');
    }

    // Get session to verify ownership
    const session_record = await this.session_repository.find_by_id(suggestion_record.generation_session_id);
    if (!session_record || session_record.owner_principal_id !== principal_id) {
      throw new Error('SUGGESTION_ACCESS_DENIED');
    }

    // Check if already accepted
    if (suggestion_record.accepted) {
      throw new Error('SUGGESTION_ALREADY_ACCEPTED');
    }

    // Mark suggestion as accepted
    await this.suggestion_repository.mark_as_accepted(suggestion_id);

    const suggestion = new GenerationSuggestion(suggestion_record);

    // Create post variant from suggestion
    let post_id = session_record.post_id;
    let post = null;

    // If no post exists, create one
    if (!post_id) {
      const post_data = {
        title: options.title || 'Generated Post',
        base_content: suggestion.content,
        tags: options.tags || []
      };
      // Create a principal object for post_service (which expects principal.id, not just principal_id)
      const principal = { id: principal_id };
      post = await this.post_service.create_post(principal, post_data);
      post_id = post.id;
    }

    // Create post variant with the suggestion content
    const variant_data = {
      post_id,
      channel_id: suggestion.channel_id,
      content: suggestion.content,
      tone: options.tone,
      media: options.media,
      source: 'generated'
    };

    // Create a principal object for variant_service (which expects principal.id, not just principal_id)
    const principal = { id: principal_id };
    const variant = await this.variant_service.create_variant(principal, variant_data);

    // Record event
    await this.event_registry.record_event({
      event_type: 'generation',
      event_name: 'SUGGESTION_ACCEPTED',
      entity_type: 'generation_suggestion',
      entity_id: suggestion_id,
      principal_id,
      metadata: {
        session_id: session_record.id,
        post_id,
        variant_id: variant.id,
        created_new_post: !session_record.post_id
      }
    });

    this.logger.info({ logger: 'Suggestion accepted and variant created' });

    return {
      suggestion: new GenerationSuggestion({ ...suggestion_record, accepted: true }),
      post,
      variant
    };
  }

  /**
   * Delete a generation session
   */
  async delete_session(principal_id, session_id) {
    this.logger.info({ logger: 'Deleting generation session' });

    // Verify ownership
    const owner_id = await this.session_repository.get_owner_principal_id(session_id);
    if (!owner_id) {
      throw new Error('SESSION_NOT_FOUND');
    }
    if (owner_id !== principal_id) {
      throw new Error('SESSION_ACCESS_DENIED');
    }

    await this.session_repository.delete(session_id);

    this.logger.info({ logger: 'Generation session deleted' });
  }
}

module.exports = GenerationService;
