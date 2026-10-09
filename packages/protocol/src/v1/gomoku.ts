import { z } from 'zod';

export type StoneColor = 'black' | 'white';
export interface GomokuMove { x: number; y: number; color: StoneColor; step: number; timestamp: number; }
export type GomokuResultReason = 'five' | 'board_full' | 'draw_agreed' | 'resign' | 'timeout' | 'leave';
export interface GomokuRoundResult {
  round: number;
  winner: StoneColor | 'draw';
  winnerId: string | null;
  reason: GomokuResultReason;
  playerIds: Record<StoneColor, string>;
  moves: GomokuMove[];
}
export interface GomokuState {
  gameId: 'gomoku';
  matchId: string;
  status: 'playing' | 'round_over' | 'game_over';
  board: (StoneColor | null)[][];
  moves: GomokuMove[];
  currentTurn: StoneColor;
  playerIds: Record<StoneColor, string>;
  scores: Array<{ playerId: string; nickname: string; avatar: string; score: number }>;
  currentRound: number;
  totalRounds: number;
  turnDuration: number;
  timeLeft: number;
  deadline: number;
  turnStartedAt: number;
  spentMs: Record<string, number>;
  undoRemaining: Record<string, number>;
  revision: number;
  pendingRequest: { id: string; type: 'undo' | 'draw'; requesterId: string; expiresAt: number } | null;
  roundResults: GomokuRoundResult[];
  winner: StoneColor | 'draw' | null;
  matchWinnerId: string | null;
  resultReason: GomokuResultReason | null;
}
export interface GomokuHint { x: number; y: number; revision: number; }
export function isGomokuState(state: unknown): state is GomokuState {
  return !!state && typeof state === 'object' && 'gameId' in state && state.gameId === 'gomoku';
}
const RevisionSchema = z.object({ revision: z.number().int().nonnegative() });
export const GomokuActionSchemas = [
  z.object({ topic: z.literal('gomoku:place'), payload: RevisionSchema.extend({ x: z.number().int().min(0).max(14), y: z.number().int().min(0).max(14) }) }),
  ...(['gomoku:request_undo', 'gomoku:request_draw', 'gomoku:resign', 'gomoku:hint'] as const).map(topic => z.object({ topic: z.literal(topic), payload: RevisionSchema })),
  z.object({ topic: z.literal('gomoku:reply'), payload: RevisionSchema.extend({ requestId: z.string().uuid(), accept: z.boolean() }) }),
] as const;
export type GomokuAction = z.infer<typeof GomokuActionSchemas[number]>;
