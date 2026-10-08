import { z } from 'zod';
import { RoomSettingsSchema } from './room';
import { DrawStrokeSchema } from './draw';

export const ProfileInputSchema = z.object({
  nickname: z.string().trim().min(1).max(24),
  avatar: z.string().max(2048).refine(v => v === '' || /^https:\/\//.test(v), '头像须为 HTTPS 地址'),
});
export const GuestInputSchema = ProfileInputSchema.partial();
export const JoinInputSchema = z.object({ password: z.string().max(64).optional() });
export const MessageInputSchema = z.discriminatedUnion('topic', [
  z.object({ topic: z.literal('chat:send'), payload: z.object({ content: z.string().trim().min(1).max(300), isDanmaku: z.boolean().optional() }) }),
  z.object({ topic: z.literal('game:submit_guess'), payload: z.object({ guess: z.string().trim().min(1).max(300) }) }),
  z.object({ topic: z.literal('game:choose_word'), payload: z.object({ word: z.string().min(1).max(50) }) }),
  z.object({ topic: z.literal('draw:stroke'), payload: DrawStrokeSchema }),
  z.object({ topic: z.literal('room:settings_update'), payload: RoomSettingsSchema }),
  ...(['room:ready_toggle', 'room:start_game', 'room:restart', 'room:leave', 'room:heartbeat', 'game:pass_turn', 'game:reroll_word', 'game:reveal_hint', 'draw:undo', 'draw:redo', 'draw:clear'] as const).map(topic => z.object({ topic: z.literal(topic), payload: z.object({}).default({}) })),
  z.object({ topic: z.literal('voice:state'), payload: z.object({ muted: z.boolean() }) }),
  z.object({ topic: z.literal('voice:signal'), payload: z.object({ targetId: z.string().max(100), signal: z.union([
    z.object({ type: z.enum(['offer', 'answer']), sdp: z.string().max(16000) }),
    z.object({ candidate: z.string().max(2000), sdpMid: z.string().nullable().optional(), sdpMLineIndex: z.number().int().nullable().optional(), usernameFragment: z.string().nullable().optional() }),
  ]) }) }),
]);

export interface UserAccount { id: string; nickname: string; avatar: string; }
export interface UserStats { totalGames: number; wins: number; winRate: number; drawings: number; guesses: number; correctGuesses: number; accuracy: number; }
export interface RoomSummary { roomId: string; roomCode: string; title: string; hostId: string; status: 'waiting' | 'playing' | 'settlement'; playerCount: number; maxPlayers: number; isPrivate: boolean; }
export interface DrawingRecord { id: string; word: string; created_at: number; }
export interface MatchRecord { id: string; room_id: string; winner_nickname: string; total_rounds: number; played_at: number; scores: Array<{ playerId: string; nickname: string; avatar: string; score: number }>; }
