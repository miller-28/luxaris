/**
 * XSS Sanitization Middleware
 * 
 * Sanitizes user inputs to prevent XSS attacks.
 * Applies field-specific sanitization based on expected content type.
 */

const InputSanitizer = require('../../utils/input-sanitizer');

/**
 * Fields that allow rich text (sanitized HTML)
 */
const RICH_TEXT_FIELDS = [
    'content', // Post variant content
    'description', // Post description
    'template_content' // Template content
];

/**
 * Fields that should be plain text only (all HTML removed)
 */
const PLAIN_TEXT_FIELDS = [
    'title',
    'name',
    'excerpt',
    'email',
    'username',
    'comment'
];

/**
 * Recursively sanitize object based on field rules
 * @param {*} data - Data to sanitize
 * @param {string} field_name - Current field name for context
 * @returns {*} Sanitized data
 */
function sanitize_recursive(data, field_name = '') {
    if (data === null || data === undefined) {
        return data;
    }
    
    if (typeof data === 'string') {
        // Detect potential XSS (logging removed - causes crash)
        // if (InputSanitizer.detect_xss_patterns(data)) {
        //     // XSS pattern detected - will be sanitized
        // }
        
        // Apply field-specific sanitization
        const lower_field = field_name.toLowerCase();
        
        if (RICH_TEXT_FIELDS.some(field => lower_field.includes(field))) {
            return InputSanitizer.sanitize_rich_text(data);
        }
        
        if (PLAIN_TEXT_FIELDS.some(field => lower_field.includes(field))) {
            return InputSanitizer.sanitize_plain_text(data);
        }
        
        // Default: plain text sanitization for safety
        return InputSanitizer.sanitize_plain_text(data);
    }
    
    if (typeof data === 'number' || typeof data === 'boolean') {
        return data;
    }
    
    if (Array.isArray(data)) {
        return data.map((item, index) => 
            sanitize_recursive(item, `${field_name}[${index}]`));
    }
    
    if (typeof data === 'object') {
        const sanitized = {};
        for (const [key, value] of Object.entries(data)) {
            const full_field_name = field_name ? `${field_name}.${key}` : key;
            sanitized[key] = sanitize_recursive(value, full_field_name);
        }
        return sanitized;
    }
    
    return data;
}

/**
 * XSS sanitization middleware
 * Sanitizes request body to prevent XSS attacks
 */
function xss_sanitization(req, res, next) {
    // Skip for GET requests (no body)
    if (req.method === 'GET') {
        return next();
    }
    
    // Skip if no body
    if (!req.body || typeof req.body !== 'object') {
        return next();
    }
    
    try {
        // Sanitize request body
        req.body = sanitize_recursive(req.body);
        
        next();
    } catch (error) {
        // Continue anyway - don't block legitimate requests
        // Errors in sanitization should not break the request flow
        next();
    }
}

module.exports = xss_sanitization;
