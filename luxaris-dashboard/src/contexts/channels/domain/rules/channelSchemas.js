import { z } from 'zod';

/**
 * Zod validation schemas for channels
 * Must match API validation rules
 */

export const ChannelSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(50),
  display_name: z.string().min(1).max(100),
  icon: z.string().optional(),
  color: z.string().optional(),
  description: z.string().max(500).optional(),
  is_active: z.boolean(),
  supported_features: z.array(z.string()).optional(),
  oauth_provider_id: z.number().int().positive().optional()
});

export const ChannelConnectionSchema = z.object({
  id: z.number().int().positive(),
  user_id: z.number().int().positive(),
  channel_id: z.number().int().positive(),
  account_name: z.string().max(200),
  account_username: z.string().max(200).optional(),
  account_avatar: z.string().url().optional(),
  status: z.enum(['active', 'error', 'expired']),
  error_message: z.string().max(500).optional(),
  last_used_at: z.string().datetime().optional()
});

export const ConnectChannelSchema = z.object({
  channel_id: z.number().int().positive(),
  oauth_code: z.string().min(1),
  oauth_state: z.string().min(1).optional()
});

export const TestConnectionSchema = z.object({
  connection_id: z.number().int().positive()
});
