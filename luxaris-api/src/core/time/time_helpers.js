/**
 * Time Helpers
 * 
 * Utility functions for time and timezone operations
 */

class TimeHelpers {
    /**
   * Convert a date to ISO 8601 UTC string
   * @param {Date|string} date - Date to convert
   * @returns {string} - ISO 8601 string with 'Z' suffix
   */
    static to_utc_string(date) {
        if (!date) {
            return null;
        }
        const d = date instanceof Date ? date : new Date(date);
        return d.toISOString();
    }

    /**
   * Check if a datetime is in the future
   * @param {Date|string} date - Date to check
   * @returns {boolean} - True if in future
   */
    static is_future(date) {
        const d = date instanceof Date ? date : new Date(date);
        return d > new Date();
    }

    /**
   * Check if a datetime is in the past
   * @param {Date|string} date - Date to check
   * @returns {boolean} - True if in past
   */
    static is_past(date) {
        const d = date instanceof Date ? date : new Date(date);
        return d < new Date();
    }

    /**
   * Add days to a date
   * @param {Date|string} date - Starting date
   * @param {number} days - Number of days to add
   * @returns {Date} - New date
   */
    static add_days(date, days) {
        const d = date instanceof Date ? new Date(date) : new Date(date);
        d.setDate(d.getDate() + days);
        return d;
    }

    /**
   * Get current UTC timestamp
   * @returns {string} - ISO 8601 UTC string
   */
    static now_utc() {
        return new Date().toISOString();
    }

    /**
   * Parse a date string and validate it's valid
   * @param {string} date_string - Date string to parse
   * @returns {Date} - Parsed date
   * @throws {Error} - If date is invalid
   */
    static parse_date(date_string) {
        const date = new Date(date_string);
        if (isNaN(date.getTime())) {
            throw new Error(`INVALID_DATE: ${date_string} is not a valid date`);
        }
        return date;
    }

    /**
   * Check if date is within a range
   * @param {Date|string} date - Date to check
   * @param {Date|string} min - Minimum date
   * @param {Date|string} max - Maximum date
   * @returns {boolean} - True if within range
   */
    static is_within_range(date, min, max) {
        const d = date instanceof Date ? date : new Date(date);
        const min_d = min instanceof Date ? min : new Date(min);
        const max_d = max instanceof Date ? max : new Date(max);
        return d >= min_d && d <= max_d;
    }
}

module.exports = TimeHelpers;
