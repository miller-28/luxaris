/**
 * Session Manager
 * Handles session ID storage and retrieval for Redis-based authentication
 */
export const SessionManager = {
    
    /**
     * Get session ID from localStorage
     */
    getSessionId() {
        return localStorage.getItem('session_id');
    },

    /**
     * Store session ID
     */
    setSessionId(sessionId) {
        if (!sessionId) {
            console.warn('Attempted to store empty session ID');
            return;
        }
        localStorage.setItem('session_id', sessionId);
    },

    /**
     * Clear session ID
     */
    clearSession() {
        localStorage.removeItem('session_id');
    },

    /**
     * Check if session exists
     */
    hasSession() {
        return !!this.getSessionId();
    }
};
