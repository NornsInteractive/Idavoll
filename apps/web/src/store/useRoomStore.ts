import { create } from 'zustand';
import { RoomState, ChatMessage, DanmakuItem, UserProfile } from '@idavoll/protocol';

export interface RoomStore {
  room: RoomState | null;
  messages: ChatMessage[];
  danmakus: DanmakuItem[];
  isMuted: boolean;
  speakingUserIds: string[];
  setRoom: (room: RoomState | null) => void;
  updatePlayers: (players: UserProfile[]) => void;
  addMessage: (msg: ChatMessage) => void;
  addDanmaku: (d: DanmakuItem) => void;
  toggleMute: () => void;
  setSpeakingUsers: (ids: string[]) => void;
  togglePlayerReady: (playerId: string) => void;
  initDemoRoom: (currentUserId: string, currentNickname: string, currentAvatar: string) => void;
}

export const useRoomStore = create<RoomStore>((set, get) => ({
  room: null,
  messages: [],
  danmakus: [],
  isMuted: true,
  speakingUserIds: [],

  setRoom: (room) => set({ room }),

  updatePlayers: (players) =>
    set((state) => (state.room ? { room: { ...state.room, players } } : {})),

  addMessage: (msg) =>
    set((state) => ({
      messages: [...state.messages.slice(-50), msg],
    })),

  addDanmaku: (d) =>
    set((state) => ({
      danmakus: [...state.danmakus.slice(-30), d],
    })),

  toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),

  setSpeakingUsers: (speakingUserIds) => set({ speakingUserIds }),

  togglePlayerReady: (playerId) =>
    set((state) => {
      if (!state.room) return {};
      const updated = state.room.players.map((p) =>
        p.id === playerId ? { ...p, isReady: !p.isReady } : p
      );
      return { room: { ...state.room, players: updated } };
    }),

  initDemoRoom: (currentUserId, currentNickname, currentAvatar) => {
    const demoPlayers: UserProfile[] = [
      {
        id: currentUserId,
        nickname: currentNickname,
        avatar: currentAvatar,
        isHost: true,
        isReady: true,
        isOnline: true,
        score: 180,
        micMuted: false,
      },
      {
        id: 'usr_bot_1',
        nickname: '画画小能手',
        avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Painter',
        isHost: false,
        isReady: true,
        isOnline: true,
        score: 140,
        micMuted: false,
      },
      {
        id: 'usr_bot_2',
        nickname: '猜词神算子',
        avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Oracle',
        isHost: false,
        isReady: true,
        isOnline: true,
        score: 95,
        micMuted: true,
      },
      {
        id: 'usr_bot_3',
        nickname: '涂鸦萌新',
        avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Noob',
        isHost: false,
        isReady: false,
        isOnline: true,
        score: 60,
        micMuted: false,
      },
    ];

    const demoRoom: RoomState = {
      roomId: 'room_idavoll_demo',
      roomCode: '886928',
      hostId: currentUserId,
      status: 'waiting',
      settings: {
        title: '周五下班嗨玩画画局',
        gameId: 'draw-and-guess',
        maxPlayers: 8,
        drawDuration: 60,
        totalRounds: 3,
        wordDifficulty: 'medium',
        isPrivate: false,
      },
      players: demoPlayers,
      currentRound: 1,
      createdAt: Date.now(),
    };

    set({
      room: demoRoom,
      messages: [
        {
          version: 'v1',
          seq: 1,
          timestamp: Date.now() - 30000,
          senderId: 'system',
          type: 'chat:message',
          payload: {
            id: 'sys_1',
            type: 'system',
            content: '欢迎进入房间！房主可调整房间参数并开启游戏。',
            senderNickname: '系统',
            senderAvatar: '',
            isDanmaku: false,
          },
        },
        {
          version: 'v1',
          seq: 2,
          timestamp: Date.now() - 15000,
          senderId: 'usr_bot_1',
          type: 'chat:message',
          payload: {
            id: 'msg_2',
            type: 'text',
            content: '哈喽大家好！今晚我当画手绝不放水~ 🎨',
            senderNickname: '画画小能手',
            senderAvatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Painter',
            isDanmaku: false,
          },
        },
      ],
      danmakus: [],
    });
  },
}));
