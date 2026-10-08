import { create } from 'zustand';
import { DrawAndGuessState, DrawStroke } from '@idavoll/protocol';
import { WordBank } from '@idavoll/game-draw-and-guess';

export interface GameStore {
  gameState: DrawAndGuessState | null;
  currentWord: string;
  isDrawer: boolean;
  canUndo: boolean;
  historyStrokes: DrawStroke[];
  setGameState: (state: DrawAndGuessState | null) => void;
  addStroke: (stroke: DrawStroke) => void;
  undoStroke: () => void;
  clearStrokes: () => void;
  selectWord: (word: string) => void;
  submitGuess: (guess: string, playerId: string, nickname: string) => boolean;
  initDemoGame: (currentUserId: string, asDrawer?: boolean) => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  gameState: null,
  currentWord: '西瓜',
  isDrawer: true,
  canUndo: false,
  historyStrokes: [],

  setGameState: (gameState) =>
    set({
      gameState,
      canUndo: (gameState?.strokes?.length || 0) > 0,
      historyStrokes: gameState?.strokes || [],
    }),

  addStroke: (stroke) =>
    set((state) => {
      const strokes = [...(state.gameState?.strokes || []), stroke];
      return {
        gameState: state.gameState ? { ...state.gameState, strokes } : null,
        historyStrokes: strokes,
        canUndo: true,
      };
    }),

  undoStroke: () =>
    set((state) => {
      const current = state.gameState?.strokes || [];
      if (current.length === 0) return {};
      const updated = current.slice(0, -1);
      return {
        gameState: state.gameState ? { ...state.gameState, strokes: updated } : null,
        historyStrokes: updated,
        canUndo: updated.length > 0,
      };
    }),

  clearStrokes: () =>
    set((state) => ({
      gameState: state.gameState ? { ...state.gameState, strokes: [] } : null,
      historyStrokes: [],
      canUndo: false,
    })),

  selectWord: (word) =>
    set((state) => {
      const wordInfo = WordBank.find((w) => w.word === word);
      return {
        currentWord: word,
        gameState: state.gameState
          ? {
              ...state.gameState,
              status: 'drawing',
              currentWordLength: word.length,
              wordCategory: wordInfo?.category || '水果食物',
              wordHint: wordInfo?.hint || `${word.length} 个字`,
              timeLeft: 60,
              turnSummary: {
                secretWord: word,
                drawerEarned: 0,
                guesserEarned: {},
              },
            }
          : null,
      };
    }),

  submitGuess: (guess, playerId, nickname) => {
    const { gameState, currentWord } = get();
    if (!gameState) return false;

    if (guess.trim().toLowerCase() === currentWord.toLowerCase()) {
      const updatedScores = gameState.scores.map((s) => {
        if (s.playerId === playerId) {
          return {
            ...s,
            score: s.score + 60,
            hasGuessedCorrectly: true,
          };
        }
        return s;
      });

      set({
        gameState: {
          ...gameState,
          scores: updatedScores,
        },
      });
      return true;
    }
    return false;
  },

  initDemoGame: (currentUserId, asDrawer = true) => {
    const defaultWord = '西瓜';
    const sampleStrokes: DrawStroke[] = [
      // Outer green rind of watermelon
      {
        id: 'stroke_1',
        points: [
          [250, 420, 0.6],
          [300, 470, 0.7],
          [400, 490, 0.8],
          [500, 470, 0.7],
          [550, 420, 0.6],
        ],
        color: '#10B981',
        size: 14,
        isEraser: false,
        timestamp: Date.now() - 5000,
      },
      // Inner red melon flesh
      {
        id: 'stroke_2',
        points: [
          [260, 400, 0.5],
          [310, 450, 0.7],
          [400, 465, 0.8],
          [490, 450, 0.7],
          [540, 400, 0.5],
          [400, 395, 0.6],
          [260, 400, 0.5],
        ],
        color: '#FF6B5E',
        size: 10,
        isEraser: false,
        timestamp: Date.now() - 3000,
      },
    ];

    const demoState: DrawAndGuessState = {
      status: 'drawing',
      currentRound: 1,
      totalRounds: 3,
      drawerId: asDrawer ? currentUserId : 'usr_bot_1',
      drawerNickname: asDrawer ? '我' : '画画小能手',
      wordChoices: ['西瓜', '大熊猫', '自行车'],
      currentWordLength: defaultWord.length,
      wordCategory: '水果食物',
      wordHint: '夏天常吃的大瓜',
      strokes: sampleStrokes,
      timeLeft: 48,
      scores: [
        {
          playerId: currentUserId,
          nickname: asDrawer ? '我 (画手)' : '我 (猜题中)',
          avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=LuckyFox',
          score: 180,
          hasGuessedCorrectly: false,
        },
        {
          playerId: 'usr_bot_1',
          nickname: '画画小能手',
          avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Painter',
          score: 140,
          hasGuessedCorrectly: false,
        },
        {
          playerId: 'usr_bot_2',
          nickname: '猜词神算子',
          avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Oracle',
          score: 95,
          hasGuessedCorrectly: true,
          guessRank: 1,
        },
        {
          playerId: 'usr_bot_3',
          nickname: '涂鸦萌新',
          avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Noob',
          score: 60,
          hasGuessedCorrectly: false,
        },
      ],
      turnSummary: {
        secretWord: defaultWord,
        drawerEarned: 50,
        guesserEarned: { usr_bot_2: 75 },
      },
      gamePodium: [
        {
          rank: 1,
          playerId: currentUserId,
          nickname: '涂鸦大师 (你)',
          avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=LuckyFox',
          score: 360,
          isMvp: true,
        },
        {
          rank: 2,
          playerId: 'usr_bot_1',
          nickname: '画画小能手',
          avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Painter',
          score: 290,
          isMvp: false,
        },
        {
          rank: 3,
          playerId: 'usr_bot_2',
          nickname: '猜词神算子',
          avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Oracle',
          score: 210,
          isMvp: false,
        },
      ],
    };

    set({
      gameState: demoState,
      currentWord: defaultWord,
      isDrawer: asDrawer,
      historyStrokes: sampleStrokes,
      canUndo: true,
    });
  },
}));
