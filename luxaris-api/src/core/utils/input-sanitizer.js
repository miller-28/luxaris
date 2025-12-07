/**
 * Input Sanitization Utilities
 * 
 * Provides sanitization functions to prevent XSS attacks.
 * Removes or escapes dangerous HTML/JavaScript content from user inputs.
 */

const xss = require('xss');

class InputSanitizer {
    /**
     * Sanitize plain text - remove all HTML tags
     * @param {string} input - Input to sanitize
     * @returns {string} Sanitized plain text
     */
    static sanitize_plain_text(input) {
        if (typeof input !== 'string') {
            return '';
        }
        
        // Remove all HTML tags
        return input
            .replace(/<[^>]*>/g, '')
            .trim();
    }

    /**
     * Sanitize rich text - allow safe HTML subset
     * Uses xss library with whitelist of safe tags
     * @param {string} input - HTML input to sanitize
     * @returns {string} Sanitized HTML
     */
    static sanitize_rich_text(input) {
        if (typeof input !== 'string') {
            return '';
        }
        
        const options = {
            whiteList: {
                // Text formatting
                b: [],
                i: [],
                u: [],
                strong: [],
                em: [],
                mark: [],
                small: [],
                del: [],
                ins: [],
                sub: [],
                sup: [],
                
                // Headings
                h1: [],
                h2: [],
                h3: [],
                h4: [],
                h5: [],
                h6: [],
                
                // Paragraphs and breaks
                p: [],
                br: [],
                hr: [],
                
                // Lists
                ul: [],
                ol: [],
                li: [],
                
                // Links (with limited attributes)
                a: ['href', 'title', 'target'],
                
                // Code
                code: [],
                pre: [],
                
                // Quotes
                blockquote: [],
                
                // Tables
                table: [],
                thead: [],
                tbody: [],
                tr: [],
                th: [],
                td: [],
                
                // Divs and spans (limited)
                div: [],
                span: []
            },
            stripIgnoreTag: true,
            stripIgnoreTagBody: ['script', 'style'],
            onTagAttr: (tag, name, value) => {
                // Only allow http/https for links
                if (tag === 'a' && name === 'href') {
                    const lower_value = value.toLowerCase().trim();
                    if (lower_value.startsWith('javascript:') || 
                        lower_value.startsWith('data:') ||
                        lower_value.startsWith('vbscript:')) {
                        return '';
                    }
                }
            }
        };
        
        return xss(input, options);
    }

    /**
     * Sanitize JSON object - recursively sanitize all string values
     * @param {Object} json - JSON object to sanitize
     * @param {boolean} allow_html - If true, use rich text sanitization; otherwise plain text
     * @returns {Object} Sanitized JSON object
     */
    static sanitize_json(json, allow_html = false) {
        if (json === null || json === undefined) {
            return json;
        }
        
        if (typeof json === 'string') {
            return allow_html ? 
                this.sanitize_rich_text(json) : 
                this.sanitize_plain_text(json);
        }
        
        if (typeof json === 'number' || typeof json === 'boolean') {
            return json;
        }
        
        if (Array.isArray(json)) {
            return json.map(item => this.sanitize_json(item, allow_html));
        }
        
        if (typeof json === 'object') {
            const sanitized = {};
            for (const [key, value] of Object.entries(json)) {
                sanitized[key] = this.sanitize_json(value, allow_html);
            }
            return sanitized;
        }
        
        return json;
    }

    /**
     * Sanitize URL - validate and sanitize URL
     * @param {string} url - URL to sanitize
     * @returns {string|null} Sanitized URL or null if invalid
     */
    static sanitize_url(url) {
        if (typeof url !== 'string') {
            return null;
        }
        
        try {
            const parsed = new URL(url);
            
            // Only allow http and https protocols
            if (!['http:', 'https:'].includes(parsed.protocol)) {
                return null;
            }
            
            // Return sanitized URL
            return parsed.toString();
        } catch {
            return null;
        }
    }

    /**
     * Detect potential XSS patterns in input
     * @param {string} input - Input to check
     * @returns {boolean} True if potential XSS detected
     */
    static detect_xss_patterns(input) {
        if (typeof input !== 'string') {
            return false;
        }
        
        const xss_patterns = [
            /<script\b[^>]*>/i,
            /javascript:/i,
            /on\w+\s*=/i, // Event handlers like onclick=
            /<iframe\b[^>]*>/i,
            /<object\b[^>]*>/i,
            /<embed\b[^>]*>/i,
            /vbscript:/i,
            /data:text\/html/i,
            /<link\b[^>]*>/i,
            /<meta\b[^>]*>/i
        ];
        
        return xss_patterns.some(pattern => pattern.test(input));
    }

    /**
     * Escape HTML special characters
     * @param {string} input - Input to escape
     * @returns {string} Escaped string
     */
    static escape_html(input) {
        if (typeof input !== 'string') {
            return '';
        }
        
        const escape_map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#x27;',
            '/': '&#x2F;'
        };
        
        return input.replace(/[&<>"'\/]/g, char => escape_map[char]);
    }
}

module.exports = InputSanitizer;
