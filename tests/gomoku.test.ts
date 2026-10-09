import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { GomokuAction, GomokuState, MessageInputSchema, RoomSettingsSchema, UserProfile } from '../packages/protocol/src';
import { gomokuHint, handleGomokuAction, hasFive, initGomoku, leaveGomoku, tickGomoku } from '../apps/server/src/gomoku';

const players: UserProfile[] = ['p1', 'p2'].map((id, i) => ({ id, nickname: id, avatar: '', isHost: i === 0, isReady: true, isOnline: true, score: 0, micMuted: true }));
const init = (totalRounds = 1) => initGomoku(players, RoomSettingsSchema.parse({ title: 'Gomoku', gameId: 'gomoku', totalRounds }), 'match');
const act = (game: GomokuState, topic: GomokuAction['topic'], userId = game.playerIds[game.currentTurn], payload = {}) => handleGomokuAction(game, MessageInputSchema.parse({ topic, payload: { revision: game.revision, ...payload } }) as GomokuAction, userId);
const place = (game: GomokuState, x: number, y: number) => act(game, 'gomoku:place', undefined, { x, y });
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(1700000000000); });
afterEach(() => { vi.useRealTimers(); });

describe('Gomoku trust boundaries', () => {
  it('keeps drawing defaults and enforces two players and allowed round counts', () => {
    expect(RoomSettingsSchema.parse({ title: 'Draw' })).toMatchObject({ gameId: 'draw-and-guess', maxPlayers: 8 });
    expect(RoomSettingsSchema.parse({ title: 'Gomoku', gameId: 'gomoku' }).maxPlayers).toBe(2);
    for (const input of [{ gameId: 'unknown' }, { gameId: 'gomoku', maxPlayers: 3 }, { gameId: 'gomoku', totalRounds: 2 }]) expect(RoomSettingsSchema.safeParse({ title: 'x', ...input }).success).toBe(false);
  });
  it.each([-1, 15, 1.5, NaN, Infinity, '7'])('rejects illegal coordinate %s', x => {
    expect(MessageInputSchema.safeParse({ topic: 'gomoku:place', payload: { x, y: 7, revision: 0 } }).success).toBe(false);
  });
  it('requires an integer revision and valid consent ID', () => {
    for (const revision of [undefined, -1, 1.5, NaN]) expect(MessageInputSchema.safeParse({ topic: 'gomoku:resign', payload: { revision } }).success).toBe(false);
    expect(MessageInputSchema.safeParse({ topic: 'gomoku:reply', payload: { revision: 0, requestId: 'invented', accept: true } }).success).toBe(false);
  });
  it('rejects outsiders, wrong turn, stale revision and occupied points without mutating the state', () => {
    let game = init(); const before = structuredClone(game);
    expect(() => act(game, 'gomoku:place', 'outside', { x: 7, y: 7 })).toThrow('not a player');
    expect(() => act(game, 'gomoku:place', 'p2', { x: 7, y: 7 })).toThrow('your turn');
    expect(game).toEqual(before);
    game = place(game, 7, 7);
    expect(() => act(game, 'gomoku:place', 'p2', { x: 8, y: 7, revision: 0 })).toThrow('board changed');
    expect(() => place(game, 7, 7)).toThrow('occupied');
    expect(game.moves).toHaveLength(1);
  });
});
describe('Gomoku rounds and clocks', () => {
  it.each([[1, 0], [0, 1], [1, 1], [1, -1]])('wins along direction %s,%s and preserves the real move history', (dx, dy) => {
    let game = init();
    for (let i = 0; i < 5; i++) {
      game = place(game, 3 + dx * i, 7 + dy * i);
      if (i < 4) game = place(game, 14 - i, 14);
    }
    expect(game).toMatchObject({ status: 'game_over', winner: 'black', matchWinnerId: 'p1', resultReason: 'five' });
    expect(game.moves).toHaveLength(9); expect(game.roundResults[0].moves).toEqual(game.moves);
    expect(game.scores[0].score).toBe(1);
    expect(() => place(game, 0, 0)).toThrow('not active');
  });
  it('counts a line longer than five, with boundary-safe searches', () => {
    const board = init().board;
    for (let x = 0; x < 6; x++) board[0][x] = 'black';
    expect(hasFive(board, 3, 0, 'black')).toBe(true);
    expect(hasFive(board, 14, 14, 'white')).toBe(false);
  });
  it('ends a full board in a draw instead of selecting a fake winner', () => {
    const game = init();
    for (let y = 0; y < 15; y++) for (let x = 0; x < 15; x++) if (x !== 0 || y !== 0) {
      const color = (x + 2 * y) % 4 < 2 ? 'black' : 'white';
      game.board[y][x] = color; game.moves.push({ x, y, color, step: game.moves.length + 1, timestamp: Date.now() });
    }
    expect(place(game, 0, 0)).toMatchObject({ status: 'game_over', winner: 'draw', matchWinnerId: null, resultReason: 'board_full' });
  });
  it('charges actual elapsed time, gives each move a fresh deadline and times out at the boundary', () => {
    let game = init();
    vi.advanceTimersByTime(2500); game = place(game, 7, 7);
    expect(game.spentMs.p1).toBe(2500); expect(game.deadline).toBe(Date.now() + 60000);
    vi.advanceTimersByTime(59999); game = tickGomoku(game);
    expect(game.status).toBe('playing'); expect(game.timeLeft).toBe(1);
    vi.advanceTimersByTime(1); game = tickGomoku(game);
    expect(game).toMatchObject({ status: 'game_over', matchWinnerId: 'p1', resultReason: 'timeout' });
    expect(game.spentMs.p2).toBe(60000);
    expect(tickGomoku(game)).toBe(game);
  });
  it('swaps colors after the real inter-round countdown and finishes a best-of-three early', () => {
    let game = act(init(3), 'gomoku:resign', 'p1');
    expect(game.status).toBe('round_over');
    vi.advanceTimersByTime(7999); game = tickGomoku(game); expect(game.currentRound).toBe(1);
    vi.advanceTimersByTime(1); game = tickGomoku(game);
    expect(game).toMatchObject({ currentRound: 2, currentTurn: 'black', playerIds: { black: 'p2', white: 'p1' }, status: 'playing' });
    expect(game.moves).toEqual([]); expect(game.undoRemaining).toEqual({ p1: 3, p2: 3 });
    game = act(game, 'gomoku:resign', 'p1');
    expect(game).toMatchObject({ status: 'game_over', matchWinnerId: 'p2' });
    expect(game.roundResults).toHaveLength(2); expect(game.scores.find(s => s.playerId === 'p2')?.score).toBe(2);
  });
  it('three agreed draws finish with a tied match and zero wins', () => {
    let game = init(3);
    for (let round = 0; round < 3; round++) {
      game = act(game, 'gomoku:request_draw', 'p1');
      game = act(game, 'gomoku:reply', 'p2', { requestId: game.pendingRequest!.id, accept: true });
      if (round < 2) { vi.advanceTimersByTime(8000); game = tickGomoku(game); }
    }
    expect(game).toMatchObject({ status: 'game_over', matchWinnerId: null });
    expect(game.scores.map(score => score.score)).toEqual([0, 0]); expect(game.roundResults).toHaveLength(3);
  });
  it('a drawn last round retains the actual match winner from earlier rounds', () => {
    let game = act(init(3), 'gomoku:resign', 'p1');
    for (let round = 0; round < 2; round++) {
      vi.advanceTimersByTime(8000); game = tickGomoku(game);
      game = act(game, 'gomoku:request_draw', 'p1');
      game = act(game, 'gomoku:reply', 'p2', { requestId: game.pendingRequest!.id, accept: true });
    }
    expect(game).toMatchObject({ status: 'game_over', winner: 'draw', matchWinnerId: 'p2' });
    expect(game.scores.map(score => score.score)).toEqual([0, 1]);
  });
  it.each(['playing', 'round_over'] as const)('a leaving player forfeits the whole match in %s', status => {
    let game = init(5);
    if (status === 'round_over') game = act(game, 'gomoku:resign', 'p2');
    const next = leaveGomoku(game, 'p1');
    expect(next).toMatchObject({ status: 'game_over', matchWinnerId: 'p2', resultReason: 'leave' });
    expect(next.roundResults).toHaveLength(1);
    expect(leaveGomoku(next, 'p2')).toBe(next);
  });
});
describe('Gomoku consent and private tactical hints', () => {
  it.each([1, 2])('undo restores the requester turn after removing %s moves, without refunding elapsed time', count => {
    let game = init(); vi.advanceTimersByTime(1000); game = place(game, 7, 7);
    if (count === 2) { vi.advanceTimersByTime(2000); game = place(game, 8, 7); }
    game = act(game, 'gomoku:request_undo', 'p1');
    expect(game.undoRemaining.p1).toBe(2);
    expect(() => act(game, 'gomoku:reply', 'p1', { requestId: game.pendingRequest!.id, accept: true })).toThrow('opponent');
    vi.advanceTimersByTime(1000);
    const next = act(game, 'gomoku:reply', 'p2', { requestId: game.pendingRequest!.id, accept: true });
    expect(next.moves).toHaveLength(0); expect(next.board[7][7]).toBeNull(); expect(next.board[7][8]).toBeNull();
    expect(next.currentTurn).toBe('black'); expect(next.spentMs.p1).toBe(count === 1 ? 1000 : 2000);
    expect(next.spentMs.p2).toBe(count === 1 ? 1000 : 2000);
  });
  it('cannot undo an opening by the opponent or request indefinitely', () => {
    let game = place(init(), 7, 7);
    expect(() => act(game, 'gomoku:request_undo', 'p2')).toThrow('no move of yours');
    for (let i = 0; i < 3; i++) {
      game = act(game, 'gomoku:request_undo', 'p1');
      game = act(game, 'gomoku:reply', 'p2', { requestId: game.pendingRequest!.id, accept: false });
    }
    expect(() => act(game, 'gomoku:request_undo', 'p1')).toThrow('no undo requests');
    expect(game.moves).toHaveLength(1);
  });
  it('rejecting a draw does not alter the board or pause the move clock', () => {
    let game = place(init(), 7, 7); const deadline = game.deadline;
    game = act(game, 'gomoku:request_draw', 'p1');
    expect(() => act(game, 'gomoku:request_draw', 'p2')).toThrow('already pending');
    game = act(game, 'gomoku:reply', 'p2', { requestId: game.pendingRequest!.id, accept: false });
    expect(game.pendingRequest).toBeNull(); expect(game.deadline).toBe(deadline); expect(game.moves).toHaveLength(1);
  });
  it('expires consent without stopping the clock and rejects old replies', () => {
    let game = act(init(), 'gomoku:request_draw', 'p1'); const requestId = game.pendingRequest!.id;
    vi.advanceTimersByTime(15000); game = tickGomoku(game);
    expect(game.pendingRequest).toBeNull(); expect(game.timeLeft).toBe(45);
    expect(() => act(game, 'gomoku:reply', 'p2', { requestId, accept: true })).toThrow('expired');
  });
  it('a new move cancels consent and makes delayed responses stale', () => {
    let game = act(init(), 'gomoku:request_draw', 'p1'); const requestId = game.pendingRequest!.id, revision = game.revision;
    game = place(game, 7, 7);
    expect(game.pendingRequest).toBeNull();
    expect(() => act(game, 'gomoku:reply', 'p2', { requestId, accept: true, revision })).toThrow('board changed');
  });
  it('recommends center initially, wins before blocking, blocks forced loss and never mutates the board', () => {
    const game = init();
    expect(gomokuHint(game, 0, 'p1')).toEqual({ x: 7, y: 7, revision: 0 });
    for (let x = 0; x < 4; x++) game.board[0][x] = 'white';
    expect(gomokuHint(game, 0, 'p1')).toMatchObject({ x: 4, y: 0 });
    for (let x = 0; x < 4; x++) game.board[2][x] = 'black';
    const before = structuredClone(game);
    expect(gomokuHint(game, 0, 'p1')).toMatchObject({ x: 4, y: 2 }); expect(game).toEqual(before);
    expect(() => gomokuHint(game, 0, 'p2')).toThrow('your turn');
  });
});
