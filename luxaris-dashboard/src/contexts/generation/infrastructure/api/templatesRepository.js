/**
 * Templates Repository
 * Handles all API calls for templates
 */
import { AbstractRepository } from '@/shared/api/AbstractRepository';
import { Template } from '../../domain/models/Template';

class TemplatesRepository extends AbstractRepository {
    
    constructor() {
        super('/templates');
    }

    /**
     * Get all templates
     * GET /api/v1/templates
     */
    async getAll(params = {}) {
        const cleanParams = this.cleanQueryParams(params);
        const response = await this.get('', { params: cleanParams });
        return {
            data: response.data.map(Template.fromAPI),
            meta: response.meta
        };
    }

    /**
     * Get template by ID
     * GET /api/v1/templates/:id
     */
    async getById(id) {
        const response = await this.get(`/${id}`);
        return Template.fromAPI(response.data);
    }

    /**
     * Create new template
     * POST /api/v1/templates
     */
    async create(templateData) {
        const response = await this.post('', templateData);
        return Template.fromAPI(response.data);
    }

    /**
     * Update template
     * PATCH /api/v1/templates/:id
     */
    async update(id, updates) {
        const response = await this.patch(`/${id}`, updates);
        return Template.fromAPI(response.data);
    }

    /**
     * Delete template
     * DELETE /api/v1/templates/:id
     */
    async remove(id) {
        return await this.delete(`/${id}`);
    }
}

export const templatesRepository = new TemplatesRepository();
