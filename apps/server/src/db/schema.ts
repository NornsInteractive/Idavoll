import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  nickname: text('nickname').notNull(),
  avatar: text('avatar').notNull(),
  totalGames: integer('total_games').default(0),
  wins: integer('wins').default(0),
  createdAt: integer('created_at').notNull(),
});

export const rooms = sqliteTable('rooms', {
  id: text('id').primaryKey(),
  roomCode: text('room_code').notNull(),
  title: text('title').notNull(),
  gameId: text('game_id').notNull(),
  hostId: text('host_id').notNull(),
  status: text('status').notNull(),
  settingsJson: text('settings_json').notNull(),
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
