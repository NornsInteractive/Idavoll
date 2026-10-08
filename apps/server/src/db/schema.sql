-- Current schema reference. Apply versioned migrations with Wrangler; do not execute this file on production.
CREATE TABLE users (id TEXT PRIMARY KEY, nickname TEXT NOT NULL, avatar TEXT NOT NULL, total_games INTEGER NOT NULL DEFAULT 0, wins INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL, last_seen INTEGER NOT NULL DEFAULT 0);
CREATE TABLE rooms (id TEXT PRIMARY KEY, room_code TEXT NOT NULL UNIQUE, title TEXT NOT NULL, game_id TEXT NOT NULL, host_id TEXT NOT NULL, status TEXT NOT NULL, settings_json TEXT NOT NULL, created_at INTEGER NOT NULL, player_count INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL DEFAULT 0);
CREATE TABLE match_records (id TEXT PRIMARY KEY, room_id TEXT NOT NULL, winner_id TEXT, winner_nickname TEXT, total_rounds INTEGER NOT NULL, scores_json TEXT NOT NULL, played_at INTEGER NOT NULL);
CREATE TABLE match_participants (match_id TEXT NOT NULL REFERENCES match_records(id), user_id TEXT NOT NULL REFERENCES users(id), score INTEGER NOT NULL, won INTEGER NOT NULL DEFAULT 0, guesses INTEGER NOT NULL DEFAULT 0, correct_guesses INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(match_id,user_id));
CREATE TRIGGER count_completed_match AFTER INSERT ON match_participants BEGIN UPDATE users SET total_games=total_games+1,wins=wins+NEW.won WHERE id=NEW.user_id; END;
CREATE TABLE drawings (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), match_id TEXT NOT NULL, word TEXT NOT NULL, storage_key TEXT NOT NULL, created_at INTEGER NOT NULL);
CREATE INDEX rooms_available ON rooms(status,updated_at);
CREATE INDEX participants_user ON match_participants(user_id);
CREATE INDEX drawings_user ON drawings(user_id,created_at);
