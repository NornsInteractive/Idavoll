import { describe, it, expect } from 'vitest';
import {
  DrawAndGuessStateSchema,
  RoomSettings,
  UserProfile,
} from '../packages/protocol/src';
import { DrawAndGuessGameModule, gameView, ServerGameState } from '../packages/games/draw-and-guess/src';

const SECRET_WORD = '大熊猫';

const players: UserProfile[] = [
  { id: 'p1', nickname: '画手', avatar: 'https://example.com/1.png', isHost: true, isReady: true, isOnline: true, score: 0, micMuted: false },
  { id: 'p2', nickname: '猜手', avatar: 'https://example.com/2.png', isHost: false, isReady: true, isOnline: true, score: 0, micMuted: false },
];

const settings: RoomSettings = {
  title: '视图隔离测试',
  gameId: 'draw-and-guess',
  maxPlayers: 8,
  drawDuration: 60,
  totalRounds: 3,
  wordDifficulty: 'medium',
  isPrivate: false,
};

const ALWAYS_HIDDEN = [
  'settings',
  'playerOrder',
  'activePlayerIds',
  'drawerIndex',
  'secretWord',
  'earnings',
  'guesses',
  'correctGuesses',
] as const;

const GUESSER_HIDDEN = [...ALWAYS_HIDDEN, 'wordChoices', 'currentWord'] as const;

function makeState(overrides: Partial<ServerGameState> = {}): ServerGameState {
  return {
    status: 'drawing',
    currentRound: 1,
    totalRounds: 3,
    drawerId: 'p1',
    drawerNickname: '画手',
    currentWordLength: [...SECRET_WORD].length,
    strokes: [],
    timeLeft: 45,
    deadline: Date.now() + 45000,
    scores: players.map(p => ({ playerId: p.id, nickname: p.nickname, avatar: p.avatar, score: 0, hasGuessedCorrectly: false })),
    settings,
    playerOrder: ['p1', 'p2'],
    activePlayerIds: ['p1', 'p2'],
    drawerIndex: 0,
    secretWord: SECRET_WORD,
    earnings: { p2: 125 },
    guesses: { p2: 1 },
    correctGuesses: { p2: 1 },
    ...overrides,
  };
}

function expectHidden(view: Record<string, unknown>, fields: readonly string[]) {
  for (const field of fields) expect(view, `应当隐藏 ${field}`).not.toHaveProperty(field);
}

describe('gameView: 对猜手隐藏 secretWord / currentWord / options / 私有字段', () => {
  it('drawing 阶段的猜手视图不含答案', () => {
    const view = gameView(makeState(), 'p2') as unknown as Record<string, unknown>;
    expectHidden(view, GUESSER_HIDDEN);
    expect(JSON.stringify(view)).not.toContain(SECRET_WORD);
    expect(view.currentWordLength).toBe([...SECRET_WORD].length);
    expect(DrawAndGuessStateSchema.parse(view)).toBeTruthy();
  });

  it('selecting_word 阶段的猜手视图不含候选词', () => {
    const view = gameView(makeState({ status: 'selecting_word', wordChoices: [SECRET_WORD, '火箭', '雨伞'], secretWord: '', currentWordLength: 0 }), 'p2') as unknown as Record<string, unknown>;
    expectHidden(view, GUESSER_HIDDEN);
    expect(view).not.toHaveProperty('turnSummary');
    expect(DrawAndGuessStateSchema.parse(view)).toBeTruthy();
  });

  it('非画手与陌生 playerId 都拿不到 currentWord', () => {
    const state = makeState({ currentWord: SECRET_WORD } as Partial<ServerGameState>);
    for (const id of ['p2', 'p9']) {
      const view = gameView(state, id) as unknown as Record<string, unknown>;
      expectHidden(view, GUESSER_HIDDEN);
      expect(JSON.stringify(view)).not.toContain(SECRET_WORD);
    }
  });

  it('turn_ended / game_over 才对所有人公开 turnSummary', () => {
    const ended = gameView(makeState({
      status: 'turn_ended',
      timeLeft: 8,
      turnSummary: { secretWord: SECRET_WORD, drawerEarned: 100, guesserEarned: { p2: 100 } },
    }), 'p2') as unknown as Record<string, unknown>;
    expect(ended.turnSummary).toMatchObject({ secretWord: SECRET_WORD });
    expectHidden(ended, ALWAYS_HIDDEN);

    const over = gameView(makeState({
      status: 'game_over',
      secretWord: SECRET_WORD,
      turnSummary: { secretWord: SECRET_WORD, drawerEarned: 100, guesserEarned: { p2: 100 } },
      gamePodium: [],
    }), 'p2') as unknown as Record<string, unknown>;
    expectHidden(over, ALWAYS_HIDDEN);
    expect(over.gamePodium).toEqual([]);
  });

  it('由真实模块产生的全部状态下，猜手始终拿不到答案', () => {
    const module = new DrawAndGuessGameModule();
    let state: ServerGameState = module.initGame(players, settings);
    const host = {} as never;
    const seen: string[] = [];

    const collect = () => {
      const viewer = state.drawerId === 'p1' ? 'p2' : 'p1';
      const view = gameView(state, viewer) as unknown as Record<string, unknown>;
      expect(viewer).not.toBe(state.drawerId);
      expectHidden(view, GUESSER_HIDDEN);
      expect(DrawAndGuessStateSchema.parse(view)).toBeTruthy();
      if (state.secretWord && state.status === 'drawing') {
        expect(JSON.stringify(view)).not.toContain(state.secretWord);
      }
      if (state.status === 'selecting_word') {
        expect(view).not.toHaveProperty('turnSummary');
      }
      const drawerView = gameView(state, state.drawerId) as unknown as Record<string, unknown>;
      expectHidden(drawerView, ALWAYS_HIDDEN);
      expect(DrawAndGuessStateSchema.parse(drawerView)).toBeTruthy();
      seen.push(state.status);
    };

    collect();
    state = module.handleAction(state, { type: 'choose_word', word: state.wordChoices![0] }, 'p1', host).state;
    collect();
    state = module.handleAction(state, { type: 'reveal_hint' }, 'p1', host).state;
    collect();
    state = module.handleAction(state, { type: 'submit_guess', guess: state.secretWord }, 'p2', host).state;
    collect();
    state = module.onTick(state, state.timeLeft, host);
    collect();
    expect(state.status).toBe('selecting_word');
    expect(seen).toEqual(['selecting_word', 'drawing', 'drawing', 'turn_ended', 'selecting_word']);
  });
});

describe('gameView: 画手可见内容', () => {
  it('选词阶段画手拿到 wordChoices，但拿不到 secretWord/currentWord', () => {
    const view = gameView(makeState({ status: 'selecting_word', wordChoices: ['火箭', '雨伞', '吉他'], secretWord: '', currentWordLength: 0 }), 'p1') as unknown as Record<string, unknown>;
    expect(view.wordChoices).toEqual(['火箭', '雨伞', '吉他']);
    expectHidden(view, [...ALWAYS_HIDDEN, 'currentWord']);
    expect(JSON.stringify(view)).not.toContain(SECRET_WORD);
  });

  it('绘画阶段画手拿到 currentWord，但仍无 settings/playerOrder 等私有字段', () => {
    const view = gameView(makeState(), 'p1') as unknown as Record<string, unknown>;
    expect(view.currentWord).toBe(SECRET_WORD);
    expectHidden(view, ALWAYS_HIDDEN);
    expect(DrawAndGuessStateSchema.parse(view)).toBeTruthy();
  });
});
