import { createRouter, createWebHistory } from 'vue-router';
import systemRoutes from '@/contexts/system/routes';
import postsRoutes from '@/contexts/posts/routes';
import channelsRoutes from '@/contexts/channels/routes';
import generationRoutes from '@/contexts/generation/routes';
import adminRoutes from '@/contexts/admin/routes';
import { useAuthStore } from '@/contexts/system/infrastructure/store/authStore';
import { useAppDataStore } from '@/contexts/system/infrastructure/store/appDataStore';
import { SessionManager } from '@/core/sessionManager';

const routes = [
    {
        path: '/',
        redirect: '/dashboard',
    },
    {
        path: '/dashboard',
        name: 'Dashboard',
        component: () => import('@/contexts/system/presentation/views/DashboardHome.vue'),
        meta: { requiresAuth: true },
    },
    ...adminRoutes,
    ...systemRoutes,
    ...postsRoutes,
    ...channelsRoutes,
    ...generationRoutes,
];

export const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes,
});

// Navigation guard - Authentication
router.beforeEach(async (to, from, next) => {

    const authStore = useAuthStore();
    const appDataStore = useAppDataStore();
    const sessionId = SessionManager.getSessionId();
    const isAuthenticated = !!sessionId;

    // Load application reference data (timezones, countries) once
    // This is public data cached on server (Redis, 1-hour TTL)
    if (!appDataStore.isLoaded && !appDataStore.isLoading) {
        console.log('[Router Guard] Loading app data (timezones, countries)...');
        try {
            await appDataStore.loadAppData();
            console.log('[Router Guard] App data loaded:', {
                timezones: appDataStore.timezones.length,
                countries: appDataStore.countries.length
            });
        } catch (error) {
            console.error('[Router Guard] Failed to load app data:', error);
            // Non-blocking error - app can still work without this data
        }
    }

    console.log('[Router Guard]', {
        to: to.path,
        from: from.path,
        isAuthenticated,
        sessionId: sessionId ? sessionId.substring(0, 20) + '...' : 'null',
        sessionInStorage: localStorage.getItem('session_id') ? 'exists' : 'null',
        hasUser: !!authStore.currentUser,
        userName: authStore.currentUser?.name,
        userEmail: authStore.currentUser?.email,
        userPermissions: authStore.currentUser?.permissions?.length || 0,
        requiresAuth: to.meta.requiresAuth,
        guestOnly: to.meta.guestOnly
    });

    // Load user if authenticated but user data not loaded
    if (isAuthenticated && !authStore.currentUser) {
        console.log('[Router Guard] User not loaded, loading now...');
        try {
            await authStore.loadUser();
            console.log('[Router Guard] User loaded successfully:', {
                userName: authStore.currentUser?.name,
                userEmail: authStore.currentUser?.email,
                permissions: authStore.currentUser?.permissions?.length || 0,
                roles: authStore.currentUser?.roles?.map(r => r.name).join(', ')
            });
        } catch (error) {
            console.error('[Router Guard] Failed to load user:', error);
            // Failed to load user, session might be invalid
            authStore.logout();
            if (to.meta.requiresAuth) {
                next({ name: 'Login', query: { redirect: to.fullPath } });
                return;
            }
        }
    }

    // Check if route requires authentication
    if (to.meta.requiresAuth && !isAuthenticated) {
        console.log('[Router Guard] Redirecting to login - not authenticated');
        next({ name: 'Login', query: { redirect: to.fullPath } });
        return;
    }

    // Redirect authenticated users away from guest-only pages
    if (to.meta.guestOnly && isAuthenticated) {
        console.log('[Router Guard] Redirecting to dashboard - this is guest only page');
        next({ name: 'Dashboard' });
        return;
    }

    // Check permissions if route requires specific permission
    if (to.meta.permission && isAuthenticated) {
        const [resource, action] = to.meta.permission.split(':');
        if (!authStore.hasPermission(resource, action)) {
            console.log('[Router Guard] No permission - redirecting to dashboard');
            // User doesn't have permission
            next({ name: 'Dashboard' });
            return;
        }
    }

    console.log('[Router Guard] Allowing navigation');
    next();
});
