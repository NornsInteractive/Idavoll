import { DrawAndGuessState, UserProfile, RoomSettings } from '@idavoll/protocol';
import { GameModule, RoomHost } from '@idavoll/game-sdk';
import { getRandomWordOptions, WordBank } from './dictionary';
import { calculateGuessScore, calculateDrawerScore } from './scorer';

export interface DrawAndGuessAction {
  type: 'choose_word' | 'submit_guess' | 'pass_turn' | 'reroll_word' | 'reveal_hint';
  word?: string;
  guess?: string;
}

export interface ServerGameState extends DrawAndGuessState {
  settings: RoomSettings;
  playerOrder: string[];
  activePlayerIds: string[];
  drawerIndex: number;
  secretWord: string;
  earnings: Record<string, number>;
  guesses: Record<string, number>;
  correctGuesses: Record<string, number>;
}

export function gameView(state: ServerGameState, playerId: string): DrawAndGuessState {
  const { settings, playerOrder, activePlayerIds, drawerIndex, secretWord, earnings, guesses, correctGuesses, wordChoices, turnSummary, currentWord, ...view } = state;
  const isDrawer = playerId === state.drawerId;
  return {
    ...view,
    ...(isDrawer && state.status === 'selecting_word' ? { wordChoices } : {}),
    ...(isDrawer && state.status === 'drawing' ? { currentWord: secretWord } : {}),
    ...(['turn_ended', 'game_over'].includes(state.status) ? { turnSummary } : {}),
  };
}

export class DrawAndGuessGameModule implements GameModule<ServerGameState, DrawAndGuessAction> {
  id = 'draw-and-guess';
  name = '你画我猜 (Draw & Guess)';
  version = '1.0.0';
  minPlayers = 2;
  maxPlayers = 12;

  initGame(players: UserProfile[], settings: RoomSettings): ServerGameState {
    if (players.length < 2 || players.length > settings.maxPlayers) throw new Error('需要 2–12 位玩家');
    return this.selecting({
      status: 'selecting_word', currentRound: 1, totalRounds: settings.totalRounds,
      drawerId: players[0].id, drawerNickname: players[0].nickname,
      currentWordLength: 0, strokes: [], timeLeft: 15, turnIndex: 0,
      scores: players.map(p => ({ playerId: p.id, nickname: p.nickname, avatar: p.avatar, score: 0, hasGuessedCorrectly: false })),
      settings: { ...settings }, playerOrder: players.map(p => p.id), activePlayerIds: players.map(p => p.id),
      drawerIndex: 0, secretWord: '', earnings: {}, guesses: {}, correctGuesses: {},
    });
  }

  private selecting(state: ServerGameState): ServerGameState {
    const drawer = state.scores.find(p => p.playerId === state.playerOrder[state.drawerIndex])!;
    return {
      ...state, status: 'selecting_word', drawerId: drawer.playerId, drawerNickname: drawer.nickname,
      wordChoices: getRandomWordOptions(3, state.settings.wordDifficulty).map(w => w.word),
      currentWordLength: 0, wordCategory: undefined, wordHint: undefined, strokes: [],
      secretWord: '', earnings: {}, turnSummary: undefined, timeLeft: 15, deadline: Date.now() + 15000,
      rerollsLeft: 1, hintsLeft: 1,
      scores: state.scores.map(s => ({ ...s, hasGuessedCorrectly: false, guessRank: undefined })),
    };
  }

  private choose(state: ServerGameState, word: string, duration = state.settings.drawDuration): ServerGameState {
    const entry = WordBank.find(w => w.word === word)!;
    return { ...state, status: 'drawing', secretWord: word, wordChoices: undefined,
      currentWordLength: [...word].length, wordCategory: entry.category, wordHint: undefined,
      strokes: [], timeLeft: duration, deadline: Date.now() + duration * 1000, turnSummary: undefined };
  }

  handleAction(state: ServerGameState, action: DrawAndGuessAction, senderId: string, _host: RoomHost): { state: ServerGameState; effects?: unknown[] } {
    if (!state.activePlayerIds.includes(senderId) || state.status === 'game_over') return { state };
    const drawer = senderId === state.drawerId;
    if (action.type === 'choose_word') {
      if (!drawer || state.status !== 'selecting_word' || !action.word || !state.wordChoices?.includes(action.word)) return { state };
      return { state: this.choose(state, action.word), effects: [{ type: 'word_chosen' }] };
    }
    if (action.type === 'reroll_word' && drawer && state.rerollsLeft && ['selecting_word', 'drawing'].includes(state.status)) {
      if (Object.keys(state.earnings).length) return { state };
      const choices = getRandomWordOptions(3, state.settings.wordDifficulty).map(w => w.word).filter(w => w !== state.secretWord);
      if (state.status === 'selecting_word') return { state: { ...state, wordChoices: choices, rerollsLeft: 0 } };
      const next = this.choose(state, choices[0], state.timeLeft);
      return { state: { ...next, deadline: state.deadline, rerollsLeft: 0, hintsLeft: state.hintsLeft } };
    }
    if (action.type === 'reveal_hint' && drawer && state.status === 'drawing' && state.hintsLeft) {
      return { state: { ...state, wordHint: `首字：${[...state.secretWord][0]}`, hintsLeft: 0 } };
    }
    if (action.type === 'pass_turn' && drawer && state.status === 'drawing') return { state: this.endTurn(state) };
    if (action.type !== 'submit_guess' || drawer || state.status !== 'drawing') return { state };
    const guess = action.guess?.trim();
    const score = state.scores.find(s => s.playerId === senderId);
    if (!guess || !score || score.hasGuessedCorrectly) return { state };
    const next = structuredClone(state);
    next.guesses[senderId] = (next.guesses[senderId] || 0) + 1;
    if (guess.toLocaleLowerCase() !== state.secretWord.toLocaleLowerCase()) return { state: next, effects: [{ type: 'wrong_guess' }] };
    const rank = state.scores.filter(s => s.hasGuessedCorrectly).length + 1;
    const earned = calculateGuessScore(rank, Math.min(1, state.timeLeft / state.settings.drawDuration));
    const player = next.scores.find(s => s.playerId === senderId)!;
    player.hasGuessedCorrectly = true;
    player.score += earned;
    player.guessRank = rank;
    next.earnings[senderId] = earned;
    next.correctGuesses[senderId] = (next.correctGuesses[senderId] || 0) + 1;
    const complete = next.activePlayerIds.filter(id => id !== next.drawerId).every(id => next.scores.find(s => s.playerId === id)?.hasGuessedCorrectly);
    return { state: complete ? this.endTurn(next) : next, effects: [{ type: 'correct_guess', playerId: senderId, earned, rank }] };
  }

  endTurn(state: ServerGameState): ServerGameState {
    if (state.status !== 'drawing' && state.status !== 'selecting_word') return state;
    const drawerEarned = calculateDrawerScore(Object.keys(state.earnings).length, Math.max(1, state.activePlayerIds.length - 1));
    return { ...state, status: 'turn_ended', timeLeft: 8, deadline: Date.now() + 8000,
      scores: state.scores.map(s => s.playerId === state.drawerId ? { ...s, score: s.score + drawerEarned } : s),
      turnSummary: { secretWord: state.secretWord, drawerEarned, guesserEarned: { ...state.earnings } } };
  }

  onPlayerLeave(state: ServerGameState, playerId: string, _host: RoomHost): ServerGameState {
    const next = { ...state, activePlayerIds: state.activePlayerIds.filter(id => id !== playerId) };
    if (next.activePlayerIds.length < 2) return { ...next, status: 'game_over', aborted: true, timeLeft: 0, deadline: Date.now(), gamePodium: [] };
    if (playerId === state.drawerId && ['drawing', 'selecting_word'].includes(state.status)) return this.endTurn(next);
    if (state.status === 'drawing' && next.activePlayerIds.filter(id => id !== state.drawerId).every(id => state.scores.find(s => s.playerId === id)?.hasGuessedCorrectly)) return this.endTurn(next);
    return next;
  }

  onTick(state: ServerGameState, elapsedSeconds: number, host: RoomHost): ServerGameState {
    if (state.status === 'game_over') return state;
    const timeLeft = Math.max(0, state.timeLeft - elapsedSeconds);
    if (timeLeft > 0) return { ...state, timeLeft };
    if (state.status === 'selecting_word') return this.handleAction(state, { type: 'choose_word', word: state.wordChoices?.[0] }, state.drawerId, host).state;
    if (state.status === 'drawing') return this.endTurn({ ...state, timeLeft: 0 });
    let drawerIndex = state.drawerIndex;
    let currentRound = state.currentRound;
    do {
      drawerIndex++;
      if (drawerIndex >= state.playerOrder.length) { drawerIndex = 0; currentRound++; }
      if (currentRound > state.totalRounds) {
        const sorted = [...state.scores].sort((a, b) => b.score - a.score);
        return { ...state, status: 'game_over', timeLeft: 0, deadline: Date.now(),
          gamePodium: sorted.map((s, i) => ({ ...s, rank: sorted.findIndex(p => p.score === s.score) + 1, isMvp: s.score === sorted[0].score })) };
      }
    } while (!state.activePlayerIds.includes(state.playerOrder[drawerIndex]));
    return this.selecting({ ...state, drawerIndex, currentRound, turnIndex: (state.turnIndex || 0) + 1 });
  }
}
