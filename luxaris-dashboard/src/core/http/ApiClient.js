import { createLuminara } from 'luminara';
import { SessionManager } from '@/core/sessionManager';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

// Create base Luminara instance
const baseClient = createLuminara({
    baseURL,
    timeout: 30000,
});

// Wrapper function to add session ID to requests
const request = async (method, url, data = null, config = {}) => {
    
    const sessionId = SessionManager.getSessionId();

    console.log(`[HTTP Client] ${method.toUpperCase()} ${baseURL}${url}`, {
        hasSession: !!sessionId,
        sessionPreview: sessionId ? sessionId.substring(0, 20) + '...' : 'none',
        baseURL,
        url
    });
    
    const headers = {
        'Content-Type': 'application/json',
        'X-Client-Type': 'luxaris-site', // Custom header to identify dashboard site
        ...config.headers,
    };

    if (sessionId) {
        headers['X-Session-ID'] = sessionId;
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
        console.error('[HTTP Client] Error caught:', {
            hasData: !!error.data,
            hasResponse: !!error.response,
            hasBody: !!error.body,
            status: error.status,
            message: error.message,
            errorKeys: Object.keys(error),
            fullError: error
        });
    
        // Extract response data from Luminara error
        let responseData = null;
        let status = null;
    
        // Try multiple possible locations for response data
        if (error.data) {
            // Luminara stores response body in error.data
            responseData = error.data;
            status = error.status;
        } else if (error.body) {
            // Some HTTP clients use body property
            responseData = error.body;
            status = error.status || error.statusCode;
        } else if (error.response) {
            // Fallback to standard response property
            responseData = error.response.data || error.response.body;
            status = error.response.status || error.response.statusCode;
        } else {
            // Last resort - generic error
            status = error.status || error.statusCode || 500;
            responseData = { 
                errors: [{ 
                    error_code: 'NETWORK_ERROR',
                    error_description: 'Unable to connect to server. Please check your connection.',
                    error_severity: 'error'
                }]
            };
        }
        
        console.error('[HTTP Client] Extracted error data:', {
            status,
            responseData
        });
    
        // Attach response data to error for proper handling
        // Use error_description if available, fallback to generic message
        const errorMessage = responseData?.errors?.[0]?.error_description || error.message || 'An error occurred';
        const enhancedError = new Error(errorMessage);
        enhancedError.response = {
            status,
            data: responseData,
        };
        enhancedError.status = status;

        // Handle 401 - Session expired, redirect to login
        const isAuthEndpoint = 
            url.includes('/auth/login') || 
            url.includes('/auth/register');
        
        if (status === 401 && !isAuthEndpoint) {
            // Clear invalid session
            SessionManager.clearSession();
            
            // Redirect to login page if not already there
            if (!window.location.pathname.includes('/login')) {
                window.location.href = '/login';
            }
        }
    
        throw enhancedError;
    }
};

// Export HTTP client with common methods
const ApiClient = {
    get: (url, config) => request('get', url, null, config),
    post: (url, data, config) => request('post', url, data, config),
    put: (url, data, config) => request('put', url, data, config),
    patch: (url, data, config) => request('patch', url, data, config),
    delete: (url, config) => request('delete', url, null, config),
};

export default ApiClient;
export { baseURL };
