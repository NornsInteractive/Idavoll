import {
  RoomState,
  UserProfile,
  RoomSettings,
  DrawStroke,
  ChatMessage,
  DanmakuItem,
} from '@idavoll/protocol';
import { DrawAndGuessGameModule } from '@idavoll/game-draw-and-guess';

export class GameRoomDO implements DurableObject {
  private roomState: RoomState | null = null;
  private gameModule = new DrawAndGuessGameModule();
  private gameState: any = null;
  private seq = 0;

  constructor(private state: DurableObjectState, private env: any) {
    this.state.blockConcurrencyWhile(async () => {
      const stored = await this.state.storage.get<RoomState>('roomState');
      if (stored) {
        this.roomState = stored;
        this.gameState = await this.state.storage.get('gameState');
        this.seq = (await this.state.storage.get<number>('seq')) || 0;
      }
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.headers.get('Upgrade') === 'websocket') {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      const playerId = url.searchParams.get('playerId') || `user_${Math.random().toString(36).slice(2, 7)}`;
      const nickname = url.searchParams.get('nickname') || '玩家';
      const avatar = url.searchParams.get('avatar') || '';

      this.state.acceptWebSocket(server, [playerId]);
      await this.handlePlayerJoin(playerId, nickname, avatar, server);

      return new Response(null, { status: 101, webSocket: client });
    }

    if (url.pathname === '/state') {
      return Response.json({ roomState: this.roomState, gameState: this.gameState });
    }

    return new Response('Not found', { status: 404 });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    if (typeof message !== 'string') return;

    try {
      const parsed = JSON.parse(message);
      const { topic, payload } = parsed;
      const tags = this.state.getTags(ws);
      const senderId = tags[0];

      if (topic === 'chat:send') {
        const chatMsg: ChatMessage = {
          version: 'v1',
          seq: ++this.seq,
          timestamp: Date.now(),
          senderId,
          type: 'chat:message',
          payload: {
            id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            type: payload.isDanmaku ? 'danmaku' : 'text',
            content: payload.content,
            senderNickname: payload.senderNickname || '玩家',
            senderAvatar: payload.senderAvatar || '',
            isDanmaku: !!payload.isDanmaku,
          },
        };
        this.broadcast('chat:message', chatMsg);

        // If in game drawing state, also treat chat messages as guesses
        if (this.gameState && this.gameState.status === 'drawing' && senderId !== this.gameState.drawerId) {
          const result = this.gameModule.handleAction(
            this.gameState,
            { type: 'submit_guess', guess: payload.content },
            senderId,
            this.createHostStub()
          );
          this.gameState = result.state;
          await this.state.storage.put('gameState', this.gameState);

          if (result.effects?.some((e: any) => e.type === 'correct_guess')) {
            const systemMsg: ChatMessage = {
              version: 'v1',
              seq: ++this.seq,
              timestamp: Date.now(),
              senderId: 'system',
              type: 'chat:message',
              payload: {
                id: `sys_${Date.now()}`,
                type: 'correct_guess',
                content: `🎉 ${payload.senderNickname} 猜对了！`,
                senderNickname: '系统',
                senderAvatar: '',
                isDanmaku: false,
              },
            };
            this.broadcast('chat:message', systemMsg);
            this.broadcast('game:state_sync', this.gameState);
          }
        }
      }

      if (topic === 'draw:stroke') {
        this.broadcast('draw:stroke', payload);
        if (this.gameState) {
          this.gameState.strokes = [...(this.gameState.strokes || []), payload];
          await this.state.storage.put('gameState', this.gameState);
        }
      }

      if (topic === 'draw:clear') {
        if (this.gameState) {
          this.gameState.strokes = [];
          await this.state.storage.put('gameState', this.gameState);
        }
        this.broadcast('draw:clear', {});
      }

      if (topic === 'room:ready_toggle') {
        if (this.roomState) {
          const p = this.roomState.players.find((pl) => pl.id === senderId);
          if (p) {
            p.isReady = !p.isReady;
            await this.state.storage.put('roomState', this.roomState);
            this.broadcast('room:state_sync', this.roomState);
          }
        }
      }

      if (topic === 'room:start_game') {
        if (this.roomState && this.roomState.hostId === senderId) {
          this.roomState.status = 'playing';
          this.gameState = this.gameModule.initGame(this.roomState.players, this.roomState.settings);
          await this.state.storage.put('roomState', this.roomState);
          await this.state.storage.put('gameState', this.gameState);
          this.broadcast('room:state_sync', this.roomState);
          this.broadcast('game:state_sync', this.gameState);

          // Schedule alarm for round timer
          await this.state.storage.setAlarm(Date.now() + 1000);
        }
      }

      if (topic === 'game:choose_word') {
        if (this.gameState && this.gameState.drawerId === senderId) {
          const res = this.gameModule.handleAction(
            this.gameState,
            { type: 'choose_word', word: payload.word },
            senderId,
            this.createHostStub()
          );
          this.gameState = res.state;
          await this.state.storage.put('gameState', this.gameState);
          this.broadcast('game:state_sync', this.gameState);
        }
      }
    } catch (err) {
      console.error('Error handling WebSocket message:', err);
    }
  }

  async alarm() {
    if (this.gameState && this.roomState?.status === 'playing') {
      this.gameState = this.gameModule.onTick(this.gameState, 1, this.createHostStub());
      await this.state.storage.put('gameState', this.gameState);
      this.broadcast('game:state_sync', this.gameState);

      if (this.gameState.status !== 'game_over') {
        await this.state.storage.setAlarm(Date.now() + 1000);
      } else {
        this.roomState.status = 'settlement';
        await this.state.storage.put('roomState', this.roomState);
        this.broadcast('room:state_sync', this.roomState);
      }
    }
  }

  async webSocketClose(ws: WebSocket) {
    const tags = this.state.getTags(ws);
    const playerId = tags[0];
    if (playerId && this.roomState) {
      const p = this.roomState.players.find((pl) => pl.id === playerId);
      if (p) p.isOnline = false;
      await this.state.storage.put('roomState', this.roomState);
      this.broadcast('room:state_sync', this.roomState);
    }
  }

  private async handlePlayerJoin(playerId: string, nickname: string, avatar: string, ws: WebSocket) {
    if (!this.roomState) {
      this.roomState = {
        roomId: `room_${Math.random().toString(36).slice(2, 8)}`,
        roomCode: Math.floor(100000 + Math.random() * 900000).toString(),
        hostId: playerId,
        status: 'waiting',
        settings: {
          title: `${nickname} 的房间`,
          gameId: 'draw-and-guess',
          maxPlayers: 8,
          drawDuration: 60,
          totalRounds: 3,
          wordDifficulty: 'medium',
          isPrivate: false,
        },
        players: [],
        currentRound: 1,
        createdAt: Date.now(),
      };
    }

    let existing = this.roomState.players.find((p) => p.id === playerId);
    if (!existing) {
      existing = {
        id: playerId,
        nickname,
        avatar,
        isHost: this.roomState.players.length === 0,
        isReady: this.roomState.players.length === 0,
        isOnline: true,
        score: 0,
        micMuted: false,
      };
      this.roomState.players.push(existing);
    } else {
      existing.isOnline = true;
    }

    await this.state.storage.put('roomState', this.roomState);

    // Send initial state to newly joined player
    ws.send(JSON.stringify({ topic: 'room:state_sync', payload: this.roomState }));
    if (this.gameState) {
      ws.send(JSON.stringify({ topic: 'game:state_sync', payload: this.gameState }));
    }

    // Broadcast update to other players
    this.broadcast('room:state_sync', this.roomState);
  }

  private broadcast(topic: string, payload: unknown) {
    const msg = JSON.stringify({ topic, payload, seq: ++this.seq, timestamp: Date.now() });
    for (const ws of this.state.getWebSockets()) {
      try {
        ws.send(msg);
      } catch {
        // Ignored
      }
    }
  }

  private createHostStub() {
    return {
      getRoomState: () => this.roomState!,
      broadcast: (topic: string, data: unknown) => this.broadcast(topic, data),
      sendTo: () => {},
      scheduleTimer: () => '',
      cancelTimer: () => {},
      kickPlayer: () => {},
    };
  }
}
