/**
 * Authentication Repository
 * Handles all authentication-related API calls
 */
import client from '@/core/http/client';

export const authRepository = {

    /**
     * Login with email and password
     */
    async login(email, password) {
        const response = await client.post('/auth/login', {
            email,
            password,
        });
        return response.data;
    },

    /**
     * Register new user
     */
    async register(userData) {
        const response = await client.post('/auth/register', {
            name: userData.name,
            email: userData.email,
            password: userData.password,
        });
        return response.data;
    },

    /**
     * Logout current user
     */
    async logout() {
        const response = await client.post('/auth/logout', {});
        return response.data;
    },

    /**
     * Refresh access token
     */
    async refreshToken(refreshToken) {
        const response = await client.post('/auth/refresh', {
            refresh_token: refreshToken,
        });
        return response.data;
    },

    /**
     * Get current user info
     */
    async getCurrentUser() {
        console.log('[authRepository] Calling GET /auth/me...');
        const response = await client.get('/auth/me');
        console.log('[authRepository] Response from /auth/me:', {
            status: response.status,
            hasData: !!response.data,
            dataKeys: Object.keys(response.data || {})
        });
        return response.data;
    },

    /**
     * Get Google OAuth URL
     */
    async getGoogleOAuthUrl() {
        const response = await client.get('/auth/google');
        return response.data;
    },

    /**
     * Handle Google OAuth callback
     */
    async handleGoogleCallback(code, state) {
        const response = await client.post('/auth/google/callback', {
            code,
            state,
        });
        return response.data;
    },
};
