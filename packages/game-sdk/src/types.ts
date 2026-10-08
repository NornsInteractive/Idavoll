import { RoomState, UserProfile } from '@idavoll/protocol';

export interface Transport {
  send(message: string): void;
  onMessage(callback: (message: string) => void): () => void;
  onOpen(callback: () => void): () => void;
  onClose(callback: (code: number, reason: string) => void): () => void;
  close(code?: number, reason?: string): void;
}

export interface RoomHost {
  getRoomState(): RoomState;
  broadcast(topic: string, data: unknown): void;
  sendTo(playerId: string, topic: string, data: unknown): void;
  scheduleTimer(name: string, durationMs: number, callback: () => void): string;
  cancelTimer(timerId: string): void;
  kickPlayer(playerId: string): void;
}

export interface AIProvider {
  generateWordCandidates(category: string, difficulty: 'easy' | 'medium' | 'hard', count: number): Promise<string[]>;
  evaluateDrawingSimularity?(imageDataBase64: string, expectedWord: string): Promise<number>;
  generateHint(word: string, currentHintsGiven: number): Promise<string>;
}

export interface GameModule<TState = unknown, TAction = unknown> {
  id: string;
  name: string;
  version: string;
  minPlayers: number;
  maxPlayers: number;
  initGame(players: UserProfile[], settings: unknown): TState;
  handleAction(state: TState, action: TAction, senderId: string, host: RoomHost): { state: TState; effects?: unknown[] };
  onPlayerLeave(state: TState, playerId: string, host: RoomHost): TState;
  onTick?(state: TState, elapsedSeconds: number, host: RoomHost): TState;
}
