/**
 * App Data Store
 * Pinia store for application reference data (timezones and countries)
 * Data is cached on the server (Redis, 1-hour TTL) and loaded once on dashboard initialization
 */
import { defineStore } from 'pinia';
import { appDataRepository } from '../api/appDataRepository';

export const useAppDataStore = defineStore('appData', {
    
    state: () => ({
        timezones: [],
        countries: [],
        metadata: null,
        loaded: false,
        loading: false,
        error: null,
    }),

    getters: {
        
        isLoaded: (state) => state.loaded,
        isLoading: (state) => state.loading,
        
        /**
         * Get all timezones
         */
        allTimezones: (state) => state.timezones,
        
        /**
         * Get all countries
         */
        allCountries: (state) => state.countries,
        
        /**
         * Get timezone names for validation
         */
        timezoneNames: (state) => state.timezones.map(tz => tz.iana_name),
        
        /**
         * Get country codes for validation
         */
        countryCodes: (state) => state.countries.map(country => country.code),
        
        /**
         * Get timezone by IANA name
         */
        getTimezoneByName: (state) => (ianaName) => {
            return state.timezones.find(tz => tz.iana_name === ianaName);
        },
        
        /**
         * Get country by code
         */
        getCountryByCode: (state) => (code) => {
            return state.countries.find(country => country.code === code);
        },
        
        /**
         * Get timezones grouped by region (derived from IANA name)
         */
        timezonesByRegion: (state) => {
            const grouped = {};
            state.timezones.forEach(tz => {
                const region = tz.iana_name.split('/')[0];
                if (!grouped[region]) {
                    grouped[region] = [];
                }
                grouped[region].push(tz);
            });
            return grouped;
        },
        
        /**
         * Get countries grouped by continent
         */
        countriesByContinent: (state) => {
            const grouped = {};
            state.countries.forEach(country => {
                const continent = country.continent || 'Other';
                if (!grouped[continent]) {
                    grouped[continent] = [];
                }
                grouped[continent].push(country);
            });
            return grouped;
        },
        
        /**
         * Validate timezone
         */
        isValidTimezone: (state) => (ianaName) => {
            return state.timezones.some(tz => tz.iana_name === ianaName);
        },
        
        /**
         * Validate country code
         */
        isValidCountryCode: (state) => (code) => {
            return state.countries.some(country => country.code === code);
        },
    },

    actions: {
        
        /**
         * Load application data (timezones and countries)
         * This is typically called once on dashboard initialization
         */
        async loadAppData() {
            // Don't reload if already loaded
            if (this.loaded) {
                return { success: true, cached: true };
            }

            // Don't load if already loading
            if (this.loading) {
                return { success: false, error: 'Already loading' };
            }

            this.loading = true;
            this.error = null;

            try {
                const response = await appDataRepository.getAppData();
                
                this.timezones = response.timezones || [];
                this.countries = response.countries || [];
                this.metadata = response.metadata || null;
                this.loaded = true;

                console.log(`[AppDataStore] Loaded ${this.timezones.length} timezones and ${this.countries.length} countries`);

                return { success: true };
            } catch (error) {
                console.error('[AppDataStore] Failed to load app data:', error);
                this.error = error.message || 'Failed to load application data';
                return { success: false, error: this.error };
            } finally {
                this.loading = false;
            }
        },
        
        /**
         * Force reload app data (bypass loaded check)
         * Useful when server cache is invalidated
         */
        async reloadAppData() {
            this.loaded = false;
            return await this.loadAppData();
        },
        
        /**
         * Reset store to initial state
         */
        resetStore() {
            this.timezones = [];
            this.countries = [];
            this.metadata = null;
            this.loaded = false;
            this.loading = false;
            this.error = null;
        },
    },
});
