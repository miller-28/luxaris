/**
 * Post Validation Schemas
 * Zod schemas matching API validation rules
 */
import { z } from 'zod';

/**
 * Post status enum
 */
export const PostStatus = z.enum(['draft', 'published']);

/**
 * Post creation schema
 */
export const PostCreateSchema = z.object({
    title: z.string()
        .trim()
        .min(1, 'Title is required')
        .max(200, 'Title must be 200 characters or less'),
    description: z.string()
        .trim()
        .min(1, 'Description is required')
        .max(5000, 'Description must be 5000 characters or less'),
    tags: z.array(z.string().trim().min(1).max(50))
        .max(10, 'Maximum 10 tags allowed')
        .default([]),
    status: PostStatus.default('draft'),
    metadata: z.record(z.any()).default({})
});

/**
 * Post update schema
 */
export const PostUpdateSchema = z.object({
    title: z.string()
        .trim()
        .min(1, 'Title is required')
        .max(200, 'Title must be 200 characters or less')
        .optional(),
    description: z.string()
        .trim()
        .max(5000, 'Description must be 5000 characters or less')
        .optional()
        .nullable(),
    tags: z.array(z.string().trim().min(1).max(50))
        .max(10, 'Maximum 10 tags allowed')
        .optional(),
    status: PostStatus.optional(),
    metadata: z.record(z.any()).optional()
});

/**
 * Post variant creation schema
 */
export const PostVariantCreateSchema = z.object({
    channel_connection_id: z.number()
        .int('Channel connection ID must be an integer')
        .positive('Channel connection ID must be positive'),
    content: z.string()
        .trim()
        .min(1, 'Content is required')
        .max(5000, 'Content must be 5000 characters or less'),
    media_urls: z.array(z.string().url('Invalid media URL'))
        .max(10, 'Maximum 10 media URLs allowed')
        .default([]),
    platform_specific_data: z.record(z.unknown())
        .default({})
});

/**
 * Post variant update schema
 */
export const PostVariantUpdateSchema = z.object({
    channel_connection_id: z.number()
        .int('Channel connection ID must be an integer')
        .positive('Channel connection ID must be positive')
        .optional(),
    content: z.string()
        .trim()
        .min(1, 'Content is required')
        .max(5000, 'Content must be 5000 characters or less')
        .optional(),
    media_urls: z.array(z.string().url('Invalid media URL'))
        .max(10, 'Maximum 10 media URLs allowed')
        .optional(),
    platform_specific_data: z.record(z.unknown())
        .optional()
});

/**
 * Post filter schema
 */
export const PostFilterSchema = z.object({
    status: PostStatus.optional(),
    tags: z.array(z.string()).optional(),
    search: z.string().trim().max(100).optional(),
    user_id: z.number().int().positive().optional()
});
