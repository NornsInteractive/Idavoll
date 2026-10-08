export interface Env {
  GAME_ROOM: DurableObjectNamespace;
  DB: D1Database;
  CONFIG_KV: KVNamespace;
  DRAWINGS_BUCKET: R2Bucket;
  JWT_SECRET: string;
  TURN_KEY_ID?: string;
  TURN_KEY_API_TOKEN?: string;
  TURN_SERVERS_JSON?: string;
  ALLOWED_ORIGINS?: string;
}
