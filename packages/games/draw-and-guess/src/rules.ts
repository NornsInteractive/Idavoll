import {
  DrawAndGuessState,
  UserProfile,
  RoomSettings,
  PlayerScore,
} from '@idavoll/protocol';
import { GameModule, RoomHost } from '@idavoll/game-sdk';
import { getRandomWordOptions, WordEntry, WordBank } from './dictionary';
import { calculateGuessScore, calculateDrawerScore } from './scorer';

export interface DrawAndGuessAction {
  type: 'choose_word' | 'submit_guess' | 'pass_turn';
  word?: string;
  guess?: string;
}

export class DrawAndGuessGameModule implements GameModule<DrawAndGuessState, DrawAndGuessAction> {
  id = 'draw-and-guess';
  name = '你画我猜 (Draw & Guess)';
  version = '1.0.0';
  minPlayers = 2;
  maxPlayers = 12;

  initGame(players: UserProfile[], settings: RoomSettings): DrawAndGuessState {
    const scores: PlayerScore[] = players.map((p) => ({
      playerId: p.id,
      nickname: p.nickname,
      avatar: p.avatar,
      score: 0,
      hasGuessedCorrectly: false,
    }));

    const drawer = players[0];
    const wordOptions = getRandomWordOptions(3, settings.wordDifficulty).map((w) => w.word);

    return {
      status: 'selecting_word',
      currentRound: 1,
      totalRounds: settings.totalRounds,
      drawerId: drawer.id,
      drawerNickname: drawer.nickname,
      wordChoices: wordOptions,
      currentWordLength: 0,
      strokes: [],
      timeLeft: 15, // 15 seconds to pick word
      scores,
    };
  }

  handleAction(
    state: DrawAndGuessState,
    action: DrawAndGuessAction,
    senderId: string,
    host: RoomHost
  ): { state: DrawAndGuessState; effects?: unknown[] } {
    let nextState = { ...state };
    const effects: unknown[] = [];

    if (action.type === 'choose_word' && senderId === state.drawerId && state.status === 'selecting_word') {
      const chosen = action.word || state.wordChoices?.[0] || '西瓜';
      const wordInfo = WordBank.find((w) => w.word === chosen);

      nextState = {
        ...nextState,
        status: 'drawing',
        currentWordLength: chosen.length,
        wordCategory: wordInfo?.category || '趣味日常',
        wordHint: wordInfo?.hint || `${chosen.length} 个字`,
        timeLeft: 60,
        strokes: [],
        turnSummary: {
          secretWord: chosen,
          drawerEarned: 0,
          guesserEarned: {},
        },
      };

      effects.push({ type: 'word_chosen', drawerId: senderId, wordLength: chosen.length });
      return { state: nextState, effects };
    }

    if (action.type === 'submit_guess' && state.status === 'drawing' && senderId !== state.drawerId) {
      const secret = state.turnSummary?.secretWord;
      const guess = action.guess?.trim();

      if (secret && guess && guess.toLowerCase() === secret.toLowerCase()) {
        const playerScore = nextState.scores.find((s) => s.playerId === senderId);

        if (playerScore && !playerScore.hasGuessedCorrectly) {
          const currentCorrectCount = nextState.scores.filter((s) => s.hasGuessedCorrectly).length;
          const rank = currentCorrectCount + 1;
          const earned = calculateGuessScore(rank, nextState.timeLeft / 60);

          playerScore.hasGuessedCorrectly = true;
          playerScore.score += earned;
          playerScore.guessRank = rank;

          if (nextState.turnSummary) {
            nextState.turnSummary.guesserEarned[senderId] = earned;
          }

          effects.push({
            type: 'correct_guess',
            playerId: senderId,
            nickname: playerScore.nickname,
            earned,
            rank,
          });

          // Check if all guessers guessed correctly
          const totalGuessers = nextState.scores.length - 1;
          const newCorrectCount = nextState.scores.filter((s) => s.hasGuessedCorrectly).length;
          if (newCorrectCount >= totalGuessers) {
            // End turn early
            nextState = this.endTurn(nextState);
            effects.push({ type: 'turn_ended' });
          }
        }
      }
    }

    return { state: nextState, effects };
  }

  endTurn(state: DrawAndGuessState): DrawAndGuessState {
    const totalGuessers = state.scores.length - 1;
    const correctCount = state.scores.filter((s) => s.hasGuessedCorrectly).length;
    const drawerEarned = calculateDrawerScore(correctCount, totalGuessers);

    const drawerScore = state.scores.find((s) => s.playerId === state.drawerId);
    if (drawerScore) {
      drawerScore.score += drawerEarned;
    }

    return {
      ...state,
      status: 'turn_ended',
      timeLeft: 8, // 8 seconds review
      turnSummary: state.turnSummary
        ? {
            ...state.turnSummary,
            drawerEarned,
          }
        : undefined,
    };
  }

  onPlayerLeave(state: DrawAndGuessState, playerId: string, host: RoomHost): DrawAndGuessState {
    const filteredScores = state.scores.filter((s) => s.playerId !== playerId);
    if (playerId === state.drawerId) {
      return this.endTurn({ ...state, scores: filteredScores });
    }
    return { ...state, scores: filteredScores };
  }

  onTick(state: DrawAndGuessState, elapsedSeconds: number, host: RoomHost): DrawAndGuessState {
    const timeLeft = Math.max(0, state.timeLeft - elapsedSeconds);
    if (timeLeft <= 0) {
      if (state.status === 'selecting_word') {
        // Auto pick first word
        return this.handleAction(
          state,
          { type: 'choose_word', word: state.wordChoices?.[0] },
          state.drawerId,
          host
        ).state;
      }
      if (state.status === 'drawing') {
        return this.endTurn({ ...state, timeLeft: 0 });
      }
      if (state.status === 'turn_ended') {
        // Advance to next round or finish game
        if (state.currentRound >= state.totalRounds) {
          // Game Over - Compute podium
          const sorted = [...state.scores].sort((a, b) => b.score - a.score);
          const podium = sorted.map((s, idx) => ({
            rank: idx + 1,
            playerId: s.playerId,
            nickname: s.nickname,
            avatar: s.avatar,
            score: s.score,
            isMvp: idx === 0,
          }));

          return {
            ...state,
            status: 'game_over',
            gamePodium: podium,
            timeLeft: 0,
          };
        }
      }
    }
    return { ...state, timeLeft };
  }
}
