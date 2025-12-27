const connection_manager = require('../../../../core/infrastructure/connection-manager');

/**
 * CountryRepository - Data access layer for countries table
 * Provides methods to retrieve country data from the database
 */
class CountryRepository {
    
    constructor(schema = 'luxaris') {
        this.schema = schema;
    }

    /**
     * Find all countries with their timezone information
     * @returns {Promise<Array>} Array of country objects with timezone data
     */
    async find_all() {
        const query = `
            SELECT 
                c.id, c.code, c.name, c.native_name, c.language, c.phone_code, 
                c.capital, c.currency, c.continent, c.timezone_id,
                t.iana_name as timezone_iana_name,
                t.utc_offset as timezone_utc_offset,
                t.display_name as timezone_display_name,
                c.created_at, c.updated_at
            FROM ${this.schema}.countries c
            LEFT JOIN ${this.schema}.timezones t ON c.timezone_id = t.id
            ORDER BY c.name ASC
        `;
        
        const result = await connection_manager.get_db_pool().query(query);
        return result.rows;
    }

    /**
     * Find country by ID
     * @param {number} id - Country ID
     * @returns {Promise<Object|null>} Country object or null
     */
    async find_by_id(id) {
        const query = `
            SELECT 
                c.id, c.code, c.name, c.native_name, c.language, c.phone_code, 
                c.capital, c.currency, c.continent, c.timezone_id,
                t.iana_name as timezone_iana_name,
                t.utc_offset as timezone_utc_offset,
                t.display_name as timezone_display_name,
                c.created_at, c.updated_at
            FROM ${this.schema}.countries c
            LEFT JOIN ${this.schema}.timezones t ON c.timezone_id = t.id
            WHERE c.id = $1
        `;
        
        const result = await connection_manager.get_db_pool().query(query, [id]);
        return result.rows.length > 0 ? result.rows[0] : null;
    }

    /**
     * Find country by ISO 3166-1 alpha-2 code
     * @param {string} code - Two-letter country code (e.g., 'US', 'IL')
     * @returns {Promise<Object|null>} Country object or null
     */
    async find_by_code(code) {
        const query = `
            SELECT 
                c.id, c.code, c.name, c.native_name, c.language, c.phone_code, 
                c.capital, c.currency, c.continent, c.timezone_id,
                t.iana_name as timezone_iana_name,
                t.utc_offset as timezone_utc_offset,
                t.display_name as timezone_display_name,
                c.created_at, c.updated_at
            FROM ${this.schema}.countries c
            LEFT JOIN ${this.schema}.timezones t ON c.timezone_id = t.id
            WHERE c.code = $1
        `;
        
        const result = await connection_manager.get_db_pool().query(query, [code.toUpperCase()]);
        return result.rows.length > 0 ? result.rows[0] : null;
    }

    /**
     * Find countries by timezone ID
     * @param {number} timezone_id - Timezone ID
     * @returns {Promise<Array>} Array of country objects
     */
    async find_by_timezone(timezone_id) {
        const query = `
            SELECT 
                c.id, c.code, c.name, c.native_name, c.language, c.phone_code, 
                c.capital, c.currency, c.continent, c.timezone_id,
                t.iana_name as timezone_iana_name,
                t.utc_offset as timezone_utc_offset,
                t.display_name as timezone_display_name,
                c.created_at, c.updated_at
            FROM ${this.schema}.countries c
            LEFT JOIN ${this.schema}.timezones t ON c.timezone_id = t.id
            WHERE c.timezone_id = $1
            ORDER BY c.name ASC
        `;
        
        const result = await connection_manager.get_db_pool().query(query, [timezone_id]);
        return result.rows;
    }

    /**
     * Find countries by continent
     * @param {string} continent - Continent name
     * @returns {Promise<Array>} Array of country objects
     */
    async find_by_continent(continent) {
        const query = `
            SELECT 
                c.id, c.code, c.name, c.native_name, c.language, c.phone_code, 
                c.capital, c.currency, c.continent, c.timezone_id,
                t.iana_name as timezone_iana_name,
                t.utc_offset as timezone_utc_offset,
                t.display_name as timezone_display_name,
                c.created_at, c.updated_at
            FROM ${this.schema}.countries c
            LEFT JOIN ${this.schema}.timezones t ON c.timezone_id = t.id
            WHERE c.continent = $1
            ORDER BY c.name ASC
        `;
        
        const result = await connection_manager.get_db_pool().query(query, [continent]);
        return result.rows;
    }

    /**
     * Check if country code is valid
     * @param {string} code - Two-letter country code
     * @returns {Promise<boolean>} True if country exists
     */
    async is_valid_country_code(code) {
        const query = `
            SELECT COUNT(*) as count
            FROM ${this.schema}.countries
            WHERE code = $1
        `;
        
        const result = await connection_manager.get_db_pool().query(query, [code.toUpperCase()]);
        return parseInt(result.rows[0].count) > 0;
    }

    /**
     * Get array of valid country codes (for validation)
     * @returns {Promise<Array<string>>} Array of country codes
     */
    async get_valid_country_codes() {
        const query = `
            SELECT code
            FROM ${this.schema}.countries
            ORDER BY code ASC
        `;
        
        const result = await connection_manager.get_db_pool().query(query);
        return result.rows.map(row => row.code);
    }

    /**
     * Get countries count
     * @returns {Promise<number>} Total number of countries
     */
    async count() {
        const query = `SELECT COUNT(*) as count FROM ${this.schema}.countries`;
        const result = await connection_manager.get_db_pool().query(query);
        return parseInt(result.rows[0].count);
    }
}

module.exports = CountryRepository;
