import { beforeEach, expect, it, vi } from 'vitest';
import { initGomoku, handleGomokuAction } from '../apps/server/src/gomoku';
import { RoomSettingsSchema } from '../packages/protocol/src';
vi.mock('../apps/web/src/services/room-session', () => ({ sendRoomAction: vi.fn(() => true) }));
import { useGomokuStore } from '../apps/web/src/store/useGomokuStore';
import { sendRoomAction } from '../apps/web/src/services/room-session';
const game = () => initGomoku(['p1', 'p2'].map((id, i) => ({ id, nickname: id, avatar: '', isHost: i === 0, isReady: true, isOnline: true, score: 0, micMuted: true })), RoomSettingsSchema.parse({ title: 'Gomoku', gameId: 'gomoku', totalRounds: 1 }), 'm');
beforeEach(() => { useGomokuStore.getState().setGameState(null); vi.clearAllMocks(); });
it('sends the server revision and does not invent a local move', () => {
  const state = game(); useGomokuStore.getState().setGameState(state);
  useGomokuStore.getState().placeStone(7, 7);
  expect(sendRoomAction).toHaveBeenCalledExactlyOnceWith('gomoku:place', { x: 7, y: 7, revision: state.revision });
  expect(useGomokuStore.getState().gameState?.moves).toEqual([]);
});
it('retains hints through clock updates but discards them after any board revision', () => {
  const state = game(); useGomokuStore.getState().setGameState(state);
  useGomokuStore.getState().setHint({ x: 7, y: 7, revision: 0 });
  useGomokuStore.getState().setGameState({ ...state, timeLeft: 59 });
  expect(useGomokuStore.getState().hint).not.toBeNull();
  useGomokuStore.getState().setGameState({ ...state, revision: 1 });
  expect(useGomokuStore.getState().hint).toBeNull();
  useGomokuStore.getState().setHint({ x: 7, y: 7, revision: 0 }); expect(useGomokuStore.getState().hint).toBeNull();
});
it('keeps a dismissed same-match result closed, opens a new result and never leaves the room', () => {
  const state = handleGomokuAction(game(), { topic: 'gomoku:resign', payload: { revision: 0 } }, 'p1');
  useGomokuStore.getState().setGameState(state); expect(useGomokuStore.getState().resultDialogOpen).toBe(true);
  useGomokuStore.getState().dismissResult(); useGomokuStore.getState().setGameState({ ...state });
  expect(useGomokuStore.getState().resultDialogOpen).toBe(false);
  useGomokuStore.getState().setGameState({ ...state, matchId: 'new-match' }); expect(useGomokuStore.getState().resultDialogOpen).toBe(true);
  useGomokuStore.getState().resign(); expect(sendRoomAction).not.toHaveBeenCalled();
  useGomokuStore.getState().setGameState(null); expect(useGomokuStore.getState().resultDialogOpen).toBe(false);
});
