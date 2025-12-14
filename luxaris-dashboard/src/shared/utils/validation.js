/**
 * Validation Utilities
 * Global validation helpers for Zod schemas
 */

/**
 * Validate field with Zod schema
 * @param {import('zod').ZodSchema} schema - Zod schema to validate against
 * @param {any} value - Value to validate
 * @param {Function} t - i18n translate function
 * @param {string} requiredKey - Translation key for required error
 * @param {string} invalidKey - Translation key for invalid error
 * @returns {string} - Error message or empty string if valid
 */
export function validateField(schema, value, t, requiredKey, invalidKey) {
    if (!value) {
        return t(requiredKey);
    }
  
    const result = schema.safeParse(value);

    if (!result.success && result.error.issues && result.error.issues.length > 0) {
        return result.error.issues[0].message;
    } else if (!result.success) {
        return t(invalidKey);
    }
  
    return '';
}
