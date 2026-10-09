import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { DrawAndGuessState } from '../packages/protocol/src';

vi.mock('../apps/web/src/services/room-session', () => ({ sendRoomAction: vi.fn(() => true) }));
vi.mock('../apps/web/src/store/useUserStore', () => ({ useUserStore: { getState: () => ({ id: 'p1' }) } }));
import { useGameStore } from '../apps/web/src/store/useGameStore';
import { sendRoomAction } from '../apps/web/src/services/room-session';

const result: DrawAndGuessState = {
  status: 'game_over', currentRound: 2, totalRounds: 2, drawerId: 'p1', drawerNickname: '甲', currentWordLength: 2, timeLeft: 0,
  strokes: [], scores: [
    { playerId: 'p1', nickname: '甲', avatar: '', score: 100, hasGuessedCorrectly: false },
    { playerId: 'p2', nickname: '乙', avatar: '', score: 50, hasGuessedCorrectly: false },
  ],
  gamePodium: [
    { playerId: 'p1', nickname: '甲', avatar: '', score: 100, rank: 1, isMvp: true },
    { playerId: 'p2', nickname: '乙', avatar: '', score: 50, rank: 2, isMvp: false },
  ],
};

beforeEach(() => { useGameStore.getState().setGameState(null); vi.clearAllMocks(); });
afterEach(() => { useGameStore.getState().setGameState(null); });

it('收到最终结果即打开弹窗，关闭后保留比分且不发送离房动作', () => {
  useGameStore.getState().setGameState(result);
  expect(useGameStore.getState().resultDialogOpen).toBe(true);
  useGameStore.getState().dismissResult();
  expect(useGameStore.getState().resultDialogOpen).toBe(false);
  expect(useGameStore.getState().gameState).toBe(result);
  expect(sendRoomAction).not.toHaveBeenCalled();
});

it('关闭后的同局重连快照/状态同步不再次打开', () => {
  useGameStore.getState().setGameState(result);
  useGameStore.getState().dismissResult();
  useGameStore.getState().setGameState({ ...result, timeLeft: 0 });
  expect(useGameStore.getState().resultDialogOpen).toBe(false);
});

it('重置或下一局开始清除旧弹窗，下一局结束再次打开', () => {
  useGameStore.getState().setGameState(result);
  useGameStore.getState().dismissResult();
  useGameStore.getState().setGameState(null);
  expect(useGameStore.getState().resultDialogOpen).toBe(false);
  useGameStore.getState().setGameState({ ...result, status: 'selecting_word', currentRound: 1 });
  expect(useGameStore.getState().resultDialogOpen).toBe(false);
  useGameStore.getState().setGameState(result);
  expect(useGameStore.getState().resultDialogOpen).toBe(true);
});

it('中止对局也显示服务器结果；离房清空游戏时关闭弹窗', () => {
  const aborted = { ...result, aborted: true, gamePodium: [] };
  useGameStore.getState().setGameState(aborted);
  expect(useGameStore.getState().resultDialogOpen).toBe(true);
  expect(useGameStore.getState().gameState?.gamePodium).toEqual([]);
  useGameStore.getState().setGameState(null);
  expect(useGameStore.getState().resultDialogOpen).toBe(false);
});
