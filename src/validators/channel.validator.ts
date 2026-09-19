import { z } from 'zod';

export const createChannelSchema = z.object({
  name: z.string().min(1, 'Channel name is required').max(80).regex(/^[a-zA-Z0-9_-]+$/, 'Channel name can only contain letters, numbers, hyphens, and underscores'),
  description: z.string().max(500).nullable().optional(),
});

export const addChannelMemberSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
});

export const sendMessageSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty').max(5000),
});
