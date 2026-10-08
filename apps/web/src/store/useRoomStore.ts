import { create } from 'zustand';
import { RoomState, ChatMessage, DanmakuItem } from '@idavoll/protocol';
import { ConnectionState } from '@idavoll/client-core';
import { sendRoomAction } from '../services/room-session';

export interface RoomStore {
  room: RoomState | null;
  messages: ChatMessage[];
  danmakus: DanmakuItem[];
  connectionState: ConnectionState;
  error: string | null;
  isMuted: boolean;
  isDeafened: boolean;
  speakingUserIds: string[];
  voiceStatus: 'off' | 'connecting' | 'connected' | 'error';
  voiceError: string | null;
  voiceMode: 'open' | 'hold';
  setRoom: (room: RoomState | null) => void;
  addMessage: (message: ChatMessage) => void;
  clearError: () => void;
  togglePlayerReady: () => void;
  startGame: () => void;
  restartGame: () => void;
  sendMessage: (content: string, isDanmaku?: boolean) => void;
  updateSettings: (settings: RoomState['settings']) => void;
}
export const useRoomStore = create<RoomStore>((set) => ({
  room: null, messages: [], danmakus: [], connectionState: 'disconnected', error: null,
  isMuted: true, isDeafened: false, speakingUserIds: [], voiceStatus: 'off', voiceError: null, voiceMode: 'open',
  setRoom: room => set({ room }),
  addMessage: message => set(s => ({
    messages: s.messages.some(m => m.payload.id === message.payload.id) ? s.messages : [...s.messages.slice(-99), message],
    danmakus: message.payload.isDanmaku ? [...s.danmakus.slice(-29), { id: message.payload.id, text: message.payload.content, color: message.payload.color || '#5B5BF0', fontSize: 16, topPercent: Math.random() * 70 + 15, senderNickname: message.payload.senderNickname, timestamp: message.timestamp }] : s.danmakus,
  })),
  clearError: () => set({ error: null }),
  togglePlayerReady: () => { sendRoomAction('room:ready_toggle', {}); },
  startGame: () => { sendRoomAction('room:start_game', {}); },
  restartGame: () => { sendRoomAction('room:restart', {}); },
  sendMessage: (content, isDanmaku = false) => { sendRoomAction('chat:send', { content, isDanmaku }); },
  updateSettings: settings => { sendRoomAction('room:settings_update', settings); },
}));
