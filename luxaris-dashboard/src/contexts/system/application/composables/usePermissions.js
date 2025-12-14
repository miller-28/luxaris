/**
 * Permissions Composable
 * Exposes permission checking functionality to components
 */
import { computed } from 'vue';
import { useAuthStore } from '../../infrastructure/store/authStore';

export function usePermissions() {
    const authStore = useAuthStore();

    const isRootAdmin = computed(() => authStore.isRootAdmin);

    /**
   * Check if user has a specific permission
   */
    const hasPermission = (resource, action) => {
        return authStore.hasPermission(resource, action);
    };

    /**
   * Check if user has a specific role
   */
    const hasRole = (roleName) => {
        return authStore.hasRole(roleName);
    };

    /**
   * Check if user can perform action on resource
   * Alias for hasPermission with more readable syntax
   */
    const can = (action, resource) => {
        return hasPermission(resource, action);
    };

    /**
   * Check if user is admin
   */
    const isAdmin = computed(() => {
        return isRootAdmin.value || hasRole('admin');
    });

    return {
        hasPermission,
        hasRole,
        can,
        isRootAdmin,
        isAdmin,
    };
}
