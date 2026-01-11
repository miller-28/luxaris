import { defineStore } from 'pinia';
import { templatesRepository } from '../api/templatesRepository';
import { AbstractStore } from '@/shared/store/AbstractStore';

export const useTemplatesStore = defineStore('templates', {
    state: () => AbstractStore.mergeState({
        templates: [],
        currentTemplate: null,
        meta: {
            total: 0,
            limit: 20,
            offset: 0
        }
    }),

    getters: AbstractStore.mergeGetters({
        /**
         * Get template by ID
         */
        getTemplateById: (state) => (id) => {
            return state.templates.find(t => t.id === id);
        },

        /**
         * Get templates count
         */
        templatesCount: (state) => state.templates.length,

        /**
         * Check if templates are loaded
         */
        hasTemplates: (state) => state.templates.length > 0
    }),

    actions: AbstractStore.mergeActions({
        /**
         * Load all templates
         */
        async loadTemplates(params = {}) {
            this.loading = true;
            this.error = null;

            try {
                const response = await templatesRepository.getAll(params);
                this.templates = response.data;
                this.meta = response.meta;
            } catch (err) {
                this.error = err.response?.data?.errors?.[0]?.error_description || 'Failed to load templates';
                throw err;
            } finally {
                this.loading = false;
            }
        },

        /**
         * Load single template by ID
         */
        async loadTemplate(id) {
            this.loading = true;
            this.error = null;

            try {
                this.currentTemplate = await templatesRepository.getById(id);
            } catch (err) {
                this.error = err.response?.data?.errors?.[0]?.error_description || 'Failed to load template';
                throw err;
            } finally {
                this.loading = false;
            }
        },

        /**
         * Create new template
         */
        async createTemplate(templateData) {
            this.loading = true;
            this.error = null;

            try {
                const template = await templatesRepository.create(templateData);
                this.templates.unshift(template);
                this.meta.total++;
                return template;
            } catch (err) {
                this.error = err.response?.data?.errors?.[0]?.error_description || 'Failed to create template';
                throw err;
            } finally {
                this.loading = false;
            }
        },

        /**
         * Update template
         */
        async updateTemplate(id, updates) {
            this.loading = true;
            this.error = null;

            try {
                const template = await templatesRepository.update(id, updates);
                
                const index = this.templates.findIndex(t => t.id === id);
                if (index !== -1) {
                    this.templates[index] = template;
                }

                if (this.currentTemplate?.id === id) {
                    this.currentTemplate = template;
                }

                return template;
            } catch (err) {
                this.error = err.response?.data?.errors?.[0]?.error_description || 'Failed to update template';
                throw err;
            } finally {
                this.loading = false;
            }
        },

        /**
         * Delete template
         */
        async deleteTemplate(id) {
            this.loading = true;
            this.error = null;

            try {
                await templatesRepository.remove(id);
                
                this.templates = this.templates.filter(t => t.id !== id);
                this.meta.total--;

                if (this.currentTemplate?.id === id) {
                    this.currentTemplate = null;
                }
            } catch (err) {
                this.error = err.response?.data?.errors?.[0]?.error_description || 'Failed to delete template';
                throw err;
            } finally {
                this.loading = false;
            }
        },

        /**
         * Clear error
         */
        clearError() {
            this.error = null;
        },

        /**
         * Reset store
         */
        reset() {
            this.templates = [];
            this.currentTemplate = null;
            this.loading = false;
            this.error = null;
            this.meta = {
                total: 0,
                limit: 20,
                offset: 0
            };
        }
    })
});
