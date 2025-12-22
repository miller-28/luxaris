/**
 * System Context Routes
 * Authentication and user management routes
 */
import LoginView from './presentation/views/LoginView.vue';
import RegisterView from './presentation/views/RegisterView.vue';
import GoogleOAuthCallback from './presentation/views/GoogleOAuthCallback.vue';
import ChannelSettingsView from './presentation/views/ChannelSettingsView.vue';

export const systemRoutes = [
    {
        path: '/login',
        name: 'Login',
        component: LoginView,
        meta: {
            requiresAuth: false,
            guestOnly: true,
        },
    },
    {
        path: '/register',
        name: 'Register',
        component: RegisterView,
        meta: {
            requiresAuth: false,
            guestOnly: true,
        },
    },
    {
        path: '/auth/google/callback',
        name: 'GoogleOAuthCallback',
        component: GoogleOAuthCallback,
        meta: {
            requiresAuth: false,
        },
    },
    {
        path: '/dashboard/admin/channels',
        name: 'AdminChannels',
        component: ChannelSettingsView,
        meta: {
            requiresAuth: true,
            requiresAdmin: true,
            permission: 'channels:configure',
            title: 'Channel Settings'
        },
    },
];
