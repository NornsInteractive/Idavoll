import { z } from 'zod';
import { BaseMessageSchema } from './common';

export const ChatMessageTypeSchema = z.enum([
  'text',
  'system',
  'guess',
  'correct_guess',
  'reaction',
  'danmaku',
]);

export type ChatMessageType = z.infer<typeof ChatMessageTypeSchema>;

export const ChatMessageSchema = BaseMessageSchema.extend({
  type: z.literal('chat:message'),
  payload: z.object({
    id: z.string(),
    type: ChatMessageTypeSchema,
    content: z.string(),
    senderNickname: z.string(),
    senderAvatar: z.string(),
    color: z.string().optional(),
    isDanmaku: z.boolean().default(false),
  }),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const DanmakuItemSchema = z.object({
  id: z.string(),
  text: z.string(),
  color: z.string().default('#5B5BF0'),
  fontSize: z.number().default(16),
  topPercent: z.number(),
  senderNickname: z.string(),
  timestamp: z.number(),
});

export type DanmakuItem = z.infer<typeof DanmakuItemSchema>;
