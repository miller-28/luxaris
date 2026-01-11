<template>
    <DashboardLayout>
        <div class="page-content">

            <!-- Header -->
            <AbstractPageHeader
                :title="$t('templates.title')"
                :subtitle="$t('templates.subtitle')"
                :actions="pageActions"
            />
            
            <!-- Filters -->
            <AbstractGridTableFilter
                v-model="filters"
                :filter-fields="filterFields"
                @filter-change="handleFilterChange"
                @clear-filters="handleClearFilters"
                @search="handleSearch"
            />
            
            <!-- Templates Grid Table -->
            <TemplatesGridTable
                class="flex-1"
                :templates="templates"
                :loading="loading"
                :total-records="meta.total"
                :items-per-page="meta.limit"
                :page="currentPage"
                :selectable="true"
                :selected-items="templatesStore.selectedItems"
                @update:selected-items="templatesStore.setSelectedItems"
                @create="openCreateDialog"
                @edit="openEditDialog"
                @delete="openDeleteDialog"
                @page-change="handlePageChange"
                @per-page-change="handlePerPageChange"
            />
            
            <!-- Create/Edit Dialog -->
            <v-dialog 
                v-model="editDialog" 
                max-width="900"
                persistent
                scrollable
            >
                <TemplateEditPanel 
                    :template="selectedTemplate"
                    :loading="saving"
                    :error="error"
                    :validation-errors="validationErrors"
                    @submit="handleSubmit"
                    @close="closeEditDialog"
                    @clear-error="clearError"
                />
            </v-dialog>
            
            <!-- Delete Confirmation Dialog -->
            <DeleteConfirmModal 
                v-model="deleteDialog"
                :title="$t('templates.delete.title')"
                :message="$t('templates.delete.message', { name: selectedTemplate?.name })"
                :confirm-text="$t('templates.delete.confirm')"
                @confirm="handleDelete"
            />
        </div>
    </DashboardLayout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import AbstractPageHeader from '@/shared/components/AbstractPageHeader.vue';
import AbstractGridTableFilter from '@/shared/components/AbstractGridTableFilter.vue';
import TemplatesGridTable from '../components/TemplatesGridTable.vue';
import TemplateEditPanel from '../components/TemplateEditPanel.vue';
import DeleteConfirmModal from '@/shared/components/DeleteConfirmModal.vue';
import { useTemplates } from '../../application/composables/useTemplates';
import { useTemplatesStore } from '../../infrastructure/store/templatesStore';
import { useToast } from '@/shared/composables/useToast';

const { t: $t } = useI18n();
const { showToastSuccess, showToastError } = useToast();
const templatesStore = useTemplatesStore();

const {
    createTemplate,
    updateTemplate,
    deleteTemplate
} = useTemplates();

// Local state for templates (loaded fresh each time)
const templates = ref([]);
const loading = ref(false);
const error = ref(null);
const meta = computed(() => templatesStore.meta);

const clearError = () => {
    error.value = null;
};

const filters = ref({
    search: ''
});
const editDialog = ref(false);
const deleteDialog = ref(false);
const selectedTemplate = ref(null);
const saving = ref(false);
const validationErrors = ref([]);
const currentPage = ref(1);

const pageActions = computed(() => [
    {
        label: $t('templates.actions.createTemplate'),
        icon: 'mdi-plus',
        color: 'primary',
        variant: 'flat',
        onClick: openCreateDialog
    }
]);

const clearValidationErrors = () => {
    validationErrors.value = [];
};

const filterFields = computed(() => [
    {
        key: 'search',
        type: 'text',
        label: $t('templates.searchTemplates'),
        icon: 'mdi-magnify',
        cols: 12,
        md: 6
    },
    {
        key: 'search-button',
        type: 'search-button',
        label: $t('common.search'),
        icon: 'mdi-magnify',
        color: 'primary',
        variant: 'flat',
        cols: 12,
        md: 'auto'
    },
    {
        key: 'clear',
        type: 'clear-button',
        label: $t('common.clearFilters'),
        icon: 'mdi-filter-remove',
        color: 'grey',
        variant: 'flat',
        cols: 12,
        md: 'auto'
    }
]);

const handleFilterChange = (newFilters) => {
    currentPage.value = 1;
    loadTemplatesWithFilters();
};

const handleSearch = () => {
    currentPage.value = 1;
    loadTemplatesWithFilters();
};

const handleClearFilters = () => {
    filters.value = { search: '' };
    currentPage.value = 1;
    loadTemplatesWithFilters();
};

const handlePageChange = (page) => {
    currentPage.value = page;
    loadTemplatesWithFilters();
};

const handlePerPageChange = (perPage) => {
    currentPage.value = 1;
    loadTemplatesWithFilters();
};

const loadTemplatesWithFilters = async () => {
    loading.value = true;
    try {
        await templatesStore.loadTemplates({
            name: filters.value.search || undefined
        });
        // Copy fresh templates from store to local ref
        templates.value = [...templatesStore.templates];
    } catch (err) {
        error.value = err.message;
        showToastError($t('templates.errors.loadFailed'));
    } finally {
        loading.value = false;
    }
};

const openCreateDialog = () => {
    selectedTemplate.value = null;
    clearValidationErrors();
    editDialog.value = true;
};

const openEditDialog = (template) => {
    selectedTemplate.value = template;
    clearValidationErrors();
    editDialog.value = true;
};

const closeEditDialog = () => {
    editDialog.value = false;
    selectedTemplate.value = null;
    clearValidationErrors();
    clearError();
};

const openDeleteDialog = (template) => {
    selectedTemplate.value = template;
    deleteDialog.value = true;
};

const handleSubmit = async (formData) => {
    saving.value = true;
    clearValidationErrors();
    
    try {
        if (selectedTemplate.value) {
            // Update existing template
            await updateTemplate(selectedTemplate.value.id, formData);
            showToastSuccess($t('templates.messages.updateSuccess'));
        } else {
            // Create new template
            await createTemplate(formData);
            showToastSuccess($t('templates.messages.createSuccess'));
        }
        
        closeEditDialog();
        await loadTemplatesWithFilters();
    } catch (err) {
        const errorMessage = err.response?.data?.errors?.[0]?.error_description;
        if (errorMessage) {
            showToastError(errorMessage);
        } else {
            showToastError(
                selectedTemplate.value 
                    ? $t('templates.errors.updateFailed')
                    : $t('templates.errors.createFailed')
            );
        }
    } finally {
        saving.value = false;
    }
};

const handleDelete = async () => {
    if (!selectedTemplate.value) return;
    
    try {
        await deleteTemplate(selectedTemplate.value.id);
        showToastSuccess($t('templates.messages.deleteSuccess'));
        await loadTemplatesWithFilters();
    } catch (err) {
        const errorMessage = err.response?.data?.errors?.[0]?.error_description;
        showToastError(errorMessage || $t('templates.errors.deleteFailed'));
    } finally {
        deleteDialog.value = false;
        selectedTemplate.value = null;
    }
};

onMounted(async () => {
    await loadTemplatesWithFilters();
});
</script>
