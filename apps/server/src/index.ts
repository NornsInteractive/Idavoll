import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { signJWT, verifyJWT } from './auth';
import { GameRoomDO } from './room-do';

export { GameRoomDO };

interface Env {
  GAME_ROOM: DurableObjectNamespace;
  DB: D1Database;
  CONFIG_KV: KVNamespace;
  DRAWINGS_BUCKET: R2Bucket;
}

const app = new Hono<{ Bindings: Env }>();

app.use('*', cors());

app.get('/api/health', (c) => {
  return c.json({ status: 'ok', time: Date.now(), service: 'Idavoll Core API' });
});

// Quick Guest Login / Token generation
app.post('/api/auth/guest', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const nickname = body.nickname || `玩家_${Math.floor(1000 + Math.random() * 9000)}`;
  const avatar = body.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(nickname)}`;
  const userId = `usr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

  const token = await signJWT({
    sub: userId,
    nickname,
    avatar,
  });

  return c.json({
    token,
    user: {
      id: userId,
      nickname,
      avatar,
      score: 120,
    },
  });
});

// Create Room HTTP helper
app.post('/api/rooms', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const roomId = `room_${Math.random().toString(36).slice(2, 8)}`;
  const roomCode = Math.floor(100000 + Math.random() * 900000).toString();

  return c.json({
    roomId,
    roomCode,
    title: body.title || '欢乐你画我猜',
    gameId: 'draw-and-guess',
  });
});

// Route WebSocket connection to Durable Object
app.all('/api/rooms/:roomId/ws', async (c) => {
  const roomId = c.req.param('roomId');
  if (c.req.header('Upgrade') !== 'websocket') {
    return c.text('Expected websocket', 400);
  }

  const id = c.env.GAME_ROOM.idFromName(roomId);
  const stub = c.env.GAME_ROOM.get(id);
  return stub.fetch(c.req.raw);
});

// Cron trigger handler
export default {
  fetch: app.fetch,
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    console.log('Cron job ran at:', new Date(event.scheduledTime).toISOString());
  },
};
