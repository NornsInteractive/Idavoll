CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, nickname TEXT NOT NULL, avatar TEXT NOT NULL,
  total_games INTEGER NOT NULL DEFAULT 0, wins INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS rooms (
  id TEXT PRIMARY KEY, room_code TEXT NOT NULL, title TEXT NOT NULL, game_id TEXT NOT NULL,
  host_id TEXT NOT NULL, status TEXT NOT NULL, settings_json TEXT NOT NULL, created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS match_records (
  id TEXT PRIMARY KEY, room_id TEXT NOT NULL, winner_id TEXT, winner_nickname TEXT,
  total_rounds INTEGER NOT NULL, scores_json TEXT NOT NULL, played_at INTEGER NOT NULL
);
ALTER TABLE users ADD COLUMN last_seen INTEGER NOT NULL DEFAULT 0;
ALTER TABLE rooms ADD COLUMN player_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE rooms ADD COLUMN updated_at INTEGER NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX rooms_code ON rooms(room_code);
CREATE INDEX rooms_available ON rooms(status, updated_at);
CREATE TABLE match_participants (
  match_id TEXT NOT NULL REFERENCES match_records(id), user_id TEXT NOT NULL REFERENCES users(id),
  score INTEGER NOT NULL, won INTEGER NOT NULL DEFAULT 0, guesses INTEGER NOT NULL DEFAULT 0,
  correct_guesses INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(match_id, user_id)
);
CREATE INDEX participants_user ON match_participants(user_id);
CREATE TRIGGER count_completed_match AFTER INSERT ON match_participants BEGIN
  UPDATE users SET total_games = total_games + 1, wins = wins + NEW.won WHERE id = NEW.user_id;
END;
CREATE TABLE drawings (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), match_id TEXT NOT NULL,
  word TEXT NOT NULL, storage_key TEXT NOT NULL, created_at INTEGER NOT NULL
);
CREATE INDEX drawings_user ON drawings(user_id, created_at);
