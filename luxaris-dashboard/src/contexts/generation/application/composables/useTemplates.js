import { computed } from 'vue';
import { useTemplatesStore } from '../../infrastructure/store/templatesStore';

/**
 * Templates Composable
 * Provides reactive state and methods for templates
 */
export function useTemplates() {
    const store = useTemplatesStore();

    const templates = computed(() => store.templates);
    const currentTemplate = computed(() => store.currentTemplate);
    const loading = computed(() => store.loading);
    const error = computed(() => store.error);
    const meta = computed(() => store.meta);
    const hasTemplates = computed(() => store.hasTemplates);

    const loadTemplates = async (params = {}) => {
        await store.loadTemplates(params);
    };

    const loadTemplate = async (id) => {
        await store.loadTemplate(id);
    };

    const createTemplate = async (templateData) => {
        return await store.createTemplate(templateData);
    };

    const updateTemplate = async (id, updates) => {
        return await store.updateTemplate(id, updates);
    };

    const deleteTemplate = async (id) => {
        await store.deleteTemplate(id);
    };

    const clearError = () => {
        store.clearError();
    };

    const getTemplateById = (id) => {
        return store.getTemplateById(id);
    };

    return {
        templates,
        currentTemplate,
        loading,
        error,
        meta,
        hasTemplates,
        loadTemplates,
        loadTemplate,
        createTemplate,
        updateTemplate,
        deleteTemplate,
        clearError,
        getTemplateById
    };
}
