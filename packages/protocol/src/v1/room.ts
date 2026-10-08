import { z } from 'zod';
import { UserProfileSchema } from './common';

export const RoomStatusSchema = z.enum(['waiting', 'playing', 'settlement']);
export type RoomStatus = z.infer<typeof RoomStatusSchema>;

export const RoomSettingsSchema = z.object({
  title: z.string().min(1).max(30),
  gameId: z.literal('draw-and-guess').default('draw-and-guess'),
  maxPlayers: z.number().int().min(2).max(12).default(8),
  drawDuration: z.number().int().min(30).max(120).default(60), // seconds per turn
  totalRounds: z.number().int().min(1).max(10).default(3),
  wordDifficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  isPrivate: z.boolean().default(false),
  password: z.string().optional(),
});

export type RoomSettings = z.infer<typeof RoomSettingsSchema>;

export const RoomStateSchema = z.object({
  roomId: z.string(),
  roomCode: z.string(),
  hostId: z.string(),
  status: RoomStatusSchema,
  settings: RoomSettingsSchema,
  players: z.array(UserProfileSchema),
  currentRound: z.number().default(1),
  createdAt: z.number(),
});

export type RoomState = z.infer<typeof RoomStateSchema>;
