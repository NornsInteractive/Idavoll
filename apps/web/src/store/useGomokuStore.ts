import { create } from 'zustand';
import { GomokuHint, GomokuState } from '@idavoll/protocol';
import { sendRoomAction } from '../services/room-session';

interface GomokuStore {
  gameState: GomokuState | null;
  hint: GomokuHint | null;
  resultDialogOpen: boolean;
  setGameState: (game: GomokuState | null) => void;
  setHint: (hint: GomokuHint) => void;
  dismissResult: () => void;
  placeStone: (x: number, y: number) => void;
  requestUndo: () => void;
  requestDraw: () => void;
  replyRequest: (accept: boolean) => void;
  resign: () => void;
  requestHint: () => void;
}
function action(topic: string, payload: Record<string, unknown> = {}) {
  const game = useGomokuStore.getState().gameState;
  if (game?.status === 'playing') sendRoomAction(topic, { ...payload, revision: game.revision });
}
export const useGomokuStore = create<GomokuStore>(set => ({
  gameState: null, hint: null, resultDialogOpen: false,
  setGameState: gameState => set(previous => ({
    gameState,
    hint: gameState?.matchId === previous.gameState?.matchId && gameState?.revision === previous.hint?.revision ? previous.hint : null,
    resultDialogOpen: gameState?.status === 'game_over' && (previous.gameState?.matchId !== gameState.matchId || previous.gameState?.status !== 'game_over' || previous.resultDialogOpen),
  })),
  setHint: hint => set(previous => ({ hint: previous.gameState?.status === 'playing' && previous.gameState.revision === hint.revision ? hint : null })),
  dismissResult: () => set({ resultDialogOpen: false }),
  placeStone: (x, y) => action('gomoku:place', { x, y }),
  requestUndo: () => action('gomoku:request_undo'),
  requestDraw: () => action('gomoku:request_draw'),
  replyRequest: accept => {
    const request = useGomokuStore.getState().gameState?.pendingRequest;
    if (request) action('gomoku:reply', { requestId: request.id, accept });
  },
  resign: () => action('gomoku:resign'),
  requestHint: () => action('gomoku:hint'),
}));
