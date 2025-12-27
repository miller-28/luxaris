<template>
    <DashboardLayout>
        <div class="page-content">

            <!-- Header -->
            <AbstractPageHeader
                :title="$t('admin.users.title')"
                :subtitle="$t('admin.users.subtitle')"
            />
            
            <!-- Filters -->
            <AbstractGridTableFilter
                v-model="filters"
                :filter-fields="filterFields"
                @filter-change="handleFilterChange"
                @clear-filters="handleClearFilters"
                @search="handleSearch"
            />
            
            <!-- Users Table -->
            <UsersGridTable
                class="flex-1"
                :users="users"
                :loading="loading"
                :items-per-page="itemsPerPage"
                :page="currentPage"
                :sort-by="sortBy"
                :total-records="usersStore.pagination.total"
                :selectable="true"
                :selected-items="usersStore.selectedItems"
                @update:selected-items="usersStore.setSelectedItems"
                @row-click="handleRowClick"
                @approve="openApproveDialog"
                @disable="openDisableDialog"
                @enable="openEnableDialog"
                @delete="openDeleteDialog"
                @sort-change="handleSortChange"
                @page-change="handlePageChange"
                @per-page-change="handlePerPageChange"
            />
            
            <!-- Approve User Dialog -->
            <ConfirmationModal 
                v-model="approveDialog"
                :title="$t('admin.users.approve.title')"
                :message="$t('admin.users.approve.message', { name: selectedUser?.name })"
                :confirm-text="$t('admin.users.approve.confirm')"
                @confirm="handleApprove"
            />

            <!-- Disable User Dialog -->
            <ConfirmationModal 
                v-model="disableDialog"
                :title="$t('admin.users.disable.title')"
                :message="$t('admin.users.disable.message', { name: selectedUser?.name })"
                :confirm-text="$t('admin.users.disable.confirm')"
                color="warning"
                @confirm="handleDisable"
            />

            <!-- Enable User Dialog -->
            <ConfirmationModal 
                v-model="enableDialog"
                :title="$t('admin.users.enable.title')"
                :message="$t('admin.users.enable.message', { name: selectedUser?.name })"
                :confirm-text="$t('admin.users.enable.confirm')"
                @confirm="handleEnable"
            />
            
            <!-- Delete User Dialog -->
            <ConfirmationModal 
                v-model="deleteDialog"
                :title="$t('admin.users.delete.title')"
                :message="$t('admin.users.delete.message', { name: selectedUser?.name })"
                :confirm-text="$t('admin.users.delete.confirm')"
                color="error"
                @confirm="handleDelete"
            />
        </div>
    </DashboardLayout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import AbstractPageHeader from '@/shared/components/AbstractPageHeader.vue';
import AbstractGridTableFilter from '@/shared/components/AbstractGridTableFilter.vue';
import UsersGridTable from '../components/UsersGridTable.vue';
import ConfirmationModal from '@/shared/components/ConfirmationModal.vue';
import { useUsers } from '../../application/composables/useUsers';
import { useUsersStore } from '../../infrastructure/store/usersStore';
import { useToast } from '@/shared/composables/useToast';

const router = useRouter();
const { t: $t } = useI18n();
const { showToastSuccess, showToastError } = useToast();
const usersStore = useUsersStore();

// Local state for users (loaded fresh each time)
const users = ref([]);
const loading = ref(false);
const error = ref(null);

const {
    approveUser,
    disableUser,
    enableUser,
    deleteUser
} = useUsers();

// Use store state directly for persistence
const filters = computed({
    get: () => usersStore.filters,
    set: (value) => {
        usersStore.filters = { ...usersStore.filters, ...value };
    }
});

const currentPage = computed({
    get: () => usersStore.pagination.page,
    set: (value) => {
        usersStore.pagination.page = value;
    }
});

const itemsPerPage = computed({
    get: () => usersStore.pagination.per_page,
    set: (value) => {
        usersStore.pagination.per_page = value;
    }
});

// Local state for dialogs
const approveDialog = ref(false);
const disableDialog = ref(false);
const enableDialog = ref(false);
const deleteDialog = ref(false);
const selectedUser = ref(null);

// Sort state
const sortBy = computed({
    get: () => usersStore.sortBy,
    set: (value) => {
        usersStore.sortBy = value;
    }
});

// Filter field definitions
const filterFields = computed(() => [
    {
        key: 'search',
        type: 'text',
        label: $t('admin.users.searchUsers'),
        icon: 'mdi-magnify',
        cols: 12,
        md: 4
    },
    {
        key: 'status',
        type: 'select',
        label: $t('admin.users.fields.status'),
        options: [
            { title: $t('admin.users.status.all'), value: null },
            { title: $t('admin.users.status.active'), value: 'active' },
            { title: $t('admin.users.status.pending_approval'), value: 'pending_approval' },
            { title: $t('admin.users.status.disabled'), value: 'disabled' }
        ],
        cols: 12,
        md: 3
    },
    {
        key: 'auth_method',
        type: 'select',
        label: $t('admin.users.fields.authMethod'),
        options: [
            { title: $t('admin.users.authMethod.all'), value: null },
            { title: $t('admin.users.authMethod.password'), value: 'password' },
            { title: $t('admin.users.authMethod.google'), value: 'google' }
        ],
        cols: 12,
        md: 2
    },
    {
        key: 'search',
        type: 'search-button',
        label: $t('admin.users.search'),
        icon: 'mdi-magnify',
        color: 'primary',
        variant: 'flat',
        cols: 12,
        md: 'auto'
    },
    {
        key: 'clear',
        type: 'clear-button',
        label: $t('admin.users.clearFilters'),
        icon: 'mdi-filter-remove',
        color: 'grey',
        variant: 'flat',
        cols: 12,
        md: 'auto'
    }
]);

// Filter and search handlers
const handleFilterChange = () => {
    currentPage.value = 1;
    loadUsersWithFilters();
};

const handleClearFilters = () => {
    filters.value = {
        status: null,
        auth_method: null,
        is_root: null,
        search: ''
    };
    currentPage.value = 1;
    loadUsersWithFilters();
};

const handleSearch = () => {
    currentPage.value = 1;
    loadUsersWithFilters();
};

// Pagination and sorting handlers
const handlePageChange = (page) => {
    currentPage.value = page;
    loadUsersWithFilters();
};

const handlePerPageChange = (perPage) => {
    itemsPerPage.value = perPage;
    currentPage.value = 1;
    loadUsersWithFilters();
};

const handleSortChange = (newSort) => {
    sortBy.value = newSort;
    loadUsersWithFilters();
};

const handleRowClick = (user) => {
    router.push({ name: 'AdminUserDetail', params: { id: user.id } });
};

// Load users with current filters
const loadUsersWithFilters = async () => {
    loading.value = true;
    error.value = null;

    try {
        const result = await usersStore.loadUsers(filters.value, false);
        
        if (result.success) {
            users.value = usersStore.users;
        } else {
            error.value = result.error;
            showToastError(result.error);
        }
    } catch (err) {
        error.value = err.message || 'Failed to load users';
        showToastError(error.value);
    } finally {
        loading.value = false;
    }
};

// Dialog handlers
const openApproveDialog = (user) => {
    selectedUser.value = user;
    approveDialog.value = true;
};

const openDisableDialog = (user) => {
    selectedUser.value = user;
    disableDialog.value = true;
};

const openEnableDialog = (user) => {
    selectedUser.value = user;
    enableDialog.value = true;
};

const openDeleteDialog = (user) => {
    selectedUser.value = user;
    deleteDialog.value = true;
};

// Action handlers
const handleApprove = async () => {
    loading.value = true;

    try {
        const result = await approveUser(selectedUser.value.id);

        if (result.success) {
            showToastSuccess($t('admin.users.approve.success'));
            await loadUsersWithFilters();
        } else {
            showToastError(result.error || $t('admin.users.approve.failed'));
        }
    } catch (err) {
        showToastError(err.message || $t('admin.users.approve.failed'));
    } finally {
        loading.value = false;
        approveDialog.value = false;
        selectedUser.value = null;
    }
};

const handleDisable = async () => {
    loading.value = true;

    try {
        const result = await disableUser(selectedUser.value.id);

        if (result.success) {
            showToastSuccess($t('admin.users.disable.success'));
            await loadUsersWithFilters();
        } else {
            showToastError(result.error || $t('admin.users.disable.failed'));
        }
    } catch (err) {
        showToastError(err.message || $t('admin.users.disable.failed'));
    } finally {
        loading.value = false;
        disableDialog.value = false;
        selectedUser.value = null;
    }
};

const handleEnable = async () => {
    loading.value = true;

    try {
        const result = await enableUser(selectedUser.value.id);

        if (result.success) {
            showToastSuccess($t('admin.users.enable.success'));
            await loadUsersWithFilters();
        } else {
            showToastError(result.error || $t('admin.users.enable.failed'));
        }
    } catch (err) {
        showToastError(err.message || $t('admin.users.enable.failed'));
    } finally {
        loading.value = false;
        enableDialog.value = false;
        selectedUser.value = null;
    }
};

const handleDelete = async () => {
    loading.value = true;

    try {
        const result = await deleteUser(selectedUser.value.id);

        if (result.success) {
            showToastSuccess($t('admin.users.delete.success'));
            await loadUsersWithFilters();
        } else {
            showToastError(result.error || $t('admin.users.delete.failed'));
        }
    } catch (err) {
        showToastError(err.message || $t('admin.users.delete.failed'));
    } finally {
        loading.value = false;
        deleteDialog.value = false;
        selectedUser.value = null;
    }
};

// Load users on mount
onMounted(async () => {
    await loadUsersWithFilters();
});
</script>

<style scoped>
.page-content {
    display: flex;
    flex-direction: column;
    height: 100%;
}
</style>
