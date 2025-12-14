/**
 * System Context Routes
 * Authentication and user management routes
 */
import LoginView from './views/LoginView.vue';
import RegisterView from './views/RegisterView.vue';
import GoogleOAuthCallback from './views/GoogleOAuthCallback.vue';

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
];
