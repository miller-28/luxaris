const PostTemplate = require('../../infrastructure/models/post_template');

class PostTemplateService {
  constructor(post_template_repository, system_logger, event_registry) {
    this.template_repository = post_template_repository;
    this.logger = system_logger;
    this.event_registry = event_registry;
  }

  /**
   * Create a new template
   */
  async create_template(principal_id, template_data) {
    this.logger.info({ logger: 'Creating template' });

    // Validate required fields
    if (!template_data.name || !template_data.template_body) {
      throw new Error('TEMPLATE_NAME_AND_BODY_REQUIRED');
    }

    const template_record = await this.template_repository.create({
      owner_principal_id: principal_id,
      name: template_data.name,
      description: template_data.description,
      template_body: template_data.template_body,
      default_channel_id: template_data.default_channel_id,
      constraints: template_data.constraints || {}
    });

    const template = new PostTemplate(template_record);

    // Record event
    await this.event_registry.record_event({
      event_type: 'template',
      event_name: 'TEMPLATE_CREATED',
      entity_type: 'post_template',
      entity_id: template.id,
      principal_id,
      metadata: {
        name: template.name,
        has_default_channel: !!template.default_channel_id
      }
    });

    this.logger.info({ logger: 'Template created' });
    return template;
  }

  /**
   * Get template by ID
   */
  async get_template(principal_id, template_id) {
    const template_record = await this.template_repository.find_by_id(template_id);
    
    if (!template_record) {
      throw new Error('TEMPLATE_NOT_FOUND');
    }

    // Validate ownership
    if (template_record.owner_principal_id !== principal_id) {
      throw new Error('TEMPLATE_ACCESS_DENIED');
    }

    return new PostTemplate(template_record);
  }

  /**
   * List templates with optional filters
   */
  async list_templates(principal_id, filters = {}) {
    this.logger.info({ logger: 'Listing templates' });

    const template_records = await this.template_repository.list_by_owner(principal_id, filters);
    const total = await this.template_repository.count_by_owner(principal_id, filters);

    const templates = template_records.map(record => new PostTemplate(record));

    this.logger.info({ logger: 'Templates listed' });
    return { templates, total };
  }

  /**
   * Update template
   */
  async update_template(principal_id, template_id, updates) {
    this.logger.info({ logger: 'Updating template' });

    // Verify ownership
    const owner_id = await this.template_repository.get_owner_principal_id(template_id);
    if (!owner_id) {
      throw new Error('TEMPLATE_NOT_FOUND');
    }
    if (owner_id !== principal_id) {
      throw new Error('TEMPLATE_ACCESS_DENIED');
    }

    const template_record = await this.template_repository.update(template_id, updates);
    const template = new PostTemplate(template_record);

    // Record event
    await this.event_registry.record_event({
      event_type: 'template',
      event_name: 'TEMPLATE_UPDATED',
      entity_type: 'post_template',
      entity_id: template.id,
      principal_id,
      metadata: {
        updated_fields: Object.keys(updates)
      }
    });

    this.logger.info({ logger: 'Template updated' });
    return template;
  }

  /**
   * Delete template
   */
  async delete_template(principal_id, template_id) {
    this.logger.info({ logger: 'Deleting template' });

    // Verify ownership
    const owner_id = await this.template_repository.get_owner_principal_id(template_id);
    if (!owner_id) {
      throw new Error('TEMPLATE_NOT_FOUND');
    }
    if (owner_id !== principal_id) {
      throw new Error('TEMPLATE_ACCESS_DENIED');
    }

    await this.template_repository.delete(template_id);

    // Record event
    await this.event_registry.record_event({
      event_type: 'template',
      event_name: 'TEMPLATE_DELETED',
      entity_type: 'post_template',
      entity_id: template_id,
      principal_id,
      metadata: {}
    });

    this.logger.info({ logger: 'Template deleted' });
  }

  /**
   * Render template with placeholder values
   */
  async render_template(principal_id, template_id, values) {
    const template = await this.get_template(principal_id, template_id);
    
    // Get required placeholders
    const placeholders = template.get_placeholders();
    
    // Check if all required placeholders have values
    const missing_placeholders = placeholders.filter(p => !(p in values));
    if (missing_placeholders.length > 0) {
      throw new Error('MISSING_PLACEHOLDER_VALUES: ' + missing_placeholders.join(', '));
    }

    return {
      rendered_content: template.render(values),
      placeholders_used: placeholders
    };
  }
}

module.exports = PostTemplateService;
