import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { GameRoomDO } from '../apps/server/src/room-do';
import { initGomoku } from '../apps/server/src/gomoku';
import { GomokuState, RoomSettingsSchema, RoomState } from '../packages/protocol/src';

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(1700000000000); });
afterEach(() => { vi.useRealTimers(); });
async function setup(rounds = 1) {
  const room: RoomState = {
    roomId: 'gomoku-room', roomCode: '123456', hostId: 'p1', status: 'playing', currentRound: 1, createdAt: Date.now(),
    settings: RoomSettingsSchema.parse({ title: 'Gomoku', gameId: 'gomoku', totalRounds: rounds }),
    players: ['p1', 'p2'].map((id, i) => ({ id, nickname: id, avatar: '', isHost: i === 0, isReady: true, isOnline: true, score: 0, micMuted: true })),
  };
  const data = { room, game: initGomoku(room.players, room.settings, 'match') as GomokuState | null,
    matchId: 'match', messages: [], disconnected: {} as Record<string, number>, tickets: {}, redo: [], archivedTurns: [] };
  const sockets = room.players.map(player => {
    let attachment = { userId: player.id, seq: 0, second: 0, count: 0, chats: 0 };
    const socket = { readyState: 1, frames: [] as Array<{ topic: string; payload: any }>,
      deserializeAttachment: () => attachment, serializeAttachment: (value: typeof attachment) => { attachment = value; },
      send: (raw: string) => socket.frames.push(JSON.parse(raw)), close: vi.fn(() => { socket.readyState = 3; }) };
    return socket;
  });
  const statements: Array<{ sql: string; args: unknown[] }> = [];
  const db = { prepare: (sql: string) => ({ bind: (...args: unknown[]) => {
    const query = { sql, args, run: vi.fn(async () => ({})), first: vi.fn(async () => null) }; statements.push(query); return query;
  } }), batch: vi.fn(async () => []) };
  const storage = { get: async () => data, put: vi.fn(), getAlarm: async () => Date.now() + 500, setAlarm: vi.fn(), deleteAlarm: vi.fn() };
  let ready!: Promise<unknown>;
  const state = { blockConcurrencyWhile: (fn: () => Promise<unknown>) => { ready = fn(); }, storage,
    getWebSockets: (id?: string) => sockets.filter(socket => socket.readyState === 1 && (!id || socket.deserializeAttachment().userId === id)) };
  const create = async () => { const instance = new GameRoomDO(state as unknown as DurableObjectState, { DB: db, JWT_SECRET: 'local-test-secret' } as any); await ready; return instance; };
  let instance = await create();
  const send = async (topic: string, payload: unknown = {}, sender = 0) => {
    await instance.webSocketMessage(sockets[sender] as unknown as WebSocket, JSON.stringify({ topic, payload }));
  };
  const action = (topic: string, payload: object = {}, sender = 0) => send(topic, { revision: data.game!.revision, ...payload }, sender);
  return { data, sockets, db, statements, storage, state, send, action, get instance() { return instance; }, restore: async () => { instance = await create(); } };
}
it('synchronizes one authoritative move to both clients and rejects stale retries and wrong-game guesses', async () => {
  const s = await setup();
  await s.action('gomoku:place', { x: 7, y: 7 });
  for (const socket of s.sockets) expect(socket.frames.find(frame => frame.topic === 'game:state_sync')?.payload.moves).toHaveLength(1);
  await s.action('gomoku:place', { x: 8, y: 7, revision: 0 }, 1);
  expect(s.sockets[1].frames.at(-1)?.payload.code).toBe('stale_state');
  await s.send('game:submit_guess', { guess: 'hello' }, 1);
  expect(s.sockets[1].frames.at(-1)?.payload.code).toBe('wrong_game'); expect(s.data.game!.moves).toHaveLength(1);
});
it('sends tactical hints privately without inserting a stone or broadcasting the hint', async () => {
  const s = await setup(); await s.action('gomoku:hint');
  expect(s.sockets[0].frames.at(-1)).toMatchObject({ topic: 'gomoku:hint', payload: { x: 7, y: 7, revision: 0 } });
  expect(s.sockets[1].frames.some(frame => frame.topic === 'gomoku:hint')).toBe(false); expect(s.data.game!.moves).toEqual([]);
});
it('Gomoku chat and emoji remain ordinary chat and never trigger drawing guess logic', async () => {
  const s = await setup(); await s.send('chat:send', { content: '💡 hint please', isDanmaku: true }, 1);
  for (const socket of s.sockets) expect(socket.frames.find(frame => frame.topic === 'chat:message')?.payload.payload).toMatchObject({ type: 'danmaku', content: '💡 hint please' });
  expect(s.sockets[1].frames.some(frame => frame.topic === 'game:guess_result')).toBe(false);
});
it('records a real win once, stays in the room and restarts with both players and new readiness', async () => {
  const s = await setup(); await s.action('gomoku:resign', {}, 1);
  expect(s.data.room.status).toBe('settlement'); expect(s.data.room.players).toHaveLength(2);
  expect(s.db.batch).toHaveBeenCalledTimes(1);
  const record = s.statements.find(statement => statement.sql.includes('INTO match_records'))!;
  expect(record.args.slice(0, 5)).toEqual(['match', 'gomoku-room', 'p1', 'p1', 1]);
  const participants = s.statements.filter(statement => statement.sql.includes('INTO match_participants'));
  expect(participants.map(statement => statement.args.slice(1))).toEqual([['p1', 1, 1, 0, 0], ['p2', 0, 0, 0, 0]]);
  await s.instance.alarm(); expect(s.db.batch).toHaveBeenCalledTimes(1);
  await s.send('room:restart', {}, 1); expect(s.data.room.status).toBe('settlement');
  await s.send('room:restart'); expect(s.data.game).toBeNull(); expect(s.data.room.status).toBe('waiting');
  expect(s.data.room.players.map(player => player.isReady)).toEqual([true, false]);
  await s.send('room:ready_toggle', {}, 1); await s.send('room:start_game');
  expect(s.data.game?.gameId).toBe('gomoku'); expect(s.data.game?.matchId).not.toBe('match'); expect(s.data.room.players).toHaveLength(2);
});
it('agreed draws persist null winners and no participant wins', async () => {
  const s = await setup(); await s.action('gomoku:request_draw');
  await s.action('gomoku:reply', { requestId: s.data.game!.pendingRequest!.id, accept: true }, 1);
  const record = s.statements.find(statement => statement.sql.includes('INTO match_records'))!;
  expect(record.args.slice(2, 4)).toEqual([null, null]);
  expect(s.statements.filter(statement => statement.sql.includes('INTO match_participants')).map(statement => statement.args[3])).toEqual([0, 0]);
});
it('retries failed result persistence instead of losing the match or recording duplicate wins', async () => {
  const s = await setup(); s.db.batch.mockRejectedValueOnce(new Error('DB temporarily unavailable'));
  await s.action('gomoku:resign'); expect(s.data.game!.status).toBe('game_over'); expect(s.data.room.status).toBe('playing');
  expect(s.storage.put).toHaveBeenCalledWith('snapshot', s.data);
  await s.restore();
  await s.instance.alarm(); expect(s.db.batch).toHaveBeenCalledTimes(2); expect(s.data.room.status).toBe('settlement');
  expect(s.statements.filter(statement => statement.sql.includes('INTO match_')).every(statement => statement.sql.includes('OR IGNORE'))).toBe(true);
});
it('restores the durable board, revision and consent after object recreation', async () => {
  const s = await setup(); await s.action('gomoku:place', { x: 7, y: 7 }); await s.action('gomoku:request_undo');
  const requestId = s.data.game!.pendingRequest!.id; await s.restore();
  await s.action('gomoku:reply', { requestId, accept: true }, 1);
  expect(s.data.game!.moves).toEqual([]); expect(s.data.game!.currentTurn).toBe('black'); expect(s.storage.put).toHaveBeenCalled();
});
it('allows a disconnected player 30 seconds and then forfeits the entire match with both original participants recorded', async () => {
  const s = await setup(5); await s.instance.webSocketClose(s.sockets[1] as unknown as WebSocket, 1000, 'Disconnected');
  vi.advanceTimersByTime(29999); await s.instance.alarm(); expect(s.data.room.players).toHaveLength(2); expect(s.data.game!.status).toBe('playing');
  vi.advanceTimersByTime(1); await s.instance.alarm();
  expect(s.data.room.players).toHaveLength(1); expect(s.data.game).toMatchObject({ status: 'game_over', matchWinnerId: 'p1', resultReason: 'leave' });
  expect(s.statements.filter(statement => statement.sql.includes('INTO match_participants'))).toHaveLength(2);
});
it('keeps reconnection inside the grace period from forfeiting or resetting the board', async () => {
  const s = await setup(); await s.action('gomoku:place', { x: 7, y: 7 }); const deadline = s.data.game!.deadline;
  await s.instance.webSocketClose(s.sockets[1] as unknown as WebSocket, 1000, 'Disconnected');
  vi.advanceTimersByTime(29000);
  s.sockets[1].readyState = 1; s.data.room.players[1].isOnline = true; delete s.data.disconnected.p2;
  await s.instance.alarm(); expect(s.data.game!.moves).toHaveLength(1); expect(s.data.game!.deadline).toBe(deadline); expect(s.data.room.players).toHaveLength(2);
});
it('locks the room game type while allowing actual Gomoku settings', async () => {
  const s = await setup(); s.data.room.status = 'waiting'; s.data.game = null;
  await s.send('room:settings_update', { ...s.data.room.settings, gameId: 'draw-and-guess', maxPlayers: 8 });
  expect(s.sockets[0].frames.at(-1)?.payload.code).toBe('wrong_game'); expect(s.data.room.settings.gameId).toBe('gomoku');
  await s.send('room:settings_update', { ...s.data.room.settings, totalRounds: 5, drawDuration: 30 });
  expect(s.data.room.settings).toMatchObject({ totalRounds: 5, drawDuration: 30 });
});
