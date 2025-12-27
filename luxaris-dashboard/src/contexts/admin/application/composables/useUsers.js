/**
 * useUsers Composable
 * Vue composable for users operations (admin)
 */
import { computed } from 'vue';
import { useUsersStore } from '../../infrastructure/store/usersStore';

export function useUsers() {

    const store = useUsersStore();

    // State
    const users = computed(() => store.users);
    const currentUser = computed(() => store.currentUser);
    const loading = computed(() => store.loading);
    const error = computed(() => store.error);
    const filters = computed(() => store.filters);
    const pagination = computed(() => store.pagination);
    const selectedItems = computed(() => store.selectedItems);

    // Getters
    const pendingUsersCount = computed(() => store.pendingUsersCount);
    const activeUsersCount = computed(() => store.activeUsersCount);
    const disabledUsersCount = computed(() => store.disabledUsersCount);

    // Actions
    const loadUsers = async (filters = {}, resetPage = false) => {
        return await store.loadUsers(filters, resetPage);
    };

    const loadUser = async (id) => {
        return await store.loadUser(id);
    };

    const approveUser = async (id) => {
        return await store.approveUser(id);
    };

    const disableUser = async (id) => {
        return await store.disableUser(id);
    };

    const enableUser = async (id) => {
        return await store.enableUser(id);
    };

    const deleteUser = async (id) => {
        return await store.deleteUser(id);
    };

    const updateUser = async (id, updateData) => {
        return await store.updateUser(id, updateData);
    };

    const setSelectedItems = (items) => {
        store.setSelectedItems(items);
    };

    const clearSelection = () => {
        store.clearSelection();
    };

    const clearError = () => {
        store.error = null;
    };

    return {
        // State
        users,
        currentUser,
        loading,
        error,
        filters,
        pagination,
        selectedItems,

        // Getters
        pendingUsersCount,
        activeUsersCount,
        disabledUsersCount,

        // Actions
        loadUsers,
        loadUser,
        approveUser,
        disableUser,
        enableUser,
        deleteUser,
        updateUser,
        setSelectedItems,
        clearSelection,
        clearError
    };
}
