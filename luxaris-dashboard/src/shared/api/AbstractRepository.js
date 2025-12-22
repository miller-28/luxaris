/**
 * Abstract Repository
 * Base class for all API repositories with common functionality
 */
import ApiClient from '@/core/http/ApiClient';

export class AbstractRepository {
    
    constructor(basePath) {
        this.basePath = basePath;
    }

    /**
     * Get the HTTP client instance
     * @returns {Object} HTTP client
     */
    getClient() {
        return ApiClient;
    }

    /**
     * Clean query parameters by removing null, undefined, empty strings, and empty arrays
     * @param {Object} params - Query parameters to clean
     * @returns {Object} Cleaned query parameters
     */
    cleanQueryParams(params) {
        const cleaned = { ...params };
        
        Object.keys(cleaned).forEach(key => {
            if (cleaned[key] === null || 
                cleaned[key] === undefined || 
                cleaned[key] === '' || 
                (Array.isArray(cleaned[key]) && cleaned[key].length === 0)) {
                delete cleaned[key];
            }
        });
        
        return cleaned;
    }

    /**
     * Build query parameters from filters and pagination
     * @param {Object} filters - Filter parameters
     * @param {Object} pagination - Pagination parameters
     * @returns {Object} Cleaned query parameters
     */
    buildQueryParams(filters = {}, pagination = {}) {
        const query = {
            ...filters,
            ...pagination
        };
        
        return this.cleanQueryParams(query);
    }

    /**
     * Make GET request
     * @param {string} path - Relative path (appended to basePath)
     * @param {Object} options - Request options
     * @returns {Promise} Response data
     */
    async get(path = '', options = {}) {
        const url = path ? `${this.basePath}${path}` : this.basePath;
        const response = await ApiClient.get(url, options);
        return response.data;
    }

    /**
     * Make POST request
     * @param {string} path - Relative path (appended to basePath)
     * @param {Object} data - Request body
     * @param {Object} options - Request options
     * @returns {Promise} Response data
     */
    async post(path = '', data = {}, options = {}) {
        const url = path ? `${this.basePath}${path}` : this.basePath;
        const response = await ApiClient.post(url, data, options);
        return response.data;
    }

    /**
     * Make PATCH request
     * @param {string} path - Relative path (appended to basePath)
     * @param {Object} data - Request body
     * @param {Object} options - Request options
     * @returns {Promise} Response data
     */
    async patch(path = '', data = {}, options = {}) {
        const url = path ? `${this.basePath}${path}` : this.basePath;
        const response = await ApiClient.patch(url, data, options);
        return response.data;
    }

    /**
     * Make DELETE request
     * @param {string} path - Relative path (appended to basePath)
     * @param {Object} options - Request options
     * @returns {Promise} Response data
     */
    async delete(path = '', options = {}) {
        const url = path ? `${this.basePath}${path}` : this.basePath;
        const response = await ApiClient.delete(url, options);
        return response.data;
    }
}
