import { z } from 'zod';
import { BaseMessageSchema } from './common';
import { DrawStrokeSchema } from './draw';

export const GameTurnStatusSchema = z.enum([
  'selecting_word',
  'drawing',
  'turn_ended',
  'game_over',
]);

export type GameTurnStatus = z.infer<typeof GameTurnStatusSchema>;

export const PlayerScoreSchema = z.object({
  playerId: z.string(),
  nickname: z.string(),
  avatar: z.string(),
  score: z.number(),
  hasGuessedCorrectly: z.boolean().default(false),
  guessRank: z.number().optional(), // 1st, 2nd, etc.
});

export type PlayerScore = z.infer<typeof PlayerScoreSchema>;

export const DrawAndGuessStateSchema = z.object({
  status: GameTurnStatusSchema,
  currentRound: z.number(),
  totalRounds: z.number(),
  drawerId: z.string(),
  drawerNickname: z.string(),
  wordChoices: z.array(z.string()).optional(), // Only visible to drawer during word selection
  currentWordLength: z.number().default(0),
  wordCategory: z.string().optional(),
  wordHint: z.string().optional(),
  strokes: z.array(DrawStrokeSchema),
  timeLeft: z.number(),
  deadline: z.number().optional(),
  currentWord: z.string().optional(), // Sent only to the drawer.
  turnIndex: z.number().optional(),
  rerollsLeft: z.number().optional(),
  hintsLeft: z.number().optional(),
  aborted: z.boolean().optional(),
  scores: z.array(PlayerScoreSchema),
  turnSummary: z
    .object({
      secretWord: z.string(),
      drawerEarned: z.number(),
      guesserEarned: z.record(z.string(), z.number()),
    })
    .optional(),
  gamePodium: z
    .array(
      z.object({
        rank: z.number(),
        playerId: z.string(),
        nickname: z.string(),
        avatar: z.string(),
        score: z.number(),
        isMvp: z.boolean().default(false),
      })
    )
    .optional(),
});

export type DrawAndGuessState = z.infer<typeof DrawAndGuessStateSchema>;

export const GameActionSchema = BaseMessageSchema.extend({
  type: z.enum([
    'game:choose_word',
    'game:submit_guess',
    'game:pass_turn',
    'game:ready_next_round',
    'game:leave',
  ]),
  payload: z.object({
    word: z.string().optional(),
    guess: z.string().optional(),
  }),
});

export type GameAction = z.infer<typeof GameActionSchema>;
