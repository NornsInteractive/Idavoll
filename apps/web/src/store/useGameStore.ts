import { create } from 'zustand';
import { DrawAndGuessState, DrawStroke } from '@idavoll/protocol';
import { sendRoomAction } from '../services/room-session';
import { useUserStore } from './useUserStore';

export interface GameStore {
  gameState: DrawAndGuessState | null;
  currentWord: string;
  isDrawer: boolean;
  canUndo: boolean;
  historyStrokes: DrawStroke[];
  guessResult: { correct: boolean; earned: number; timestamp: number } | null;
  resultDialogOpen: boolean;
  dismissResult: () => void;
  setGameState: (state: DrawAndGuessState | null) => void;
  addStroke: (stroke: DrawStroke) => void;
  undoStroke: () => void;
  redoStroke: () => void;
  clearStrokes: () => void;
  selectWord: (word: string) => void;
  submitGuess: (guess: string) => void;
  rerollWord: () => void;
  revealHint: () => void;
  passTurn: () => void;
}
export const useGameStore = create<GameStore>(set => ({
  gameState: null, currentWord: '', isDrawer: false, canUndo: false, historyStrokes: [], guessResult: null,
  resultDialogOpen: false,
  dismissResult: () => set({ resultDialogOpen: false }),
  setGameState: gameState => set(s => ({ gameState, currentWord: gameState?.currentWord || '',
    resultDialogOpen: gameState?.status === 'game_over' ? (s.gameState?.status !== 'game_over' || s.resultDialogOpen) : false,
    isDrawer: gameState?.drawerId === useUserStore.getState().id, canUndo: !!gameState?.strokes.length,
    historyStrokes: gameState?.strokes || [], guessResult: s.gameState?.turnIndex === gameState?.turnIndex ? s.guessResult : null })),
  addStroke: stroke => { sendRoomAction('draw:stroke', stroke); },
  undoStroke: () => { sendRoomAction('draw:undo', {}); },
  redoStroke: () => { sendRoomAction('draw:redo', {}); },
  clearStrokes: () => { sendRoomAction('draw:clear', {}); },
  selectWord: word => { sendRoomAction('game:choose_word', { word }); },
  submitGuess: guess => { sendRoomAction('game:submit_guess', { guess }); },
  rerollWord: () => { sendRoomAction('game:reroll_word', {}); },
  revealHint: () => { sendRoomAction('game:reveal_hint', {}); },
  passTurn: () => { sendRoomAction('game:pass_turn', {}); },
}));
