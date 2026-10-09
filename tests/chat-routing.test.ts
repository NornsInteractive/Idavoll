import { expect, it, vi } from 'vitest';
import { GameRoomDO } from '../apps/server/src/room-do';
import { DrawAndGuessGameModule } from '../packages/games/draw-and-guess/src';
import { RoomSettingsSchema, type RoomState } from '../packages/protocol/src';

async function setup() {
  const room: RoomState = {
    roomId: 'chat-room', roomCode: '123456', hostId: 'p1', status: 'playing', currentRound: 1, createdAt: Date.now(),
    settings: RoomSettingsSchema.parse({ title: '聊天路由', maxPlayers: 8, totalRounds: 2, drawDuration: 60, wordDifficulty: 'easy', isPrivate: false }),
    players: ['p1', 'p2', 'p3'].map((id, i) => ({ id, nickname: id, avatar: '', isHost: i === 0, isReady: true, isOnline: true, score: 0, micMuted: true })),
  };
  const data = {
    room,
    game: { ...new DrawAndGuessGameModule().initGame(room.players, room.settings), status: 'drawing' as const,
      secretWord: '苹果', currentWordLength: 2, timeLeft: 60, deadline: Date.now() + 60000 },
    messages: [], matchId: 'test-match', disconnected: {}, tickets: {}, redo: [], archivedTurns: [],
  };
  const sockets = room.players.map(p => {
    let attachment = { userId: p.id, seq: 0, second: 0, count: 0, chats: 0 };
    const frames: Array<{ topic: string; payload: any }> = [];
    return { readyState: 1, frames, deserializeAttachment: () => attachment,
      serializeAttachment: (value: typeof attachment) => { attachment = value; },
      send: (raw: string) => frames.push(JSON.parse(raw)), close: vi.fn() };
  });
  let ready!: Promise<unknown>;
  const state = {
    blockConcurrencyWhile: (fn: () => Promise<unknown>) => { ready = fn(); },
    storage: { get: async () => data, put: vi.fn(), getAlarm: async () => Date.now() + 500, setAlarm: vi.fn() },
    getWebSockets: (id?: string) => sockets.filter(ws => !id || ws.deserializeAttachment().userId === id),
  };
  const doRoom = new GameRoomDO(state as unknown as DurableObjectState, {} as any);
  await ready;
  const send = async (topic: string, payload: unknown, sender = 1) => {
    await doRoom.webSocketMessage(sockets[sender] as unknown as WebSocket, JSON.stringify({ topic, payload }));
    return sockets[sender].frames;
  };
  return { data, sockets, send };
}

it.each([['申请提示 💡', false], ['💡 求提示', true], ['👏', true]])('普通消息 %s 不计猜词、不发送猜词反馈', async (content, isDanmaku) => {
  const { data, sockets, send } = await setup();
  const frames = await send('chat:send', { content, isDanmaku });
  expect(frames.some(f => f.topic === 'game:guess_result')).toBe(false);
  expect(data.game.guesses).toEqual({});
  expect(data.game.scores.every(s => s.score === 0 && !s.hasGuessedCorrectly)).toBe(true);
  for (const ws of sockets) {
    expect(ws.frames.find(f => f.topic === 'chat:message')?.payload.payload).toMatchObject({ content, type: isDanmaku ? 'danmaku' : 'text' });
  }
});

it('错误猜词仍计入尝试并返回真实猜词反馈', async () => {
  const { data, send } = await setup();
  const frames = await send('game:submit_guess', { guess: '没猜到' });
  expect(data.game.guesses).toEqual({ p2: 1 });
  expect(frames.find(f => f.topic === 'game:guess_result')?.payload).toEqual({ correct: false, earned: 0 });
  expect(frames.find(f => f.topic === 'chat:message')?.payload.payload.type).toBe('guess');
});

it('正确猜词加分且广播不泄露答案', async () => {
  const { data, sockets, send } = await setup();
  const frames = await send('game:submit_guess', { guess: '苹果' });
  expect(data.game.guesses).toEqual({ p2: 1 });
  expect(data.game.correctGuesses).toEqual({ p2: 1 });
  expect(frames.find(f => f.topic === 'game:guess_result')?.payload.correct).toBe(true);
  expect(data.game.scores.find(s => s.playerId === 'p2')?.score).toBeGreaterThan(0);
  for (const ws of sockets) {
    const chat = ws.frames.find(f => f.topic === 'chat:message');
    expect(chat?.payload.payload.type).toBe('correct_guess');
    expect(JSON.stringify(chat)).not.toContain('苹果');
  }
});

it.each(['苹果', '答案是苹果'])('普通聊天不能公布答案：%s', async content => {
  const { data, send } = await setup();
  const frames = await send('chat:send', { content });
  expect(frames.find(f => f.topic === 'error')?.payload.message).toBe('本回合结束前请不要公布答案');
  expect(frames.some(f => ['chat:message', 'game:guess_result'].includes(f.topic))).toBe(false);
  expect(data.game.guesses).toEqual({});
});

it('已猜中的玩家普通聊天不覆盖先前正确反馈', async () => {
  const { data, sockets, send } = await setup();
  await send('game:submit_guess', { guess: '苹果' });
  sockets.forEach(ws => { ws.frames.length = 0; });
  const frames = await send('chat:send', { content: '加油', isDanmaku: true });
  expect(frames.some(f => f.topic === 'game:guess_result')).toBe(false);
  expect(data.game.guesses).toEqual({ p2: 1 });
});
