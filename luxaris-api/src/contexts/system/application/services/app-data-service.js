const TimezoneRepository = require('../../infrastructure/repositories/timezone-repository');
const CountryRepository = require('../../infrastructure/repositories/country-repository');
const connection_manager = require('../../../../core/infrastructure/connection-manager');

/**
 * AppDataService - Service for managing application reference data
 * Provides timezones and countries data with Redis caching
 */
class AppDataService {
    constructor(system_logger) {
        this.system_logger = system_logger;
        this.timezone_repository = new TimezoneRepository();
        this.country_repository = new CountryRepository();
        this.cache_key = 'app:data';
        this.cache_ttl = 3600; // 1 hour in seconds
    }

    /**
     * Get application data (timezones and countries) with Redis caching
     * @returns {Promise<Object>} Object with timezones and countries arrays
     */
    async get_app_data() {
        try {
            // Try to get from Redis cache first
            const cached_data = await this._get_from_cache();
            if (cached_data) {
                this.system_logger.debug(
                    'AppDataService',
                    'App data retrieved from cache',
                    { cache_key: this.cache_key }
                );
                return cached_data;
            }

            // Cache miss - fetch from database
            this.system_logger.debug(
                'AppDataService',
                'Cache miss - loading app data from database',
                { cache_key: this.cache_key }
            );

            const [timezones, countries] = await Promise.all([
                this.timezone_repository.find_all_active(),
                this.country_repository.find_all()
            ]);

            const app_data = {
                timezones: timezones.map(tz => ({
                    id: tz.id,
                    iana_name: tz.iana_name,
                    utc_offset: tz.utc_offset,
                    display_name: tz.display_name
                })),
                countries: countries.map(country => ({
                    id: country.id,
                    code: country.code,
                    name: country.name,
                    native_name: country.native_name,
                    language: country.language,
                    phone_code: country.phone_code,
                    capital: country.capital,
                    currency: country.currency,
                    continent: country.continent,
                    timezone: country.timezone_iana_name ? {
                        iana_name: country.timezone_iana_name,
                        utc_offset: country.timezone_utc_offset,
                        display_name: country.timezone_display_name
                    } : null
                }))
            };

            // Store in cache
            await this._set_in_cache(app_data);

            this.system_logger.info(
                'AppDataService',
                'App data loaded from database and cached',
                {
                    timezones_count: app_data.timezones.length,
                    countries_count: app_data.countries.length,
                    cache_ttl: this.cache_ttl
                }
            );

            return app_data;
        } catch (error) {
            this.system_logger.error(
                'AppDataService',
                'Failed to get app data',
                error,
                { cache_key: this.cache_key }
            );
            throw error;
        }
    }

    /**
     * Get valid timezone names for validation
     * @returns {Promise<Array<string>>} Array of valid IANA timezone names
     */
    async get_valid_timezones() {
        const app_data = await this.get_app_data();
        return app_data.timezones.map(tz => tz.iana_name);
    }

    /**
     * Validate timezone name
     * @param {string} timezone - IANA timezone name to validate
     * @returns {Promise<boolean>} True if timezone is valid
     */
    async is_valid_timezone(timezone) {
        const valid_timezones = await this.get_valid_timezones();
        return valid_timezones.includes(timezone);
    }

    /**
     * Get valid country codes for validation
     * @returns {Promise<Array<string>>} Array of valid country codes
     */
    async get_valid_country_codes() {
        const app_data = await this.get_app_data();
        return app_data.countries.map(country => country.code);
    }

    /**
     * Validate country code
     * @param {string} code - Country code to validate
     * @returns {Promise<boolean>} True if country code is valid
     */
    async is_valid_country_code(code) {
        const valid_codes = await this.get_valid_country_codes();
        return valid_codes.includes(code.toUpperCase());
    }

    /**
     * Invalidate cache (force reload from database on next request)
     * @returns {Promise<void>}
     */
    async invalidate_cache() {
        try {
            const redis_client = connection_manager.get_redis();
            await redis_client.del(this.cache_key);
            
            this.system_logger.info(
                'AppDataService',
                'App data cache invalidated',
                { cache_key: this.cache_key }
            );
        } catch (error) {
            this.system_logger.error(
                'AppDataService',
                'Failed to invalidate cache',
                error,
                { cache_key: this.cache_key }
            );
        }
    }

    /**
     * Get data from Redis cache
     * @private
     * @returns {Promise<Object|null>} Cached data or null if not found
     */
    async _get_from_cache() {
        try {
            const redis_client = connection_manager.get_redis_client();
            const cached = await redis_client.get(this.cache_key);
            
            if (cached) {
                return JSON.parse(cached);
            }
            
            return null;
        } catch (error) {
            // If Redis fails, log but don't throw - fall back to database
            this.system_logger.warning(
                'AppDataService',
                'Redis cache read failed, falling back to database',
                { error: error.message, cache_key: this.cache_key }
            );
            return null;
        }
    }

    /**
     * Store data in Redis cache
     * @private
     * @param {Object} data - Data to cache
     * @returns {Promise<void>}
     */
    async _set_in_cache(data) {
        try {
            const redis_client = connection_manager.get_redis_client();
            await redis_client.setex(
                this.cache_key,
                this.cache_ttl,
                JSON.stringify(data)
            );
        } catch (error) {
            // If Redis fails, log but don't throw - data is still returned from database
            this.system_logger.warning(
                'AppDataService',
                'Redis cache write failed',
                { error: error.message, cache_key: this.cache_key }
            );
        }
    }
}

module.exports = AppDataService;
