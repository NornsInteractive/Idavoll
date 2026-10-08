import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import { GuestInputSchema, ProfileInputSchema, RoomSettingsSchema, JoinInputSchema, UserAccount } from '@idavoll/protocol';
import { signJWT, verifyJWT } from './auth';
import { GameRoomDO } from './room-do';
import { Env } from './env';
export { GameRoomDO };

export const app = new Hono<{ Bindings: Env; Variables: { user: UserAccount } }>();
const allowed = (env: Env) => (env.ALLOWED_ORIGINS || 'https://idavoll.pages.dev,http://localhost:5173,http://127.0.0.1:5173').split(',');
app.use('*', cors({ origin: (origin, c) => allowed(c.env).includes(origin) ? origin : undefined, allowHeaders: ['Authorization', 'Content-Type'], allowMethods: ['GET', 'POST', 'PATCH', 'OPTIONS'] }));
app.use('/api/*', async (c, next) => {
  const length = Number(c.req.header('Content-Length') || 0);
  if (length > 16384) throw new HTTPException(413, { message: '请求过大' });
  if (['POST', 'PATCH'].includes(c.req.method) && new TextEncoder().encode(await c.req.text()).length > 16384) throw new HTTPException(413, { message: '请求过大' });
  await next();
  c.header('Cache-Control', 'no-store');
});
app.onError((error, c) => {
  if (error instanceof HTTPException) return c.json({ error: error.message }, error.status);
  if (error instanceof SyntaxError || error && 'issues' in error) return c.json({ error: '输入格式不正确' }, 400);
  console.error('Request failed:', error.name);
  return c.json({ error: '服务暂时不可用，请稍后重试' }, 503);
});
app.get('/api/health', c => c.json({ status: 'ok', service: 'Idavoll Core API', time: Date.now() }));
app.post('/api/auth/guest', async c => {
  const input = GuestInputSchema.parse(await c.req.json());
  const ip = c.req.header('CF-Connecting-IP');
  if (ip) {
    const limiter = c.env.GAME_ROOM.get(c.env.GAME_ROOM.idFromName(`login-limit:${ip}`));
    const rate = await limiter.fetch(new Request('https://room/rate', { method: 'POST' }));
    if (!rate.ok) throw new HTTPException(429, { message: '登录过于频繁，请稍后重试' });
  }
  const nickname = input.nickname || `玩家_${crypto.getRandomValues(new Uint32Array(1))[0] % 9000 + 1000}`;
  const user = { id: `usr_${crypto.randomUUID()}`, nickname, avatar: input.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(nickname)}` };
  const token = await signJWT({ sub: user.id, kind: 'auth' }, c.env.JWT_SECRET);
  await c.env.DB.prepare('INSERT INTO users (id,nickname,avatar,created_at,last_seen) VALUES (?,?,?,?,?)').bind(user.id, user.nickname, user.avatar, Date.now(), Date.now()).run();
  return c.json({ user, token });
});
app.use('/api/*', async (c, next) => {
  if (c.req.path.endsWith('/ws')) return next();
  const token = c.req.header('Authorization')?.replace(/^Bearer /, '') || '';
  const claim = await verifyJWT(token, c.env.JWT_SECRET);
  if (!claim) throw new HTTPException(401, { message: '请重新登录' });
  const user = await c.env.DB.prepare('SELECT id,nickname,avatar FROM users WHERE id=?').bind(claim.sub).first<UserAccount>();
  if (!user) throw new HTTPException(401, { message: '用户不存在，请重新登录' });
  c.set('user', user);
  await c.env.DB.prepare('UPDATE users SET last_seen=? WHERE id=?').bind(Date.now(), user.id).run();
  await next();
});
app.get('/api/me', async c => {
  const user = c.get('user');
  const row = await c.env.DB.prepare('SELECT total_games AS totalGames,wins FROM users WHERE id=?').bind(user.id).first<{ totalGames: number; wins: number }>();
  const drawing = await c.env.DB.prepare('SELECT COUNT(*) AS count FROM drawings WHERE user_id=?').bind(user.id).first<{ count: number }>();
  const guesses = await c.env.DB.prepare('SELECT COALESCE(SUM(guesses),0) AS guesses, COALESCE(SUM(correct_guesses),0) AS correctGuesses FROM match_participants WHERE user_id=?').bind(user.id).first<{ guesses: number; correctGuesses: number }>();
  return c.json({ user, stats: { ...row, ...guesses, drawings: drawing?.count || 0, winRate: row?.totalGames ? Math.round(row.wins / row.totalGames * 1000) / 10 : 0, accuracy: guesses?.guesses ? Math.round(guesses.correctGuesses / guesses.guesses * 1000) / 10 : 0 } });
});
app.patch('/api/me', async c => {
  const input = ProfileInputSchema.parse(await c.req.json());
  const user = { ...c.get('user'), ...input };
  await c.env.DB.prepare('UPDATE users SET nickname=?,avatar=? WHERE id=?').bind(user.nickname, user.avatar, user.id).run();
  return c.json({ user });
});
app.get('/api/me/matches', async c => {
  const records = await c.env.DB.prepare('SELECT m.* FROM match_records m JOIN match_participants p ON p.match_id=m.id WHERE p.user_id=? ORDER BY m.played_at DESC LIMIT 50').bind(c.get('user').id).all();
  return c.json({ matches: records.results.map(({ scores_json, ...record }) => ({ ...record, scores: JSON.parse(String(scores_json)) })) });
});
app.get('/api/me/drawings', async c => {
  const records = await c.env.DB.prepare('SELECT id,word,created_at FROM drawings WHERE user_id=? ORDER BY created_at DESC LIMIT 50').bind(c.get('user').id).all();
  return c.json({ drawings: records.results });
});
app.get('/api/drawings/:id', async c => {
  const row = await c.env.DB.prepare('SELECT storage_key FROM drawings WHERE id=? AND user_id=?').bind(c.req.param('id'), c.get('user').id).first<{ storage_key: string }>();
  if (!row) throw new HTTPException(404, { message: '画作不存在' });
  const object = await c.env.DRAWINGS_BUCKET.get(row.storage_key);
  if (!object) throw new HTTPException(404, { message: '画作不存在' });
  return c.json(await object.json());
});
app.post('/api/presence', c => c.json({ ok: true }));
app.get('/api/presence', async c => {
  const row = await c.env.DB.prepare('SELECT COUNT(*) AS count FROM users WHERE last_seen>?').bind(Date.now() - 90000).first<{ count: number }>();
  return c.json({ onlineCount: row?.count || 0 });
});
app.get('/api/rooms', async c => {
  const rows = await c.env.DB.prepare("SELECT * FROM rooms WHERE status='waiting' AND player_count<json_extract(settings_json,'$.maxPlayers') AND json_extract(settings_json,'$.isPrivate')=0 AND updated_at>? ORDER BY updated_at DESC LIMIT 50").bind(Date.now() - 90000).all();
  return c.json({ rooms: rows.results.map(r => { const settings = JSON.parse(String(r.settings_json)); return { roomId: r.id, roomCode: r.room_code, title: r.title, hostId: r.host_id, status: r.status, playerCount: r.player_count, maxPlayers: settings.maxPlayers, isPrivate: settings.isPrivate }; }) });
});
function roomStub(env: Env, roomId: string) { return env.GAME_ROOM.get(env.GAME_ROOM.idFromName(roomId)); }
async function createRoom(env: Env, user: UserAccount, input: unknown): Promise<string> {
  const limiter = env.GAME_ROOM.get(env.GAME_ROOM.idFromName(`create-limit:${user.id}`));
  if (!(await limiter.fetch(new Request('https://room/rate', { method: 'POST' }))).ok) throw new HTTPException(429, { message: '创建房间过于频繁' });
  const { password, ...settings } = RoomSettingsSchema.parse(input);
  if (settings.isPrivate && (!password || password.length < 4 || password.length > 64)) throw new HTTPException(400, { message: '私密房密码须为 4–64 个字符' });
  if (!settings.isPrivate && password) throw new HTTPException(400, { message: '公开房间不应设置密码' });
  const roomId = `room_${crypto.randomUUID()}`;
  let roomCode = '';
  for (let i = 0; i < 10; i++) {
    roomCode = String(crypto.getRandomValues(new Uint32Array(1))[0] % 900000 + 100000);
    try {
      await env.DB.prepare('INSERT INTO rooms (id,room_code,title,game_id,host_id,status,settings_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)').bind(roomId, roomCode, settings.title, settings.gameId, user.id, 'waiting', JSON.stringify(settings), Date.now(), Date.now()).run();
      break;
    } catch (error) { if (i === 9 || !String(error).includes('UNIQUE')) throw error; }
  }
  const response = await roomStub(env, roomId).fetch(new Request('https://room/init', { method: 'POST', body: JSON.stringify({ roomId, roomCode, settings, password, user }) }));
  if (!response.ok) { await env.DB.prepare('DELETE FROM rooms WHERE id=?').bind(roomId).run(); throw new HTTPException(503, { message: '创建房间失败' }); }
  return roomId;
}
app.post('/api/rooms', async c => c.json({ roomId: await createRoom(c.env, c.get('user'), await c.req.json()) }, 201));
app.post('/api/rooms/match', async c => {
  const rows = await c.env.DB.prepare("SELECT id FROM rooms WHERE status='waiting' AND player_count>0 AND player_count<json_extract(settings_json,'$.maxPlayers') AND json_extract(settings_json,'$.isPrivate')=0 AND updated_at>? ORDER BY player_count DESC LIMIT 10").bind(Date.now() - 90000).all<{ id: string }>();
  for (const row of rows.results) {
    const response = await roomStub(c.env, row.id).fetch(new Request('https://room/join', { method: 'POST', body: JSON.stringify({ user: c.get('user') }) }));
    if (response.ok) return response;
  }
  const roomId = await createRoom(c.env, c.get('user'), { title: `${c.get('user').nickname} 的房间` });
  return roomStub(c.env, roomId).fetch(new Request('https://room/join', { method: 'POST', body: JSON.stringify({ user: c.get('user') }) }));
});
app.post('/api/rooms/:identifier/join', async c => {
  const identifier = c.req.param('identifier');
  const row = await c.env.DB.prepare('SELECT id FROM rooms WHERE id=? OR room_code=?').bind(identifier, identifier).first<{ id: string }>();
  if (!row) throw new HTTPException(404, { message: '房间不存在' });
  const input = JoinInputSchema.parse(await c.req.json());
  return roomStub(c.env, row.id).fetch(new Request('https://room/join', { method: 'POST', body: JSON.stringify({ ...input, user: c.get('user') }) }));
});
app.get('/api/rooms/:roomId/ws', async c => {
  if (c.req.header('Upgrade')?.toLowerCase() !== 'websocket') throw new HTTPException(400, { message: '需要 WebSocket 连接' });
  const origin = c.req.header('Origin');
  if (origin && !allowed(c.env).includes(origin)) throw new HTTPException(403, { message: '来源不允许' });
  const claim = await verifyJWT(new URL(c.req.url).searchParams.get('ticket') || '', c.env.JWT_SECRET, 'room');
  if (!claim || claim.roomId !== c.req.param('roomId')) throw new HTTPException(401, { message: '连接凭据已失效' });
  return roomStub(c.env, claim.roomId).fetch(c.req.raw);
});
app.post('/api/rooms/:roomId/voice', async c => {
  const check = await roomStub(c.env, c.req.param('roomId')).fetch(new Request('https://room/member', { method: 'POST', body: JSON.stringify({ userId: c.get('user').id }) }));
  if (!check.ok) throw new HTTPException(403, { message: '请先加入房间' });
  if (c.env.TURN_SERVERS_JSON) {
    const iceServers = JSON.parse(c.env.TURN_SERVERS_JSON);
    if (!Array.isArray(iceServers) || !iceServers.length) throw new HTTPException(503, { message: '语音服务配置无效' });
    return c.json({ iceServers, expiresAt: Date.now() + 3600000 });
  }
  if (!c.env.TURN_KEY_ID || !c.env.TURN_KEY_API_TOKEN) throw new HTTPException(503, { message: '语音服务尚未配置，请使用文字聊天' });
  const response = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(c.env.TURN_KEY_ID)}/credentials/generate-ice-servers`, { method: 'POST', headers: { Authorization: `Bearer ${c.env.TURN_KEY_API_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ ttl: 3600 }) });
  if (!response.ok) throw new HTTPException(503, { message: '语音连接暂时不可用' });
  const result = await response.json() as { iceServers: unknown[] };
  return c.json({ iceServers: result.iceServers, expiresAt: Date.now() + 3600000 });
});
export default {
  fetch: app.fetch,
  async scheduled(_event: ScheduledEvent, env: Env) {
    await env.DB.prepare("UPDATE rooms SET status='closed' WHERE updated_at<? AND status='waiting'").bind(Date.now() - 600000).run();
  },
};
