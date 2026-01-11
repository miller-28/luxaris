import { z } from 'zod';

/**
 * Template Name Schema
 */
export const TemplateNameSchema = z.string()
    .min(3, 'Template name must be at least 3 characters')
    .max(200, 'Template name must not exceed 200 characters')
    .trim();

/**
 * Template Body Schema
 */
export const TemplateBodySchema = z.string()
    .min(1, 'Template body is required')
    .max(5000, 'Template body must not exceed 5000 characters');

/**
 * Template Description Schema
 */
export const TemplateDescriptionSchema = z.string()
    .max(500, 'Description must not exceed 500 characters')
    .optional()
    .nullable();

/**
 * Template Constraints Schema
 */
export const TemplateConstraintsSchema = z.object({
    max_length: z.number().optional(),
    tone: z.array(z.string()).optional(),
    include_emoji: z.boolean().optional(),
    include_hashtags: z.boolean().optional(),
    call_to_action: z.string().optional()
}).optional();

/**
 * Create Template Schema
 */
export const CreateTemplateSchema = z.object({
    name: TemplateNameSchema,
    description: TemplateDescriptionSchema,
    template_body: TemplateBodySchema,
    default_channel_id: z.number().nullable().optional(),
    constraints: TemplateConstraintsSchema
});

/**
 * Update Template Schema
 */
export const UpdateTemplateSchema = z.object({
    name: TemplateNameSchema.optional(),
    description: TemplateDescriptionSchema,
    template_body: TemplateBodySchema.optional(),
    default_channel_id: z.number().nullable().optional(),
    constraints: TemplateConstraintsSchema
}).partial();

/**
 * Validation helper function
 * @param {ZodSchema} schema - Zod schema to validate against
 * @param {any} value - Value to validate
 * @param {Function} t - i18n translation function
 * @param {string} requiredKey - Translation key for required error
 * @param {string} invalidKey - Translation key for invalid error
 * @returns {string} - Error message or empty string
 */
export function validateField(schema, value, t, requiredKey, invalidKey) {
    try {
        schema.parse(value);
        return '';
    } catch (error) {
        if (error.errors && error.errors[0]) {
            const zodError = error.errors[0];
            if (zodError.code === 'too_small') {
                return t(requiredKey);
            }
            return t(invalidKey);
        }
        return t(invalidKey);
    }
}
