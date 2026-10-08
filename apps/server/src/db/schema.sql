CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  nickname TEXT NOT NULL,
  avatar TEXT NOT NULL,
  total_games INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS rooms (
  id TEXT PRIMARY KEY,
  room_code TEXT NOT NULL,
  title TEXT NOT NULL,
  game_id TEXT NOT NULL,
  host_id TEXT NOT NULL,
  status TEXT NOT NULL,
  settings_json TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS match_records (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  winner_id TEXT,
  winner_nickname TEXT,
  total_rounds INTEGER NOT NULL,
  scores_json TEXT NOT NULL,
  played_at INTEGER NOT NULL
);
