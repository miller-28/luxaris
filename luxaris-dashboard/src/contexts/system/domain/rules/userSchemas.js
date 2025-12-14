/**
 * User Validation Schemas
 * Zod schemas matching server-side validation
 */
import { z } from 'zod';

/**
 * User Registration Schema
 * Must match: luxaris-api/src/contexts/system/domain/models/user.js
 */
export const UserRegistrationSchema = z.object({
  email: z.string()
    .min(1, 'Email is required')
    .email('Invalid email format')
    .transform(val => val.toLowerCase()),
  
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  
  name: z.string()
    .min(1, 'Name is required')
    .max(255, 'Name too long'),
  
  timezone: z.string().default('UTC').optional(),
  locale: z.string().default('en').optional(),
});

/**
 * User Login Schema
 * Must match: luxaris-api/src/contexts/system/domain/models/user.js
 */
export const UserLoginSchema = z.object({
  email: z.string()
    .min(1, 'Email is required')
    .email('Invalid email format')
    .transform(val => val.toLowerCase()),
  
  password: z.string()
    .min(1, 'Password is required'),
});

/**
 * Password Confirmation Schema
 * For client-side only (not sent to server)
 */
export const PasswordConfirmationSchema = z.object({
  password: z.string(),
  passwordConfirm: z.string(),
}).refine((data) => data.password === data.passwordConfirm, {
  message: 'Passwords do not match',
  path: ['passwordConfirm'],
});

/**
 * Individual Field Validation Schemas (for real-time validation)
 * These don't have transforms to work with .safeParse()
 */
export const NameSchema = z.string()
  .min(1, 'Name is required')
  .max(255, 'Name too long');

export const EmailSchema = z.string()
  .min(1, 'Email is required')
  .email('Invalid email format');

export const PasswordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

/**
 * Helper to extract Zod error messages
 */
export function getZodErrorMessages(error) {
  const messages = {};
  
  if (error.errors) {
    error.errors.forEach((err) => {
      const field = err.path[0];
      if (field && !messages[field]) {
        messages[field] = err.message;
      }
    });
  }
  
  return messages;
}

/**
 * Helper to format server error response
 */
export function formatServerErrors(serverErrors) {
  if (!serverErrors || !Array.isArray(serverErrors)) {
    return 'An error occurred';
  }
  
  return serverErrors
    .map(err => err.error_description || err.message)
    .join('. ');
}
