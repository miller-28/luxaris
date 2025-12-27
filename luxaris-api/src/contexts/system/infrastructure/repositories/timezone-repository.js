const connection_manager = require('../../../../core/infrastructure/connection-manager');

/**
 * TimezoneRepository - Data access layer for timezones table
 * Provides methods to retrieve timezone data from the database
 */
class TimezoneRepository {
    
    constructor(schema = 'luxaris') {
        this.schema = schema;
    }

    /**
     * Find all active timezones
     * @returns {Promise<Array>} Array of timezone objects
     */
    async find_all_active() {
        const query = `
            SELECT id, iana_name, utc_offset, display_name, is_active, created_at, updated_at
            FROM ${this.schema}.timezones
            WHERE is_active = true
            ORDER BY display_name ASC
        `;
        
        const result = await connection_manager.get_db_pool().query(query);
        return result.rows;
    }

    /**
     * Find all timezones (including inactive)
     * @returns {Promise<Array>} Array of timezone objects
     */
    async find_all() {
        const query = `
            SELECT id, iana_name, utc_offset, display_name, is_active, created_at, updated_at
            FROM ${this.schema}.timezones
            ORDER BY display_name ASC
        `;
        
        const result = await connection_manager.get_db_pool().query(query);
        return result.rows;
    }

    /**
     * Find timezone by ID
     * @param {number} id - Timezone ID
     * @returns {Promise<Object|null>} Timezone object or null
     */
    async find_by_id(id) {
        const query = `
            SELECT id, iana_name, utc_offset, display_name, is_active, created_at, updated_at
            FROM ${this.schema}.timezones
            WHERE id = $1
        `;
        
        const result = await connection_manager.get_db_pool().query(query, [id]);
        return result.rows.length > 0 ? result.rows[0] : null;
    }

    /**
     * Find timezone by IANA name
     * @param {string} iana_name - IANA timezone name (e.g., 'America/New_York')
     * @returns {Promise<Object|null>} Timezone object or null
     */
    async find_by_iana_name(iana_name) {
        const query = `
            SELECT id, iana_name, utc_offset, display_name, is_active, created_at, updated_at
            FROM ${this.schema}.timezones
            WHERE iana_name = $1
        `;
        
        const result = await connection_manager.get_db_pool().query(query, [iana_name]);
        return result.rows.length > 0 ? result.rows[0] : null;
    }

    /**
     * Get array of valid IANA timezone names (for validation)
     * @returns {Promise<Array<string>>} Array of IANA timezone names
     */
    async get_valid_timezone_names() {
        const query = `
            SELECT iana_name
            FROM ${this.schema}.timezones
            WHERE is_active = true
            ORDER BY iana_name ASC
        `;
        
        const result = await connection_manager.get_db_pool().query(query);
        return result.rows.map(row => row.iana_name);
    }

    /**
     * Check if timezone name is valid
     * @param {string} iana_name - IANA timezone name to validate
     * @returns {Promise<boolean>} True if timezone exists and is active
     */
    async is_valid_timezone(iana_name) {
        const query = `
            SELECT COUNT(*) as count
            FROM ${this.schema}.timezones
            WHERE iana_name = $1 AND is_active = true
        `;
        
        const result = await connection_manager.get_db_pool().query(query, [iana_name]);
        return parseInt(result.rows[0].count) > 0;
    }
}

module.exports = TimezoneRepository;
