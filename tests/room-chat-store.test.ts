import { beforeEach, expect, it, vi } from 'vitest';
import type { ChatMessage } from '../packages/protocol/src';

vi.mock('../apps/web/src/services/room-session', () => ({ sendRoomAction: vi.fn() }));

import { sendRoomAction } from '../apps/web/src/services/room-session';
import { useRoomStore } from '../apps/web/src/store/useRoomStore';

const message = (id: string, isDanmaku = true): ChatMessage => ({
  version: 'v1', seq: 1, timestamp: Date.now(), senderId: 'player', type: 'chat:message',
  payload: { id, type: isDanmaku ? 'danmaku' : 'text', content: id, senderNickname: 'Player', senderAvatar: '', isDanmaku },
});

beforeEach(() => {
  useRoomStore.setState({ room: null, messages: [], danmakus: [] });
  vi.clearAllMocks();
});

it('adds shared game chat to the log and danmaku queue once per message id', () => {
  const incoming = message('hello');
  useRoomStore.getState().addMessage(incoming);
  useRoomStore.getState().addMessage(incoming);
  expect(useRoomStore.getState().messages).toEqual([incoming]);
  expect(useRoomStore.getState().danmakus.map(item => item.id)).toEqual(['hello']);
});

it('keeps message order and queue limits without turning normal messages into danmaku', () => {
  for (let i = 0; i < 110; i++) useRoomStore.getState().addMessage(message(String(i)));
  const normal = message('ordinary', false);
  useRoomStore.getState().addMessage(normal);
  const state = useRoomStore.getState();
  expect(state.messages).toHaveLength(100);
  expect(state.messages[0].payload.id).toBe('11');
  expect(state.messages.at(-1)).toEqual(normal);
  expect(state.danmakus.map(item => item.id)).toEqual(Array.from({ length: 30 }, (_, i) => String(i + 80)));
});

it('sends chat with an explicit danmaku flag and preserves the default ordinary chat channel', () => {
  useRoomStore.getState().sendMessage('hello', true);
  useRoomStore.getState().sendMessage('hint request');
  expect(vi.mocked(sendRoomAction).mock.calls).toEqual([
    ['chat:send', { content: 'hello', isDanmaku: true }],
    ['chat:send', { content: 'hint request', isDanmaku: false }],
  ]);
});
