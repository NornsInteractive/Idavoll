import { GameConnection, WebSocketTransport } from '@idavoll/client-core';
import { RoomState, DrawAndGuessState, ChatMessage, DrawStroke, GomokuState, GomokuHint, isGomokuState } from '@idavoll/protocol';
import { API_BASE, joinRoom } from './api';
import { useRoomStore } from '../store/useRoomStore';
import { useGameStore } from '../store/useGameStore';
import { useGomokuStore } from '../store/useGomokuStore';
import i18n from '../i18n';
import { useUserStore } from '../store/useUserStore';
import { stopVoice, handleVoiceSignal, syncVoicePeers } from './voice';

let connection: GameConnection | null = null;
let currentRoomId = '';
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let generation = 0;
let pending: { identifier: string; promise: Promise<string> } | null = null;
function syncGame(game: DrawAndGuessState | GomokuState | null) {
  useGameStore.getState().setGameState(isGomokuState(game) ? null : game);
  useGomokuStore.getState().setGameState(isGomokuState(game) ? game : null);
}
export function sendRoomAction(topic: string, payload: unknown): boolean {
  if (connection?.send(topic, payload)) return true;
  useRoomStore.setState({ error: i18n.t('roomWaiting.notConnected') });
  return false;
}
export function connectRoom(identifier: string, password?: string, initialTicket?: string): Promise<string> {
  if (pending?.identifier === identifier) return pending.promise;
  if (currentRoomId === identifier && connection && connection.getState() !== 'disconnected') return Promise.resolve(currentRoomId);
  const promise = openRoom(identifier, password, initialTicket);
  pending = { identifier, promise };
  void promise.then(() => { if (pending?.promise === promise) pending = null; }, () => { if (pending?.promise === promise) pending = null; });
  return promise;
}
async function openRoom(identifier: string, password?: string, initialTicket?: string): Promise<string> {
  disconnectRoom();
  const expectedGeneration = generation;
  const joined = initialTicket ? { roomId: identifier, ticket: initialTicket } : await joinRoom(identifier, password);
  if (expectedGeneration !== generation) throw new Error('房间连接已取消');
  currentRoomId = joined.roomId;
  let ticket: string | null = joined.ticket;
  connection = new GameConnection({ maxRetries: 8, transportFactory: () => new WebSocketTransport(async () => {
    const roomId = joined.roomId;
    const value = ticket || (await joinRoom(roomId, password)).ticket;
    ticket = null;
    const url = new URL(`${API_BASE}/rooms/${encodeURIComponent(roomId)}/ws`, window.location.origin);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    url.searchParams.set('ticket', value);
    return url.toString();
  }) });
  connection.onStateChange(state => {
    useRoomStore.setState({ connectionState: state });
    if (state !== 'connected') stopVoice();
    if (state === 'disconnected') useRoomStore.setState({ error: i18n.t('roomWaiting.notConnected') });
  });
  connection.onMessage((topic, payload) => {
    if (topic === 'connection:snapshot') {
      const snapshot = payload as { room: RoomState; game: DrawAndGuessState | GomokuState | null; messages: ChatMessage[] };
      useRoomStore.setState({ room: snapshot.room, messages: snapshot.messages, error: null });
      syncGame(snapshot.game);
    }
    if (topic === 'room:state_sync') { useRoomStore.getState().setRoom(payload as RoomState); syncVoicePeers(); }
    if (topic === 'game:state_sync') syncGame(payload as DrawAndGuessState | GomokuState | null);
    if (topic === 'game:clock') {
      const clock = payload as { gameId?: string; timeLeft: number; deadline: number };
      if (clock.gameId === 'gomoku') {
        const game = useGomokuStore.getState().gameState;
        if (game) useGomokuStore.getState().setGameState({ ...game, timeLeft: clock.timeLeft, deadline: clock.deadline });
      } else {
        const game = useGameStore.getState().gameState;
        if (game) useGameStore.getState().setGameState({ ...game, timeLeft: clock.timeLeft, deadline: clock.deadline });
      }
    }
    if (topic === 'draw:stroke') {
      const stroke = payload as DrawStroke;
      const game = useGameStore.getState().gameState;
      if (game) { const strokes = [...game.strokes]; const index = strokes.findIndex(s => s.id === stroke.id); if (index < 0) strokes.push(stroke); else strokes[index] = stroke; useGameStore.getState().setGameState({ ...game, strokes }); }
    }
    if (topic === 'chat:message') useRoomStore.getState().addMessage(payload as ChatMessage);
    if (topic === 'gomoku:hint') useGomokuStore.getState().setHint(payload as GomokuHint);
    if (topic === 'game:guess_result') useGameStore.setState({ guessResult: { ...(payload as { correct: boolean; earned: number }), timestamp: Date.now() } });
    if (topic === 'voice:signal') void handleVoiceSignal(payload as { senderId: string; signal: RTCSessionDescriptionInit | RTCIceCandidateInit });
    if (topic === 'error') {
      const error = payload as { code?: string; message: string };
      useRoomStore.setState({ error: error.code ? i18n.t(`gomoku.errors.${error.code}`, { defaultValue: error.message }) : error.message });
    }
  });
  connection.connect();
  heartbeatTimer = setInterval(() => { if (connection?.getState() === 'connected') connection.send('room:heartbeat', {}); }, 25000);
  sessionStorage.setItem('idavoll-room-id', currentRoomId);
  return currentRoomId;
}
export function disconnectRoom() {
  generation++;
  pending = null;
  stopVoice();
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  heartbeatTimer = null;
  connection?.disconnect(); connection = null; currentRoomId = '';
  useRoomStore.setState({ room: null, messages: [], danmakus: [], connectionState: 'disconnected', error: null });
  syncGame(null);
  sessionStorage.removeItem('idavoll-room-id');
}
export function leaveRoom() { connection?.send('room:leave', {}); disconnectRoom(); }
export function retryRoom() {
  const roomId = currentRoomId || sessionStorage.getItem('idavoll-room-id');
  if (roomId) return connectRoom(roomId);
  return Promise.reject(new Error('没有可恢复的房间'));
}
useUserStore.subscribe((current, previous) => {
  if (previous.token && (!current.token || previous.id !== current.id)) disconnectRoom();
  else if (current.token && (previous.nickname !== current.nickname || previous.avatar !== current.avatar) && connection?.getState() === 'connected') connection.send('room:heartbeat', {});
});
