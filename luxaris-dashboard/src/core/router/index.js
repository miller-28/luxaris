import { createRouter, createWebHistory } from 'vue-router';
import { systemRoutes } from '@/contexts/system/presentation/routes';
import { useAuthStore } from '@/contexts/system/infrastructure/store/authStore';
import { TokenManager } from '../auth/tokenManager';

const routes = [
    {
        path: '/',
        redirect: '/dashboard',
    },
    ...systemRoutes,
    {
        path: '/dashboard',
        name: 'Dashboard',
        component: () => import('@/contexts/system/views/DashboardHome.vue'),
        meta: { requiresAuth: true },
    },
];

export const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes,
});

// Navigation guard - Authentication
router.beforeEach(async (to, from, next) => {
    
    const authStore = useAuthStore();
    const token = TokenManager.getToken();
    const isAuthenticated = !!token;

    // Load user if authenticated but user data not loaded
    if (isAuthenticated && !authStore.currentUser) {
        try {
            await authStore.loadUser();
        } catch (error) {
            // Failed to load user, token might be invalid
            authStore.logout();
            if (to.meta.requiresAuth) {
                next({ name: 'Login', query: { redirect: to.fullPath } });
                return;
            }
        }
    }

    // Check if route requires authentication
    if (to.meta.requiresAuth && !isAuthenticated) {
        next({ name: 'Login', query: { redirect: to.fullPath } });
        return;
    }

    // Redirect authenticated users away from guest-only pages
    if (to.meta.guestOnly && isAuthenticated) {
        next({ name: 'Dashboard' });
        return;
    }

    // Check permissions if route requires specific permission
    if (to.meta.permission && isAuthenticated) {
        const [resource, action] = to.meta.permission.split(':');
        if (!authStore.hasPermission(resource, action)) {
            // User doesn't have permission
            next({ name: 'Dashboard' });
            return;
        }
    }

    next();
});
