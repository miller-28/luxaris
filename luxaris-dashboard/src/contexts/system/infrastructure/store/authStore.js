/**
 * Authentication Store
 * Pinia store for authentication state management
 */
import { defineStore } from 'pinia';
import { authRepository } from '../api/authRepository';
import { User } from '../../domain/models/User';
import { SessionManager } from '@/core/sessionManager';
import { usePresetStore } from './presetStore';
import { formatServerErrors } from '../../domain/validations/userSchemas';
import { baseURL } from '@/core/http/ApiClient';

export const useAuthStore = defineStore('auth', {

    state: () => ({
        user: null,
        sessionId: SessionManager.getSessionId(),
        loading: false,
        error: null,
    }),

    getters: {
        
        isAuthenticated: (state) => !!state.sessionId && !!state.user,
        currentUser: (state) => state.user,
        isRootAdmin: (state) => state.user?.is_root || false,
        isLoading: (state) => state.loading,
        hasPermission: (state) => (resource, action) => {
            if (!state.user) {
                return false;
            }
            return state.user.hasPermission(resource, action);
        },
        hasRole: (state) => (roleName) => {
            if (!state.user) {
                return false;
            }
            return state.user.hasRole(roleName);
        },
    },

    actions: {

        /**
         * Login with email and password
         */
        async login(email, password) {
            this.loading = true;
            this.error = null;

            try {
                
                const data = await authRepository.login(email, password);
        
                console.log('[Auth Store] Login response:', data);
        
                // Store session ID
                const sessionId = data.session_id;
        
                if (!sessionId) {
                    throw new Error('No session ID received from server');
                }

                try {
                    SessionManager.setSessionId(sessionId);
                    console.log('[Auth Store] Session ID stored successfully');
                } catch (error) {
                    console.error('[Auth Store] Failed to store session ID:', error);
                    throw error;
                }

                this.sessionId = sessionId;
        
                console.log('[Auth Store] Session stored. Checking localStorage:', {
                    sessionInStorage: localStorage.getItem('session_id') ? 'exists' : 'null'
                });
        
                // Store user data
                this.user = User.fromApiResponse(data.user);
                console.log('[Auth Store] User stored:', this.user);

                // Load user preset
                await this.loadUserPreset();

                return { success: true };

            } catch (error) {

                console.error('Login error:', error);
        
                // Format error message from server response
                let errorMessage = 'Login failed';
        
                if (error.response?.data?.errors) {
                    errorMessage = formatServerErrors(error.response.data.errors);
                } else if (error.response?.data?.message) {
                    errorMessage = error.response.data.message;
                } else if (error.message) {
                    errorMessage = error.message;
                }
        
                this.error = errorMessage;
                return { success: false, error: this.error };
            } finally {
                this.loading = false;
            }
        },

        /**
         * Register new user
         */
        async register(userData) {

            this.loading = true;
            this.error = null;

            try {
                const data = await authRepository.register(userData);
        
                // If first user (auto-approved), return tokens but DON'T set them yet
                // Let the view component show modal first, then call completeRegistration()
                if (
                    data.access_token &&
                    data.is_pending === false
                ) {
                    return { 
                        success: true, 
                        isPending: false,
                        tokens: {
                            access_token: data.access_token,
                            refresh_token: data.refresh_token,
                            user: data.user
                        }
                    };
                }
        
                // User needs approval ->
                return { success: true, isPending: true };

            } catch (error) {
                console.error('Registration error:', error);
        
                // Format error message from server response
                let errorMessage = 'Registration failed';
        
                if (error.response?.data?.errors) {
                    errorMessage = formatServerErrors(error.response.data.errors);
                } else if (error.response?.data?.message) {
                    errorMessage = error.response.data.message;
                } else if (error.message) {
                    errorMessage = error.message;
                }
        
                this.error = errorMessage;
                return { success: false, error: this.error };
            } finally {
                this.loading = false;
            }
        },

        /**
         * Complete registration for first user (auto-approved)
         * Called after user dismisses success modal
         */
        async completeRegistration(tokens) {

            TokenManager.setToken(tokens.access_token);
            TokenManager.setRefreshToken(tokens.refresh_token);
      
            this.token = tokens.access_token;
            this.refreshToken = tokens.refresh_token;
            this.user = User.fromApiResponse(tokens.user);
      
            // Load user preset
            await this.loadUserPreset();
        },

        /**
         * Login with Google OAuth
         * Redirect directly to backend OAuth endpoint
         */
        async loginWithGoogle() {
            try {
                // Redirect directly to backend OAuth endpoint
                // Backend will redirect to Google, then back to callback
                window.location.href = `${baseURL}/auth/google`;
            } catch (error) {
                this.error = error.message || 'Google login failed';
                throw error;
            }
        },

        /**
         * Handle Google OAuth callback
         */
        async handleGoogleCallback(code, state) {

            this.loading = true;
            this.error = null;

            try {
                const data = await authRepository.handleGoogleCallback(code, state);
        
                // Check if user needs approval
                if (data.status === 'pending') {
                    return { success: true, isPending: true };
                }

                // Store session ID and user data
                SessionManager.setSessionId(data.session_id);
        
                this.sessionId = data.session_id;
                this.user = User.fromApiResponse(data.user);

                // Load user preset
                await this.loadUserPreset();

                return { success: true, isPending: false };
            } catch (error) {
                this.error = error.response?.data?.message || 'OAuth callback failed';
                return { success: false, error: this.error };
            } finally {
                this.loading = false;
            }
        },

        /**
         * Logout current user
         */
        async logout() {
            try {
                await authRepository.logout();
            } catch (error) {
                // Continue with logout even if API call fails
                console.error('Logout API call failed:', error);
            } finally {
                // Clear local state
                SessionManager.clearSession();
                this.sessionId = null;
                this.user = null;
                this.error = null;
            }
        },

        /**
         * Load current user data
         */
        async loadUser() {
            if (!this.sessionId) {
                return;
            }

            this.loading = true;

            try {
                const data = await authRepository.getCurrentUser();
                this.user = User.fromApiResponse(data);
                await this.loadUserPreset();
            } catch (error) {
                // Token might be invalid, clear auth state
                this.logout();
            } finally {
                this.loading = false;
            }
        },

        /**
         * Load user preset after authentication
         */
        async loadUserPreset() {
            if (!this.user?.id) {
                return;
            }
            try {
                const presetStore = usePresetStore();
                await presetStore.loadPreset(this.user.id);
            } catch (error) {
                console.error('Failed to load user preset:', error);
                // Don't fail authentication if preset loading fails
            }
        },

        /**
         * Refresh access token
         */
        async refresh() {
            if (!this.refreshToken) {
                this.logout();
                return;
            }

            try {
                const data = await authRepository.refreshToken(this.refreshToken);
        
                TokenManager.setToken(data.access_token);
                this.token = data.access_token;
        
                return { success: true };
            } catch (error) {
                // Refresh token invalid, logout user
                this.logout();
                return { success: false };
            }
        },

        /**
         * Clear error message
         */
        clearError() {
            this.error = null;
        },
    },
});
