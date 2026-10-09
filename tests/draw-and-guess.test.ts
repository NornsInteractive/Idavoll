import { describe, it, expect } from 'vitest';
import {
  calculateGuessScore,
  calculateDrawerScore,
  DrawAndGuessGameModule,
  WordBank,
  getRandomWordOptions,
} from '../packages/games/draw-and-guess/src';

describe('Draw and Guess Game Module & Scoring', () => {
  it('correctly calculates guess score by rank and time remaining', () => {
    // 1st place with full time remaining
    const score1st = calculateGuessScore(1, 1.0);
    expect(score1st).toBe(50 + 50 + 25); // 125

    // 2nd place with half time
    const score2nd = calculateGuessScore(2, 0.5);
    expect(score2nd).toBe(50 + 35 + 13); // 98
  });

  it('calculates drawer score based on how many players guessed right', () => {
    const noOneGuessed = calculateDrawerScore(0, 5);
    expect(noOneGuessed).toBe(0);

    const everyoneGuessed = calculateDrawerScore(5, 5);
    expect(everyoneGuessed).toBe(100);
  });

  it('contains valid word bank entries with categories', () => {
    expect(WordBank.length).toBeGreaterThanOrEqual(300);
    expect(new Set(WordBank.map(w => w.word)).size).toBe(WordBank.length);
    expect(WordBank.every(w => w.word.trim() === w.word && w.word.length > 0 && w.category && w.hint)).toBe(true);
    const watermelon = WordBank.find((w) => w.word === '西瓜');
    expect(watermelon).toBeDefined();
    expect(watermelon?.category).toBe('水果食物');
  });

  it.each(['easy', 'medium', 'hard'] as const)('难度 %s 有充足题目且选词不重复、不改变原题库', difficulty => {
    expect(WordBank.filter(w => w.difficulty === difficulty).length).toBeGreaterThanOrEqual(100);
    const before = [...WordBank];
    const options = getRandomWordOptions(3, difficulty);
    expect(options).toHaveLength(3);
    expect(new Set(options.map(w => w.word)).size).toBe(3);
    expect(options.every(w => w.difficulty === difficulty && WordBank.includes(w))).toBe(true);
    expect(WordBank).toEqual(before);
  });

  it('runs game initialization and actions through DrawAndGuessGameModule', () => {
    const game = new DrawAndGuessGameModule();
    const mockPlayers = [
      {
        id: 'p1',
        nickname: '画手',
        avatar: '',
        isHost: true,
        isReady: true,
        isOnline: true,
        score: 0,
        micMuted: false,
      },
      {
        id: 'p2',
        nickname: '猜词者',
        avatar: '',
        isHost: false,
        isReady: true,
        isOnline: true,
        score: 0,
        micMuted: false,
      },
    ];

    const state = game.initGame(mockPlayers, {
      title: '测试房间',
      gameId: 'draw-and-guess',
      maxPlayers: 8,
      drawDuration: 60,
      totalRounds: 3,
      wordDifficulty: 'medium',
      isPrivate: false,
    });

    expect(state.status).toBe('selecting_word');
    expect(state.drawerId).toBe('p1');
    expect(state.wordChoices?.length).toBe(3);

    // Drawer chooses word
    const res = game.handleAction(
      state,
      { type: 'choose_word', word: state.wordChoices![0] },
      'p1',
      {} as any
    );

    expect(res.state.status).toBe('drawing');
    expect(res.state.currentWordLength).toBeGreaterThan(0);
  });
});
