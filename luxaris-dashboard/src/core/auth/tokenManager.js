/**
 * Token Manager
 * Handles JWT token storage and retrieval
 */
export const TokenManager = {
  /**
   * Get access token from localStorage
   */
  getToken() {
    const token = localStorage.getItem('auth_token');

    // Validate token format
    if (token && !this.isValidTokenFormat(token)) {
      console.warn('Invalid token format detected, clearing');
      this.clearTokens();
      return null;
    }

    return token;
  },

  /**
   * Get refresh token from localStorage
   */
  getRefreshToken() {
    return localStorage.getItem('refresh_token');
  },

  /**
   * Store access token
   */
  setToken(token) {
    if (!token) return;

    // Validate before storing
    if (!this.isValidTokenFormat(token)) {
      throw new Error('Invalid token format');
    }

    localStorage.setItem('auth_token', token);
  },

  /**
   * Store refresh token
   */
  setRefreshToken(token) {
    if (!token) return;
    localStorage.setItem('refresh_token', token);
  },

  /**
   * Store both tokens
   */
  setTokens(accessToken, refreshToken) {
    this.setToken(accessToken);
    if (refreshToken) {
      this.setRefreshToken(refreshToken);
    }
  },

  /**
   * Clear all tokens
   */
  clearTokens() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
  },

  /**
   * Validate JWT token format (header.payload.signature)
   */
  isValidTokenFormat(token) {
    const parts = token.split('.');
    return parts.length === 3;
  },

  /**
   * Check if token is expired
   */
  isTokenExpired(token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp = payload.exp * 1000;
      return Date.now() >= exp;
    } catch {
      return true;
    }
  },

  /**
   * Decode token payload
   */
  decodeToken(token) {
    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch {
      return null;
    }
  },
};

// Export individual functions for convenience
export const {
  getToken,
  getRefreshToken,
  setToken,
  setRefreshToken,
  setTokens,
  clearTokens,
  isValidTokenFormat,
  isTokenExpired,
  decodeToken,
} = TokenManager;
