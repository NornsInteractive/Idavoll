import { GomokuAction, GomokuHint, GomokuResultReason, GomokuState, RoomSettings, StoneColor, UserProfile } from '@idavoll/protocol';

const errors = {
  stale_state: 'The board changed. Try again.', not_playing: 'The round is not active.',
  not_player: 'You are not a player in this match.', not_your_turn: 'Wait for your turn.',
  occupied: 'This intersection is occupied.', invalid_move: 'Invalid intersection.',
  request_pending: 'A request is already pending.', undo_unavailable: 'There is no move of yours to undo.',
  undo_limit: 'You have no undo requests remaining.', request_expired: 'The request has expired.',
  not_responder: 'Only the opponent can answer this request.', wrong_game: 'This action belongs to another game.',
  invalid_action: 'Invalid game action.',
};
export class GomokuRuleError extends Error {
  constructor(public code: keyof typeof errors) { super(errors[code]); }
}
const opposite = (color: StoneColor): StoneColor => color === 'black' ? 'white' : 'black';
const emptyBoard = (): GomokuState['board'] => Array.from({ length: 15 }, () => Array<StoneColor | null>(15).fill(null));
const directions = [[1, 0], [0, 1], [1, 1], [1, -1]] as const;

export function hasFive(board: GomokuState['board'], x: number, y: number, color: StoneColor): boolean {
  return directions.some(([dx, dy]) => {
    let length = 1;
    for (const sign of [-1, 1]) {
      let xx = x + dx * sign, yy = y + dy * sign;
      while (board[yy]?.[xx] === color) { length++; xx += dx * sign; yy += dy * sign; }
    }
    return length >= 5;
  });
}
export function initGomoku(players: UserProfile[], settings: RoomSettings, matchId: string, now = Date.now()): GomokuState {
  if (players.length !== 2) throw new GomokuRuleError('not_player');
  const ids = players.map(player => player.id);
  return {
    gameId: 'gomoku', matchId, status: 'playing', board: emptyBoard(), moves: [], currentTurn: 'black',
    playerIds: { black: ids[0], white: ids[1] },
    scores: players.map(player => ({ playerId: player.id, nickname: player.nickname, avatar: player.avatar, score: 0 })),
    currentRound: 1, totalRounds: settings.totalRounds, turnDuration: settings.drawDuration,
    timeLeft: settings.drawDuration, deadline: now + settings.drawDuration * 1000, turnStartedAt: now,
    spentMs: Object.fromEntries(ids.map(id => [id, 0])), undoRemaining: Object.fromEntries(ids.map(id => [id, 3])),
    revision: 0, pendingRequest: null, roundResults: [], winner: null, matchWinnerId: null, resultReason: null,
  };
}
function colorOf(game: GomokuState, userId: string): StoneColor {
  if (game.playerIds.black === userId) return 'black';
  if (game.playerIds.white === userId) return 'white';
  throw new GomokuRuleError('not_player');
}
function chargeTime(game: GomokuState, now: number) {
  game.spentMs[game.playerIds[game.currentTurn]] += Math.max(0, Math.min(now, game.deadline) - game.turnStartedAt);
}
function startClock(game: GomokuState, now: number) {
  game.turnStartedAt = now; game.timeLeft = game.turnDuration; game.deadline = now + game.turnDuration * 1000;
}
function finishRound(game: GomokuState, winner: StoneColor | 'draw', reason: GomokuResultReason, now: number, forfeit = false) {
  chargeTime(game, now);
  const winnerId = winner === 'draw' ? null : game.playerIds[winner];
  if (winnerId) game.scores.find(score => score.playerId === winnerId)!.score++;
  game.roundResults.push({ round: game.currentRound, winner, winnerId, reason, playerIds: { ...game.playerIds }, moves: [...game.moves] });
  game.winner = winner; game.resultReason = reason; game.pendingRequest = null; game.revision++;
  const leader = [...game.scores].sort((a, b) => b.score - a.score);
  const finished = forfeit || leader[0].score >= Math.ceil(game.totalRounds / 2) || game.currentRound >= game.totalRounds;
  game.status = finished ? 'game_over' : 'round_over';
  game.matchWinnerId = finished ? (forfeit ? winnerId : leader[0].score === leader[1].score ? null : leader[0].playerId) : null;
  game.timeLeft = finished ? 0 : 8; game.deadline = finished ? now : now + 8000;
}
export function tickGomoku(game: GomokuState, now = Date.now()): GomokuState {
  if (game.status === 'game_over') return game;
  const remaining = Math.max(0, Math.ceil((game.deadline - now) / 1000));
  const expired = !!game.pendingRequest && game.pendingRequest.expiresAt <= now;
  if (remaining === game.timeLeft && !expired && now < game.deadline) return game;
  const next = structuredClone(game);
  next.timeLeft = remaining;
  if (expired) { next.pendingRequest = null; next.revision++; }
  if (now >= game.deadline) {
    if (game.status === 'playing') finishRound(next, opposite(game.currentTurn), 'timeout', game.deadline);
    else {
      next.currentRound++; next.playerIds = { black: game.playerIds.white, white: game.playerIds.black };
      next.board = emptyBoard(); next.moves = []; next.currentTurn = 'black'; next.status = 'playing';
      next.winner = null; next.resultReason = null; next.pendingRequest = null;
      next.undoRemaining = Object.fromEntries(next.scores.map(score => [score.playerId, 3]));
      next.revision++; startClock(next, now);
    }
  }
  return next;
}
function undoCount(game: GomokuState, color: StoneColor): number {
  const last = game.moves.at(-1);
  return last?.color === color ? 1 : game.moves.at(-2)?.color === color ? 2 : 0;
}
function validateAction(game: GomokuState, revision: number, userId: string, now: number): StoneColor {
  const color = colorOf(game, userId);
  if (game.status !== 'playing') throw new GomokuRuleError('not_playing');
  if (revision !== game.revision || now >= game.deadline) throw new GomokuRuleError('stale_state');
  return color;
}
export function handleGomokuAction(game: GomokuState, action: GomokuAction, userId: string, now = Date.now()): GomokuState {
  const color = validateAction(game, action.payload.revision, userId, now);
  if (action.topic === 'gomoku:hint') return game;
  const next = structuredClone(game);
  switch (action.topic) {
    case 'gomoku:place': {
      if (color !== game.currentTurn) throw new GomokuRuleError('not_your_turn');
      const { x, y } = action.payload;
      if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= 15 || y >= 15) throw new GomokuRuleError('invalid_move');
      if (game.board[y][x]) throw new GomokuRuleError('occupied');
      next.board[y][x] = color;
      next.moves.push({ x, y, color, step: game.moves.length + 1, timestamp: now });
      next.pendingRequest = null;
      if (hasFive(next.board, x, y, color)) finishRound(next, color, 'five', now);
      else if (next.moves.length === 225) finishRound(next, 'draw', 'board_full', now);
      else { chargeTime(next, now); next.currentTurn = opposite(color); next.revision++; startClock(next, now); }
      break;
    }
    case 'gomoku:resign': finishRound(next, opposite(color), 'resign', now); break;
    case 'gomoku:request_draw':
    case 'gomoku:request_undo': {
      if (game.pendingRequest) throw new GomokuRuleError('request_pending');
      const type = action.topic === 'gomoku:request_undo' ? 'undo' : 'draw';
      if (type === 'undo') {
        if (!undoCount(game, color)) throw new GomokuRuleError('undo_unavailable');
        if (game.undoRemaining[userId] <= 0) throw new GomokuRuleError('undo_limit');
        next.undoRemaining[userId]--;
      }
      next.pendingRequest = { id: crypto.randomUUID(), type, requesterId: userId, expiresAt: now + 15000 };
      next.revision++; break;
    }
    case 'gomoku:reply': {
      const request = game.pendingRequest;
      if (!request || request.id !== action.payload.requestId || request.expiresAt <= now) throw new GomokuRuleError('request_expired');
      if (request.requesterId === userId) throw new GomokuRuleError('not_responder');
      next.pendingRequest = null;
      if (!action.payload.accept) { next.revision++; break; }
      if (request.type === 'draw') { finishRound(next, 'draw', 'draw_agreed', now); break; }
      const requesterColor = colorOf(game, request.requesterId);
      const count = undoCount(game, requesterColor);
      if (!count) throw new GomokuRuleError('undo_unavailable');
      chargeTime(next, now);
      for (const move of next.moves.splice(-count)) next.board[move.y][move.x] = null;
      next.currentTurn = requesterColor; next.revision++; startClock(next, now); break;
    }
  }
  return next;
}
export function leaveGomoku(game: GomokuState, userId: string, now = Date.now()): GomokuState {
  if (game.status === 'game_over' || !game.scores.some(score => score.playerId === userId)) return game;
  const next = structuredClone(game);
  const winner = opposite(colorOf(game, userId));
  if (game.status === 'playing') finishRound(next, winner, 'leave', now, true);
  else {
    next.status = 'game_over'; next.matchWinnerId = game.playerIds[winner]; next.winner = winner;
    next.resultReason = 'leave'; next.pendingRequest = null; next.timeLeft = 0; next.deadline = now; next.revision++;
  }
  return next;
}
export function gomokuHint(game: GomokuState, revision: number, userId: string, now = Date.now()): GomokuHint {
  const color = validateAction(game, revision, userId, now);
  if (game.currentTurn !== color) throw new GomokuRuleError('not_your_turn');
  const board = game.board.map(row => [...row]);
  let best = { x: 7, y: 7, score: -Infinity };
  for (let y = 0; y < 15; y++) for (let x = 0; x < 15; x++) {
    if (board[y][x]) continue;
    let score = 14 - Math.abs(7 - x) - Math.abs(7 - y);
    for (const candidateColor of [color, opposite(color)]) {
      board[y][x] = candidateColor;
      if (hasFive(board, x, y, candidateColor)) score += candidateColor === color ? 1000000 : 100000;
      for (const [dx, dy] of directions) {
        let length = 1, open = 0;
        for (const sign of [-1, 1]) {
          let xx = x + dx * sign, yy = y + dy * sign;
          while (board[yy]?.[xx] === candidateColor) { length++; xx += dx * sign; yy += dy * sign; }
          if (board[yy]?.[xx] === null) open++;
        }
        score += Math.pow(10, length - 1) * open * (candidateColor === color ? 2 : 1);
      }
    }
    board[y][x] = null;
    if (score > best.score) best = { x, y, score };
  }
  return { x: best.x, y: best.y, revision };
}
