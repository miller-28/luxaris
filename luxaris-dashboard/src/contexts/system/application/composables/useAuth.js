/**
 * Auth Composable
 * Exposes authentication functionality to components
 */
import { computed } from 'vue';
import { useAuthStore } from '../../infrastructure/store/authStore';
import { useRouter } from 'vue-router';

export function useAuth() {
  const authStore = useAuthStore();
  const router = useRouter();

  const user = computed(() => authStore.currentUser);
  const isAuthenticated = computed(() => authStore.isAuthenticated);
  const isLoading = computed(() => authStore.isLoading);
  const error = computed(() => authStore.error);
  const isRootAdmin = computed(() => authStore.isRootAdmin);

  /**
   * Login with email and password
   */
  const login = async (email, password) => {
    const result = await authStore.login(email, password);
    
    if (result.success) {
      // Redirect to dashboard
      router.push('/dashboard');
    }
    
    return result;
  };

  /**
   * Register new user
   * Note: Navigation is handled by the RegisterView component via modal dialogs
   */
  const register = async (userData) => {
    const result = await authStore.register(userData);
    return result;
  };

  /**
   * Login with Google
   */
  const loginWithGoogle = async () => {
    try {
      await authStore.loginWithGoogle();
    } catch (error) {
      console.error('Google login failed:', error);
    }
  };

  /**
   * Handle Google OAuth callback
   */
  const handleGoogleCallback = async (code, state) => {
    const result = await authStore.handleGoogleCallback(code, state);
    
    if (result.success) {
      if (result.isPending) {
        router.push('/login?message=pending');
      } else {
        router.push('/dashboard');
      }
    } else {
      router.push('/login?error=oauth_failed');
    }
    
    return result;
  };

  /**
   * Logout user
   */
  const logout = async () => {
    await authStore.logout();
    router.push('/login');
  };

  /**
   * Complete registration for first user
   */
  const completeRegistration = async (tokens) => {
    await authStore.completeRegistration(tokens);
  };

  /**
   * Clear error message
   */
  const clearError = () => {
    authStore.clearError();
  };

  return {
    // State
    user,
    isAuthenticated,
    isLoading,
    error,
    isRootAdmin,

    // Actions
    login,
    register,
    completeRegistration,
    loginWithGoogle,
    handleGoogleCallback,
    logout,
    clearError,
  };
}
