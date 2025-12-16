import { createLuminara } from 'luminara';
import { TokenManager } from '@/contexts/system/application/tokenManager';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

// Create base Luminara instance
const baseClient = createLuminara({
    baseURL,
    timeout: 30000,
});

// Wrapper function to add token to requests
const request = async (method, url, data = null, config = {}) => {
    
    const token = TokenManager.getToken();

    console.log(`[HTTP Client] ${method.toUpperCase()} ${baseURL}${url}`, {
        hasToken: !!token,
        tokenPreview: token ? token.substring(0, 20) + '...' : 'none',
        baseURL,
        url
    });
    
    const headers = {
        'Content-Type': 'application/json',
        ...config.headers,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    // Merge headers into config properly for Luminara
    const requestConfig = {
        ...config,
        headers: headers,
    };

    try {
        // For GET, DELETE, HEAD, OPTIONS - pass config as second parameter
        // For POST, PUT, PATCH - pass body as second parameter, config as third
        let response;
        
        // Luminara uses 'del' instead of 'delete' (reserved keyword in some contexts)
        const methodName = method === 'delete' ? 'del' : method;
        
        // Luminara uses 'query' for query parameters, not 'params'
        // Rename params to query if present
        if (requestConfig.params) {
            requestConfig.query = requestConfig.params;
            delete requestConfig.params;
        }
        
        if (method === 'get' || method === 'delete' || method === 'head' || method === 'options') {
            response = await baseClient[methodName](url, requestConfig);
        } else {
            response = await baseClient[methodName](url, data, requestConfig);
        }
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
    
        // Attach response data to error for proper handling
        const enhancedError = new Error(error.message);
        enhancedError.response = {
            status,
            data: responseData,
        };
        enhancedError.status = status;

        // Handle 401 - Token expired (but NOT on login/register endpoints)
        const isAuthEndpoint = 
            url.includes('/auth/login') || 
            url.includes('/auth/register') || 
            url.includes('/auth/refresh');
        
        if (
            status === 401 &&
            !config._retry &&
            !isAuthEndpoint
        ) {
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
                //window.location.href = '/login';
                throw refreshError;
            }
        }
    
        // For all other cases (403, auth endpoints with 401, or failed refresh), throw the error
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
