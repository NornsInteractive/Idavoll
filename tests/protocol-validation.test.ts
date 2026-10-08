import { describe, it, expect } from 'vitest';
import {
  PointSchema,
  DrawStrokeSchema,
  MessageInputSchema,
  ChatMessageSchema,
  RoomSettingsSchema,
  UserProfileSchema,
  DrawAndGuessStateSchema,
} from '../packages/protocol/src';

const stroke = {
  id: 'stroke_1',
  points: [[10, 20, 0.5]] as [number, number, number][],
  color: '#5B5BF0',
  size: 8,
  isEraser: false,
  timestamp: 1_700_000_000_000,
};

const chat = (content: unknown) => ({ topic: 'chat:send', payload: { content } });

describe('协议拒绝 NaN', () => {
  it('拒绝 RoomSettings / UserProfile / Game state 中的 NaN', () => {
    expect(RoomSettingsSchema.safeParse({ title: 'x', maxPlayers: Number.NaN }).success).toBe(false);
    expect(RoomSettingsSchema.safeParse({ title: 'x', drawDuration: Number.NaN }).success).toBe(false);
    expect(UserProfileSchema.safeParse({ id: 'p', nickname: 'n', avatar: '', score: Number.NaN }).success).toBe(false);
    expect(DrawAndGuessStateSchema.safeParse({
      status: 'drawing', currentRound: 1, totalRounds: 1, drawerId: 'p', drawerNickname: 'n',
      strokes: [], timeLeft: Number.NaN, scores: [],
    }).success).toBe(false);
  });

  it('拒绝 DrawStroke 中的 NaN / Infinity', () => {
    expect(DrawStrokeSchema.safeParse({ ...stroke, size: Number.NaN }).success).toBe(false);
    expect(DrawStrokeSchema.safeParse({ ...stroke, size: Number.POSITIVE_INFINITY }).success).toBe(false);
    expect(DrawStrokeSchema.safeParse({ ...stroke, timestamp: Number.NaN }).success).toBe(false);
    expect(PointSchema.safeParse([Number.NaN, 1]).success).toBe(false);
    expect(PointSchema.safeParse([0, Number.POSITIVE_INFINITY]).success).toBe(false);
    expect(MessageInputSchema.safeParse({ topic: 'draw:stroke', payload: { ...stroke, points: [[0, Number.NaN]] } }).success).toBe(false);
  });

  it('拒绝伪造帧里的非数字 seq / timestamp', () => {
    expect(ChatMessageSchema.safeParse({
      version: 'v1', seq: Number.NaN, timestamp: Date.now(), senderId: 'p1', type: 'chat:message',
      payload: { id: 'm', type: 'text', content: 'hi', senderNickname: 'n', senderAvatar: '', isDanmaku: false },
    }).success).toBe(false);
  });
});

describe('协议拒绝超长输入', () => {
  it('拒绝超长聊天 / 猜测 / 选词 / 昵称 / 房间标题', () => {
    expect(MessageInputSchema.safeParse(chat('字'.repeat(301))).success).toBe(false);
    expect(MessageInputSchema.safeParse(chat('字'.repeat(300))).success).toBe(true);
    expect(MessageInputSchema.safeParse({ topic: 'game:submit_guess', payload: { guess: '词'.repeat(301) } }).success).toBe(false);
    expect(MessageInputSchema.safeParse({ topic: 'game:choose_word', payload: { word: '词'.repeat(51) } }).success).toBe(false);
    expect(RoomSettingsSchema.safeParse({ title: '标'.repeat(31) }).success).toBe(false);
    expect(UserProfileSchema.safeParse({ id: 'p', nickname: '名'.repeat(25), avatar: '' }).success).toBe(false);
    expect(MessageInputSchema.safeParse({ topic: 'voice:signal', payload: { targetId: 't', signal: { type: 'offer', sdp: 'a'.repeat(16001) } } }).success).toBe(false);
    expect(MessageInputSchema.safeParse({ topic: 'voice:signal', payload: { targetId: 't'.repeat(101), signal: { candidate: 'c' } } }).success).toBe(false);
  });

  it('拒绝超长绘画点集与非法语音候选', () => {
    const manyPoints = Array.from({ length: 2049 }, () => [1, 1]);
    expect(DrawStrokeSchema.safeParse({ ...stroke, points: manyPoints }).success).toBe(false);
    expect(MessageInputSchema.safeParse({ topic: 'draw:stroke', payload: { ...stroke, points: manyPoints } }).success).toBe(false);
    expect(MessageInputSchema.safeParse({ topic: 'voice:signal', payload: { targetId: 't', signal: { candidate: 'c'.repeat(2001) } } }).success).toBe(false);
  });
});

describe('协议拒绝非法绘画', () => {
  it('拒绝非法颜色 / 越界坐标 / 空点集 / 越界尺寸 / 空 id', () => {
    expect(DrawStrokeSchema.safeParse({ ...stroke, color: 'red' }).success).toBe(false);
    expect(DrawStrokeSchema.safeParse({ ...stroke, color: '#FFF' }).success).toBe(false);
    expect(DrawStrokeSchema.safeParse({ ...stroke, color: '#5B5BF0FF' }).success).toBe(false);
    expect(DrawStrokeSchema.safeParse({ ...stroke, points: [] }).success).toBe(false);
    expect(DrawStrokeSchema.safeParse({ ...stroke, points: [[4097, 0]] }).success).toBe(false);
    expect(DrawStrokeSchema.safeParse({ ...stroke, points: [[-1, 0]] }).success).toBe(false);
    expect(DrawStrokeSchema.safeParse({ ...stroke, size: 0 }).success).toBe(false);
    expect(DrawStrokeSchema.safeParse({ ...stroke, size: 65 }).success).toBe(false);
    expect(DrawStrokeSchema.safeParse({ ...stroke, id: '' }).success).toBe(false);
    expect(DrawStrokeSchema.safeParse({ ...stroke, id: 'i'.repeat(101) }).success).toBe(false);
    expect(DrawStrokeSchema.safeParse({ ...stroke, isEraser: 'yes' }).success).toBe(false);
  });
});

describe('协议拒绝伪造消息', () => {
  it('拒绝未知 topic 与缺失 payload', () => {
    expect(MessageInputSchema.safeParse({ topic: 'admin:shutdown', payload: {} }).success).toBe(false);
    expect(MessageInputSchema.safeParse({ topic: 'room:ban_user', payload: { userId: 'p2' } }).success).toBe(false);
    expect(MessageInputSchema.safeParse({ topic: 'game:submit_guess' }).success).toBe(false);
    expect(MessageInputSchema.safeParse({ topic: 42, payload: {} }).success).toBe(false);
  });

  it('拒绝类型不符与缺失必填字段', () => {
    expect(MessageInputSchema.safeParse({ topic: 'game:submit_guess', payload: { guess: 123 } }).success).toBe(false);
    expect(MessageInputSchema.safeParse({ topic: 'game:submit_guess', payload: { guess: '' } }).success).toBe(false);
    expect(MessageInputSchema.safeParse({ topic: 'game:choose_word', payload: {} }).success).toBe(false);
    expect(MessageInputSchema.safeParse(chat(123)).success).toBe(false);
    expect(MessageInputSchema.safeParse({ topic: 'chat:send', payload: { content: 'ok', isDanmaku: 'yes' } }).success).toBe(false);
    expect(MessageInputSchema.safeParse({ topic: 'voice:state', payload: {} }).success).toBe(false);
    expect(MessageInputSchema.safeParse({ topic: 'draw:stroke', payload: 'not-an-object' }).success).toBe(false);
    expect(MessageInputSchema.safeParse({ topic: 'room:settings_update', payload: { title: '' } }).success).toBe(false);
  });

  it('伪造的 senderId / version / seq 不会进入解析结果', () => {
    const parsed = MessageInputSchema.parse({
      topic: 'chat:send',
      payload: { content: '正常内容' },
      senderId: 'usr_admin',
      version: 'v9',
      seq: 999,
    });
    expect(parsed).not.toHaveProperty('senderId');
    expect(parsed).not.toHaveProperty('version');
    expect(parsed).not.toHaveProperty('seq');
    expect('payload' in parsed && parsed.payload).toMatchObject({ content: '正常内容' });
  });

  it('正例：合法消息可以通过', () => {
    expect(MessageInputSchema.safeParse({ topic: 'room:start_game', payload: {} }).success).toBe(true);
    expect(MessageInputSchema.safeParse({ topic: 'draw:clear' }).success).toBe(true);
    expect(MessageInputSchema.safeParse({ topic: 'draw:stroke', payload: stroke }).success).toBe(true);
    expect(MessageInputSchema.safeParse({ topic: 'voice:state', payload: { muted: true } }).success).toBe(true);
  });
});
