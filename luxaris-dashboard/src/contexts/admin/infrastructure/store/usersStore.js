/**
 * Users Store
 * Pinia store for managing users state (admin)
 */
import { defineStore } from 'pinia';
import { usersRepository } from '../api/usersRepository';
import { AbstractStore } from '@/shared/store/AbstractStore';

export const useUsersStore = defineStore('users', {

    state: () => AbstractStore.mergeState({
        users: [],
        currentUser: null,
        filters: {
            status: null,
            auth_method: null,
            is_root: null,
            search: ''
        },
        pagination: {
            page: 1,
            per_page: 10,
            total: 0
        },
        sortBy: [{ key: 'created_at', order: 'desc' }],
        selectedItems: []
    }),

    getters: AbstractStore.mergeGetters({

        /**
         * Get user by ID
         */
        getUserById: (state) => (id) => {
            return state.users.find(user => user.id === id);
        },

        /**
         * Get pending users count
         */
        pendingUsersCount: (state) => {
            return state.users.filter(user => user.status === 'pending_approval').length;
        },

        /**
         * Get active users count
         */
        activeUsersCount: (state) => {
            return state.users.filter(user => user.status === 'active').length;
        },

        /**
         * Get disabled users count
         */
        disabledUsersCount: (state) => {
            return state.users.filter(user => user.status === 'disabled').length;
        }
    }),

    actions: AbstractStore.mergeActions({

        /**
         * Load users with filters
         */
        async loadUsers(filters = {}, resetPage = false) {
            this.loading = true;
            this.error = null;

            this.filters = { ...this.filters, ...filters };

            const requestedPerPage = filters.per_page ?? this.pagination.per_page;
            const requestedPage = resetPage ? 1 : (filters.page ?? this.pagination.page);

            this.pagination.per_page = requestedPerPage;
            this.pagination.page = requestedPage;

            try {
                const response = await usersRepository.list(
                    this.filters,
                    {
                        page: this.pagination.page,
                        per_page: this.pagination.per_page
                    }
                );

                this.users = response.data || [];
                this.pagination.total = response.pagination?.total || this.users.length;
                
                return { success: true };
            } catch (error) {
                console.error('[Users Store] Load users failed:', error);
                this.error = error.response?.data?.errors?.[0]?.error_description || 'Failed to load users';
                return { success: false, error: this.error };
            } finally {
                this.loading = false;
            }
        },

        /**
         * Load single user by ID
         */
        async loadUser(id) {
            this.loading = true;
            this.error = null;

            try {
                const response = await usersRepository.getById(id);
                this.currentUser = response.data;
                
                return { success: true, user: this.currentUser };
            } catch (error) {
                console.error('[Users Store] Load user failed:', error);
                this.error = error.response?.data?.errors?.[0]?.error_description || 'Failed to load user';
                return { success: false, error: this.error };
            } finally {
                this.loading = false;
            }
        },

        /**
         * Approve a pending user
         */
        async approveUser(id) {
            this.loading = true;
            this.error = null;

            try {
                const response = await usersRepository.approve(id);
                const approvedUser = response.data;
                
                // Update in users array
                const index = this.users.findIndex(u => u.id === id);
                if (index !== -1) {
                    this.users[index] = approvedUser;
                }
                
                if (this.currentUser?.id === id) {
                    this.currentUser = approvedUser;
                }
                
                return { success: true, user: approvedUser };
            } catch (error) {
                console.error('[Users Store] Approve user failed:', error);
                this.error = error.response?.data?.errors?.[0]?.error_description || 'Failed to approve user';
                return { success: false, error: this.error };
            } finally {
                this.loading = false;
            }
        },

        /**
         * Disable a user account
         */
        async disableUser(id) {
            this.loading = true;
            this.error = null;

            try {
                const response = await usersRepository.disable(id);
                const disabledUser = response.data;
                
                const index = this.users.findIndex(u => u.id === id);
                if (index !== -1) {
                    this.users[index] = disabledUser;
                }
                
                if (this.currentUser?.id === id) {
                    this.currentUser = disabledUser;
                }
                
                return { success: true, user: disabledUser };
            } catch (error) {
                console.error('[Users Store] Disable user failed:', error);
                this.error = error.response?.data?.errors?.[0]?.error_description || 'Failed to disable user';
                return { success: false, error: this.error };
            } finally {
                this.loading = false;
            }
        },

        /**
         * Enable a disabled user account
         */
        async enableUser(id) {
            this.loading = true;
            this.error = null;

            try {
                const response = await usersRepository.enable(id);
                const enabledUser = response.data;
                
                const index = this.users.findIndex(u => u.id === id);
                if (index !== -1) {
                    this.users[index] = enabledUser;
                }
                
                if (this.currentUser?.id === id) {
                    this.currentUser = enabledUser;
                }
                
                return { success: true, user: enabledUser };
            } catch (error) {
                console.error('[Users Store] Enable user failed:', error);
                this.error = error.response?.data?.errors?.[0]?.error_description || 'Failed to enable user';
                return { success: false, error: this.error };
            } finally {
                this.loading = false;
            }
        },

        /**
         * Delete a user (soft delete)
         */
        async deleteUser(id) {
            this.loading = true;
            this.error = null;

            try {
                await usersRepository.remove(id);
                
                // Remove from users array
                const index = this.users.findIndex(u => u.id === id);
                if (index !== -1) {
                    this.users.splice(index, 1);
                }
                
                if (this.currentUser?.id === id) {
                    this.currentUser = null;
                }
                
                return { success: true };
            } catch (error) {
                console.error('[Users Store] Delete user failed:', error);
                this.error = error.response?.data?.errors?.[0]?.error_description || 'Failed to delete user';
                return { success: false, error: this.error };
            } finally {
                this.loading = false;
            }
        },

        /**
         * Update user
         */
        async updateUser(id, updateData) {
            this.loading = true;
            this.error = null;

            try {
                const response = await usersRepository.update(id, updateData);
                const updatedUser = response.data;
                
                // Update in users array
                const index = this.users.findIndex(u => u.id === id);
                if (index !== -1) {
                    this.users[index] = updatedUser;
                }
                
                if (this.currentUser?.id === id) {
                    this.currentUser = updatedUser;
                }
                
                return { success: true, user: updatedUser };
            } catch (error) {
                console.error('[Users Store] Update user failed:', error);
                this.error = error.response?.data?.errors?.[0]?.error_description || 'Failed to update user';
                return { success: false, error: this.error };
            } finally {
                this.loading = false;
            }
        },

        /**
         * Set selected items
         */
        setSelectedItems(items) {
            this.selectedItems = items;
        },

        /**
         * Clear selection
         */
        clearSelection() {
            this.selectedItems = [];
        }
    })
});
