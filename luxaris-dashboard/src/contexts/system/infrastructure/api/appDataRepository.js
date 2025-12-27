/**
 * App Data Repository
 * Handles app reference data API calls (timezones, countries)
 */
import ApiClient from '@/core/http/ApiClient';

export const appDataRepository = {
    
    /**
     * Get application reference data (timezones and countries)
     * This endpoint is public and cached on the server (Redis, 1-hour TTL)
     */
    async getAppData() {
        const response = await ApiClient.get('/ops/app-data');
        return response.data;
    },
};
