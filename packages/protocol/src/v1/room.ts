import { z } from 'zod';
import { UserProfileSchema } from './common';

export const RoomStatusSchema = z.enum(['waiting', 'playing', 'settlement']);
export type RoomStatus = z.infer<typeof RoomStatusSchema>;
export const GameIdSchema = z.enum(['draw-and-guess', 'gomoku']);
export type GameId = z.infer<typeof GameIdSchema>;

export const RoomSettingsSchema = z.object({
  title: z.string().min(1).max(30),
  gameId: GameIdSchema.default('draw-and-guess'),
  maxPlayers: z.number().int().min(2).max(12).optional(),
  drawDuration: z.number().int().min(30).max(120).default(60), // seconds per turn
  totalRounds: z.number().int().min(1).max(10).default(3),
  wordDifficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  isPrivate: z.boolean().default(false),
  password: z.string().optional(),
}).transform(settings => ({ ...settings, maxPlayers: settings.maxPlayers ?? (settings.gameId === 'gomoku' ? 2 : 8) })).superRefine((settings, ctx) => {
  if (settings.gameId === 'gomoku' && settings.maxPlayers !== 2) ctx.addIssue({ code: 'custom', path: ['maxPlayers'], message: 'Gomoku requires two players' });
  if (settings.gameId === 'gomoku' && ![1, 3, 5].includes(settings.totalRounds)) ctx.addIssue({ code: 'custom', path: ['totalRounds'], message: 'Gomoku supports one, three or five rounds' });
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
