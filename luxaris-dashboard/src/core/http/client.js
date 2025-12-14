import { createLuminara } from 'luminara';
import { TokenManager } from '../auth/tokenManager';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

// Create base Luminara instance
const baseClient = createLuminara({
    baseURL,
    timeout: 30000,
});

// Wrapper function to add token to requests
const request = async (method, url, data = null, config = {}) => {
    const token = TokenManager.getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...config.headers,
    };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    try {
        const response = await baseClient[method](url, data, { ...config, headers });
        return response;
    } catch (error) {
    
        // Luminara stores response body in error.data
        console.error('HTTP Error:', error);
    
        // Extract response data from Luminara error
        let responseData = null;
        let status = null;
    
        if (error.data) {
            // Luminara stores response body in error.data
            responseData = error.data;
            status = error.status;
        } else if (error.response) {
            // Fallback to standard response property
            responseData = error.response.data;
            status = error.response.status;
        } else {
            // Last resort - generic error
            status = error.status || 500;
            responseData = { 
                errors: [{ 
                    error_code: 'UNKNOWN_ERROR',
                    error_description: error.message || 'An unknown error occurred',
                    error_severity: 'error'
                }]
            };
        }
    
        // Handle 401 - Token expired
        if (status === 401 && !config._retry) {
            try {
                const refreshToken = TokenManager.getRefreshToken();
                if (refreshToken) {
                    // Attempt token refresh
                    const refreshResponse = await baseClient.post('/auth/refresh', {
                        refresh_token: refreshToken,
                    });

                    const { access_token } = refreshResponse.data;
                    TokenManager.setToken(access_token);

                    // Retry original request with new token
                    headers.Authorization = `Bearer ${access_token}`;
                    return await baseClient[method](url, data, { ...config, headers, _retry: true });
                }
            } catch (refreshError) {
                // Refresh failed - clear tokens and redirect to login
                TokenManager.clearTokens();
                window.location.href = '/login';
                throw refreshError;
            }
        }

        // Attach response data to error for proper handling
        const enhancedError = new Error(error.message);
        enhancedError.response = {
            status,
            data: responseData,
        };
        enhancedError.status = status;
    
        throw enhancedError;
    }
};

// Export HTTP client with common methods
const client = {
    get: (url, config) => request('get', url, null, config),
    post: (url, data, config) => request('post', url, data, config),
    put: (url, data, config) => request('put', url, data, config),
    patch: (url, data, config) => request('patch', url, data, config),
    delete: (url, config) => request('delete', url, null, config),
};

export default client;
export { baseURL };
