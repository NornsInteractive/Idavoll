import { z } from 'zod';

export const ProtocolVersion = 'v1' as const;

export const UserProfileSchema = z.object({
  id: z.string(),
  nickname: z.string().min(1).max(24),
  avatar: z.string(),
  isHost: z.boolean().default(false),
  isReady: z.boolean().default(false),
  isOnline: z.boolean().default(true),
  score: z.number().default(0),
  micMuted: z.boolean().default(false),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;

export const BaseMessageSchema = z.object({
  version: z.literal(ProtocolVersion).default(ProtocolVersion),
  seq: z.number(),
  timestamp: z.number(),
  senderId: z.string(),
});
