import { UserAccount, UserStats, RoomSettings, RoomSummary, MatchRecord, DrawingRecord, DrawStroke, GameId } from '@idavoll/protocol';
import { useUserStore } from '../store/useUserStore';

export const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
export class ApiError extends Error { constructor(message: string, public status: number) { super(message); } }
export async function api<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const token = useUserStore.getState().token;
  const response = await fetch(`${API_BASE}${path}`, { method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(15000) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && useUserStore.getState().token === token) useUserStore.getState().logout();
    throw new ApiError(result.error || '请求失败，请重试', response.status);
  }
  return result as T;
}
export const guestLogin = (nickname: string, avatar: string) => api<{ user: UserAccount; token: string }>('/auth/guest', 'POST', { nickname, avatar });
export const fetchProfile = () => api<{ user: UserAccount; stats: UserStats }>('/me');
export const saveProfile = (nickname: string, avatar: string) => api<{ user: UserAccount }>('/me', 'PATCH', { nickname, avatar });
export const fetchRooms = () => api<{ rooms: RoomSummary[] }>('/rooms');
export const createRoom = (settings: RoomSettings) => api<{ roomId: string }>('/rooms', 'POST', settings);
export const joinRoom = (idOrCode: string, password?: string) => api<{ roomId: string; roomCode: string; ticket: string }>(`/rooms/${encodeURIComponent(idOrCode)}/join`, 'POST', { password });
export const quickMatch = (gameId: GameId = 'draw-and-guess') => api<{ roomId: string; roomCode: string; ticket: string }>('/rooms/match', 'POST', { gameId });
export const fetchPresence = () => api<{ onlineCount: number }>('/presence');
export const heartbeat = () => api<{ ok: boolean }>('/presence', 'POST', {});
export const fetchMatches = () => api<{ matches: MatchRecord[] }>('/me/matches');
export const fetchDrawings = () => api<{ drawings: DrawingRecord[] }>('/me/drawings');
export const fetchDrawing = (id: string) => api<{ word: string; strokes: DrawStroke[]; width: number; height: number }>(`/drawings/${encodeURIComponent(id)}`);
