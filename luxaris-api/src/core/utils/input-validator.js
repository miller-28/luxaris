/**
 * Input Validation Utilities
 * 
 * Provides validation functions for common input types to prevent SQL injection
 * and other malicious inputs. All validators return true/false or throw errors.
 */

const { v4: is_uuid } = require('uuid');

class InputValidator {
    /**
     * Validate UUID v4 format
     * @param {string} value - Value to validate
     * @returns {boolean} True if valid UUID
     */
    static validate_uuid(value) {
        if (typeof value !== 'string') {
            return false;
        }
        
        const uuid_regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuid_regex.test(value);
    }

    /**
     * Validate integer (positive, negative, or zero)
     * @param {*} value - Value to validate
     * @returns {boolean} True if valid integer
     */
    static validate_integer(value) {
        if (value === null || value === undefined || value === '') {
            return false;
        }
        
        const num = Number(value);
        return Number.isInteger(num) && !Number.isNaN(num);
    }

    /**
     * Validate positive integer (> 0)
     * @param {*} value - Value to validate
     * @returns {boolean} True if valid positive integer
     */
    static validate_positive_integer(value) {
        return this.validate_integer(value) && Number(value) > 0;
    }

    /**
     * Validate non-negative integer (>= 0)
     * @param {*} value - Value to validate
     * @returns {boolean} True if valid non-negative integer
     */
    static validate_non_negative_integer(value) {
        return this.validate_integer(value) && Number(value) >= 0;
    }

    /**
     * Validate email format
     * @param {string} value - Value to validate
     * @returns {boolean} True if valid email
     */
    static validate_email(value) {
        if (typeof value !== 'string') {
            return false;
        }
        
        // RFC 5322 compliant email regex (simplified)
        const email_regex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        return email_regex.test(value) && value.length <= 254;
    }

    /**
     * Validate enum value against allowed values
     * @param {*} value - Value to validate
     * @param {Array} allowed_values - Array of allowed values
     * @returns {boolean} True if value is in allowed_values
     */
    static validate_enum(value, allowed_values) {
        if (!Array.isArray(allowed_values)) {
            throw new Error('allowed_values must be an array');
        }
        
        return allowed_values.includes(value);
    }

    /**
     * Validate ISO 8601 date string
     * @param {string} value - Value to validate
     * @returns {boolean} True if valid ISO date
     */
    static validate_iso_date(value) {
        if (typeof value !== 'string') {
            return false;
        }
        
        const date = new Date(value);
        return date instanceof Date && !isNaN(date.getTime()) && date.toISOString() === value;
    }

    /**
     * Validate URL format
     * @param {string} value - Value to validate
     * @param {Array<string>} allowed_protocols - Allowed protocols (default: ['http:', 'https:'])
     * @returns {boolean} True if valid URL
     */
    static validate_url(value, allowed_protocols = ['http:', 'https:']) {
        if (typeof value !== 'string') {
            return false;
        }
        
        try {
            const url = new URL(value);
            return allowed_protocols.includes(url.protocol);
        } catch {
            return false;
        }
    }

    /**
     * Validate JSON structure against simple schema
     * @param {*} json - JSON object to validate
     * @param {Object} schema - Schema definition { field: 'type' }
     * @returns {boolean} True if JSON matches schema
     */
    static validate_json_structure(json, schema) {
        if (typeof json !== 'object' || json === null) {
            return false;
        }
        
        if (typeof schema !== 'object' || schema === null) {
            throw new Error('schema must be an object');
        }
        
        for (const [field, expected_type] of Object.entries(schema)) {
            if (!(field in json)) {
                return false; // Required field missing
            }
            
            const actual_type = typeof json[field];
            if (actual_type !== expected_type && expected_type !== 'any') {
                return false;
            }
        }
        
        return true;
    }

    /**
     * Validate string length
     * @param {string} value - Value to validate
     * @param {number} min - Minimum length (inclusive)
     * @param {number} max - Maximum length (inclusive)
     * @returns {boolean} True if length is within bounds
     */
    static validate_string_length(value, min = 0, max = Infinity) {
        if (typeof value !== 'string') {
            return false;
        }
        
        return value.length >= min && value.length <= max;
    }

    /**
     * Validate that value contains only alphanumeric characters and allowed special chars
     * @param {string} value - Value to validate
     * @param {string} allowed_chars - Additional allowed characters (default: '-_')
     * @returns {boolean} True if valid
     */
    static validate_alphanumeric(value, allowed_chars = '-_') {
        if (typeof value !== 'string') {
            return false;
        }
        
        const escaped_chars = allowed_chars.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const regex = new RegExp(`^[a-zA-Z0-9${escaped_chars}]+$`);
        return regex.test(value);
    }

    /**
     * Validate pagination parameters
     * @param {*} limit - Limit value
     * @param {*} offset - Offset value
     * @param {number} max_limit - Maximum allowed limit (default: 100)
     * @returns {Object} Validated { limit, offset } or error
     */
    static validate_pagination(limit, offset, max_limit = 100) {
        const validated = {};
        
        // Validate limit
        if (limit !== undefined && limit !== null) {
            if (!this.validate_positive_integer(limit)) {
                throw new Error('limit must be a positive integer');
            }
            validated.limit = Math.min(Number(limit), max_limit);
        } else {
            validated.limit = 20; // Default limit
        }
        
        // Validate offset
        if (offset !== undefined && offset !== null) {
            if (!this.validate_non_negative_integer(offset)) {
                throw new Error('offset must be a non-negative integer');
            }
            validated.offset = Number(offset);
        } else {
            validated.offset = 0; // Default offset
        }
        
        return validated;
    }
}

module.exports = InputValidator;
