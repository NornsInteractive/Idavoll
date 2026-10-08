import { describe, it, expect } from 'vitest';
import { RoomSettings, UserProfile } from '../packages/protocol/src';
import { RoomHost } from '../packages/game-sdk/src';
import { DrawAndGuessGameModule, ServerGameState } from '../packages/games/draw-and-guess/src';

const host = {} as RoomHost;

function player(id: string, nickname: string): UserProfile {
  return { id, nickname, avatar: '', isHost: id === 'p1', isReady: true, isOnline: true, score: 0, micMuted: false };
}

function settings(overrides: Partial<RoomSettings> = {}): RoomSettings {
  return {
    title: '流程测试房',
    gameId: 'draw-and-guess',
    maxPlayers: 8,
    drawDuration: 45,
    totalRounds: 2,
    wordDifficulty: 'easy',
    isPrivate: false,
    ...overrides,
  };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function run<T>(state: ServerGameState, fn: () => { state: ServerGameState } | ServerGameState): { next: ServerGameState; same: boolean } {
  const before = clone(state);
  const result = fn();
  expect(clone(state), '原始 state 不得被修改').toEqual(before);
  const next = 'state' in result ? result.state : result;
  return { next, same: next === state };
}

function chooseWord(module: DrawAndGuessGameModule, state: ServerGameState, drawerId: string): ServerGameState {
  const word = state.wordChoices![0];
  const { next } = run(state, () => module.handleAction(state, { type: 'choose_word', word }, drawerId, host));
  expect(next.status).toBe('drawing');
  return next;
}

function guessCorrect(module: DrawAndGuessGameModule, state: ServerGameState, guesserId: string): ServerGameState {
  const { next, same } = run(state, () => module.handleAction(state, { type: 'submit_guess', guess: state.secretWord }, guesserId, host));
  expect(same).toBe(false);
  return next;
}

function expire(module: DrawAndGuessGameModule, state: ServerGameState): ServerGameState {
  const { next } = run(state, () => ({ state: module.onTick(state, state.timeLeft, host) }));
  return next;
}

describe('配置 45/90 秒作画时长', () => {
  it.each([[45], [90]])('drawDuration=%i 生效于 deadline 与 timeLeft', (duration) => {
    const module = new DrawAndGuessGameModule();
    const before = Date.now();
    let state = module.initGame([player('p1', 'A'), player('p2', 'B')], settings({ drawDuration: duration }));
    state = chooseWord(module, state, 'p1');
    expect(state.timeLeft).toBe(duration);
    expect(state.deadline!).toBeGreaterThanOrEqual(before + duration * 1000);
    expect(state.deadline!).toBeLessThanOrEqual(Date.now() + duration * 1000);
    expect(state.settings.drawDuration).toBe(duration);
  });
});

describe('完整对局：2 玩家 2 轮轮换', () => {
  it('两名玩家各画两轮后进入 game_over 并给出领奖台', () => {
    const module = new DrawAndGuessGameModule();
    const players = [player('p1', '画手一号'), player('p2', '画手二号')];
    let state = module.initGame(players, settings({ drawDuration: 45, totalRounds: 2 }));

    expect(state.status).toBe('selecting_word');
    expect(state.drawerId).toBe('p1');
    expect(state.currentRound).toBe(1);
    expect(state.turnIndex).toBe(0);

    const drawers: string[] = [];
    let guard = 0;
    while (state.status !== 'game_over' && guard++ < 12) {
      expect(state.status).toBe('selecting_word');
      drawers.push(state.drawerId);
      const drawerId = state.drawerId;
      state = chooseWord(module, state, drawerId);
      expect(state.timeLeft).toBe(45);
      const guesserId = state.playerOrder.find(id => id !== drawerId)!;
      state = guessCorrect(module, state, guesserId);
      expect(state.status).toBe('turn_ended');
      expect(state.turnSummary?.secretWord).toBe(state.secretWord);
      state = expire(module, state);
    }

    expect(state.status).toBe('game_over');
    expect(drawers).toEqual(['p1', 'p2', 'p1', 'p2']);
    expect(state.gamePodium).toHaveLength(2);
    expect(state.gamePodium!.every(p => p.rank >= 1)).toBe(true);
    expect(state.aborted).toBeUndefined();
    expect(state.currentRound).toBe(2);
    expect(state.playerOrder).toEqual(['p1', 'p2']);
  });

  it('轮换时重置 hasGuessedCorrectly 与提示/换词次数', () => {
    const module = new DrawAndGuessGameModule();
    let state = module.initGame([player('p1', 'A'), player('p2', 'B')], settings({ totalRounds: 2 }));
    expect(state.rerollsLeft).toBe(1);
    expect(state.hintsLeft).toBe(1);

    state = chooseWord(module, state, 'p1');
    state = guessCorrect(module, state, 'p2');
    state = expire(module, state);

    expect(state.status).toBe('selecting_word');
    expect(state.drawerId).toBe('p2');
    expect(state.currentRound).toBe(1);
    expect(state.rerollsLeft).toBe(1);
    expect(state.hintsLeft).toBe(1);
    expect(state.scores.every(s => !s.hasGuessedCorrectly)).toBe(true);
    expect(state.earnings).toEqual({});
  });
});

describe('非法词 / 越权 / 重复猜中不加分', () => {
  it('非候选词与非画手选词均被拒绝且不改状态', () => {
    const module = new DrawAndGuessGameModule();
    const state = module.initGame([player('p1', 'A'), player('p2', 'B')], settings());
    expect(state.wordChoices).toHaveLength(3);

    const illegal = run(state, () => module.handleAction(state, { type: 'choose_word', word: '不在候选中的词' }, 'p1', host));
    expect(illegal.same).toBe(true);

    const unauthorized = run(state, () => module.handleAction(state, { type: 'choose_word', word: state.wordChoices![0] }, 'p2', host));
    expect(unauthorized.same).toBe(true);

    const missing = run(state, () => module.handleAction(state, { type: 'choose_word' }, 'p1', host));
    expect(missing.same).toBe(true);
  });

  it('画手不能提交猜测', () => {
    const module = new DrawAndGuessGameModule();
    let state = module.initGame([player('p1', 'A'), player('p2', 'B')], settings());
    state = chooseWord(module, state, 'p1');
    const drawerGuess = run(state, () => module.handleAction(state, { type: 'submit_guess', guess: state.secretWord }, 'p1', host));
    expect(drawerGuess.same).toBe(true);
    expect(state.scores.find(s => s.playerId === 'p1')!.score).toBe(0);
  });

  it('重复猜中不加分、不重复计数', () => {
    const module = new DrawAndGuessGameModule();
    const players = [player('p1', 'A'), player('p2', 'B'), player('p3', 'C')];
    let state = module.initGame(players, settings());
    state = chooseWord(module, state, 'p1');

    state = guessCorrect(module, state, 'p2');
    const scoreAfterFirst = state.scores.find(s => s.playerId === 'p2')!.score;
    expect(scoreAfterFirst).toBeGreaterThan(0);
    expect(state.status).toBe('drawing');
    expect(state.correctGuesses.p2).toBe(1);
    expect(state.guesses.p2).toBe(1);

    const repeat = run(state, () => module.handleAction(state, { type: 'submit_guess', guess: state.secretWord }, 'p2', host));
    expect(repeat.same).toBe(true);
    expect(state.scores.find(s => s.playerId === 'p2')!.score).toBe(scoreAfterFirst);
    expect(state.correctGuesses.p2).toBe(1);
    expect(state.guesses.p2).toBe(1);

    const wrong = run(state, () => module.handleAction(state, { type: 'submit_guess', guess: '完全不对的词' }, 'p3', host));
    expect(wrong.next.guesses.p3).toBe(1);
    expect(state.scores.find(s => s.playerId === 'p3')!.score).toBe(0);
    expect(state.correctGuesses.p3).toBeUndefined();
  });
});

describe('离开人数不足中止', () => {
  it('2 人局中一人离开即中止且不产生虚构领奖台', () => {
    const module = new DrawAndGuessGameModule();
    let state = module.initGame([player('p1', 'A'), player('p2', 'B')], settings());
    state = chooseWord(module, state, 'p1');

    const { next } = run(state, () => ({ state: module.onPlayerLeave(state, 'p2', host) }));
    expect(next.status).toBe('game_over');
    expect(next.aborted).toBe(true);
    expect(next.gamePodium).toEqual([]);
    expect(next.activePlayerIds).toEqual(['p1']);
  });

  it('3 人局中一人离开不会中止', () => {
    const module = new DrawAndGuessGameModule();
    let state = module.initGame([player('p1', 'A'), player('p2', 'B'), player('p3', 'C')], settings());
    state = chooseWord(module, state, 'p1');

    const { next, same } = run(state, () => ({ state: module.onPlayerLeave(state, 'p3', host) }));
    expect(same).toBe(false);
    expect(next.status).toBe('drawing');
    expect(next.aborted).toBeUndefined();
  });
});

describe('提示 / 换词次数', () => {
  it('rerollsLeft 只有 1 次，用完后拒绝', () => {
    const module = new DrawAndGuessGameModule();
    let state = module.initGame([player('p1', 'A'), player('p2', 'B')], settings());
    expect(state.rerollsLeft).toBe(1);

    const byGuesser = run(state, () => module.handleAction(state, { type: 'reroll_word' }, 'p2', host));
    expect(byGuesser.same).toBe(true);

    const first = run(state, () => module.handleAction(state, { type: 'reroll_word' }, 'p1', host));
    expect(first.same).toBe(false);
    expect(first.next.rerollsLeft).toBe(0);
    state = first.next;

    const second = run(state, () => module.handleAction(state, { type: 'reroll_word' }, 'p1', host));
    expect(second.same).toBe(true);
  });

  it('hintsLeft 只有 1 次，reveal 后拒绝重复揭示', () => {
    const module = new DrawAndGuessGameModule();
    let state = module.initGame([player('p1', 'A'), player('p2', 'B')], settings());
    state = chooseWord(module, state, 'p1');
    expect(state.hintsLeft).toBe(1);
    expect(state.wordHint).toBeUndefined();

    const byGuesser = run(state, () => module.handleAction(state, { type: 'reveal_hint' }, 'p2', host));
    expect(byGuesser.same).toBe(true);

    const first = run(state, () => module.handleAction(state, { type: 'reveal_hint' }, 'p1', host));
    expect(first.same).toBe(false);
    expect(first.next.wordHint).toBe(`首字：${[...state.secretWord][0]}`);
    expect(first.next.hintsLeft).toBe(0);
    state = first.next;

    const second = run(state, () => module.handleAction(state, { type: 'reveal_hint' }, 'p1', host));
    expect(second.same).toBe(true);
    expect(second.next.hintsLeft).toBe(0);
  });

  it('已有人猜中后不允许换词', () => {
    const module = new DrawAndGuessGameModule();
    let state = module.initGame([player('p1', 'A'), player('p2', 'B'), player('p3', 'C')], settings());
    state = chooseWord(module, state, 'p1');
    state = guessCorrect(module, state, 'p2');

    const reroll = run(state, () => module.handleAction(state, { type: 'reroll_word' }, 'p1', host));
    expect(reroll.same).toBe(true);
    expect(state.secretWord).toBeTruthy();
  });
});

describe('状态不可变性', () => {
  it('连续动作均不修改传入的原始 state', () => {
    const module = new DrawAndGuessGameModule();
    const players = [player('p1', 'A'), player('p2', 'B'), player('p3', 'C')];
    const initial = module.initGame(players, settings({ totalRounds: 2 }));
    const snapshot = clone(initial);

    let state = initial;
    state = chooseWord(module, state, 'p1');
    state = guessCorrect(module, state, 'p2');
    const wrong = module.handleAction(state, { type: 'submit_guess', guess: '错误答案' }, 'p3', host);
    expect(wrong.state).not.toBe(state);
    state = wrong.state;
    state = module.handleAction(state, { type: 'reveal_hint' }, 'p1', host).state;
    state = module.handleAction(state, { type: 'pass_turn' }, 'p1', host).state;
    expect(state.status).toBe('turn_ended');

    expect(clone(initial)).toEqual(snapshot);
  });
});
