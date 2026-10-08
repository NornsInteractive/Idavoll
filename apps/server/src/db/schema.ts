import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  nickname: text('nickname').notNull(),
  avatar: text('avatar').notNull(),
  totalGames: integer('total_games').default(0),
  wins: integer('wins').default(0),
  createdAt: integer('created_at').notNull(),
  lastSeen: integer('last_seen').notNull().default(0),
});

export const rooms = sqliteTable('rooms', {
  id: text('id').primaryKey(),
  roomCode: text('room_code').notNull().unique(),
  title: text('title').notNull(),
  gameId: text('game_id').notNull(),
  hostId: text('host_id').notNull(),
  status: text('status').notNull(),
  settingsJson: text('settings_json').notNull(),
  playerCount: integer('player_count').notNull().default(0),
  updatedAt: integer('updated_at').notNull().default(0),
  createdAt: integer('created_at').notNull(),
});

export const matchRecords = sqliteTable('match_records', {
  id: text('id').primaryKey(),
  roomId: text('room_id').notNull(),
  winnerId: text('winner_id'),
  winnerNickname: text('winner_nickname'),
  totalRounds: integer('total_rounds').notNull(),
  scoresJson: text('scores_json').notNull(),
  playedAt: integer('played_at').notNull(),
});

export const matchParticipants = sqliteTable('match_participants', {
  matchId: text('match_id').notNull(),
  userId: text('user_id').notNull(),
  score: integer('score').notNull(),
  won: integer('won').notNull().default(0),
  guesses: integer('guesses').notNull().default(0),
  correctGuesses: integer('correct_guesses').notNull().default(0),
}, table => [primaryKey({ columns: [table.matchId, table.userId] })]);

export const drawings = sqliteTable('drawings', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  matchId: text('match_id').notNull(),
  word: text('word').notNull(),
  storageKey: text('storage_key').notNull(),
  createdAt: integer('created_at').notNull(),
});
