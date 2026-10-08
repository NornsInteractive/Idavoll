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
  currentWord: '旋转木马',
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
    const defaultWord = '旋转木马';
    const sampleStrokes: DrawStroke[] = [
      // Carousel top canopy roof (dome/tent shape in primary and red)
      {
        id: 'stroke_1',
        points: [
          [160, 260, 0.7],
          [200, 210, 0.8],
          [250, 180, 0.9],
          [300, 210, 0.8],
          [340, 260, 0.7],
        ],
        color: '#ae3029',
        size: 8,
        isEraser: false,
        timestamp: Date.now() - 9000,
      },
      // Canopy stripes / scalloped border
      {
        id: 'stroke_2',
        points: [
          [160, 260, 0.8],
          [250, 260, 0.8],
          [340, 260, 0.8],
        ],
        color: '#5b5bf0',
        size: 6,
        isEraser: false,
        timestamp: Date.now() - 8000,
      },
      // Center golden pillar
      {
        id: 'stroke_3',
        points: [
          [250, 260, 0.8],
          [250, 390, 0.8],
        ],
        color: '#eab308',
        size: 10,
        isEraser: false,
        timestamp: Date.now() - 7000,
      },
      // Carousel base platform
      {
        id: 'stroke_4',
        points: [
          [150, 390, 0.8],
          [250, 400, 0.9],
          [350, 390, 0.8],
        ],
        color: '#5b5bf0',
        size: 8,
        isEraser: false,
        timestamp: Date.now() - 6000,
      },
      // Wooden horse outline (left horse)
      {
        id: 'stroke_5',
        points: [
          [190, 290, 0.7],
          [200, 330, 0.7],
          [210, 310, 0.6],
          [220, 340, 0.7],
        ],
        color: '#f97316',
        size: 5,
        isEraser: false,
        timestamp: Date.now() - 4000,
      },
    ];

    const demoState: DrawAndGuessState = {
      status: 'drawing',
      currentRound: 2,
      totalRounds: 5,
      drawerId: asDrawer ? currentUserId : 'usr_xiaoming',
      drawerNickname: asDrawer ? '浩浩 (你)' : '小明',
      wordChoices: ['旋转木马', '过山车', '摩天轮'],
      currentWordLength: 4,
      wordCategory: '游乐场设施',
      wordHint: '4个字 · 梦幻游乐场设施',
      strokes: sampleStrokes,
      timeLeft: 38,
      scores: [
        {
          playerId: 'usr_aya',
          nickname: '阿雅',
          avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Aya',
          score: 220,
          hasGuessedCorrectly: true,
          guessRank: 1,
        },
        {
          playerId: currentUserId,
          nickname: asDrawer ? '浩浩 (画手)' : '浩浩 (你)',
          avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=HaoHao',
          score: 160,
          hasGuessedCorrectly: false,
        },
        {
          playerId: 'usr_xiaoming',
          nickname: '小明',
          avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=XiaoMing',
          score: 140,
          hasGuessedCorrectly: false,
        },
        {
          playerId: 'usr_tangtang',
          nickname: '糖糖',
          avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=TangTang',
          score: 95,
          hasGuessedCorrectly: false,
        },
      ],
      turnSummary: {
        secretWord: defaultWord,
        drawerEarned: 60,
        guesserEarned: { usr_aya: 100 },
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
