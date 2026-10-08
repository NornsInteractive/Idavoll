import { describe, it, expect } from 'vitest';
import {
  UserProfileSchema,
  RoomSettingsSchema,
  DrawStrokeSchema,
  ChatMessageSchema,
} from '../packages/protocol/src';

describe('Protocol Schemas', () => {
  it('validates a correct UserProfile', () => {
    const validUser = {
      id: 'usr_123',
      nickname: '测试小画家',
      avatar: 'https://example.com/avatar.png',
      isHost: true,
      isReady: true,
      isOnline: true,
      score: 100,
      micMuted: false,
    };
    const parsed = UserProfileSchema.parse(validUser);
    expect(parsed.nickname).toBe('测试小画家');
    expect(parsed.score).toBe(100);
  });

  it('validates RoomSettings with default values', () => {
    const parsed = RoomSettingsSchema.parse({
      title: '周五开黑',
    });
    expect(parsed.maxPlayers).toBe(8);
    expect(parsed.drawDuration).toBe(60);
    expect(parsed.totalRounds).toBe(3);
    expect(parsed.wordDifficulty).toBe('medium');
  });

  it('validates DrawStroke points and colors', () => {
    const stroke = {
      id: 'stroke_001',
      points: [
        [100, 200, 0.5],
        [110, 210, 0.8],
      ],
      color: '#5B5BF0',
      size: 8,
      isEraser: false,
      timestamp: Date.now(),
    };
    const parsed = DrawStrokeSchema.parse(stroke);
    expect(parsed.points.length).toBe(2);
    expect(parsed.color).toBe('#5B5BF0');
  });

  it('validates ChatMessage structure', () => {
    const chat = {
      version: 'v1',
      seq: 1,
      timestamp: Date.now(),
      senderId: 'usr_1',
      type: 'chat:message',
      payload: {
        id: 'msg_1',
        type: 'text',
        content: '西瓜！',
        senderNickname: '小画家',
        senderAvatar: '',
        isDanmaku: false,
      },
    };
    const parsed = ChatMessageSchema.parse(chat);
    expect(parsed.payload.content).toBe('西瓜！');
  });
});
