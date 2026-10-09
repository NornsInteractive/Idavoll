import assert from 'node:assert/strict';

const base = process.env.BASE_URL || 'http://127.0.0.1:8787';
assert.match(base, /^http:\/\/(127\.0\.0\.1|localhost):\d+$/); // Only disposable local accounts and databases.
let checks = 0;
const sockets = [];
function check(name, condition) { assert.ok(condition, name); checks++; console.log(`PASS ${name}`); }
async function api(path, user, body, method = body === undefined ? 'GET' : 'POST') {
  const response = await fetch(`${base}/api${path}`, { method, headers: { ...(user ? { Authorization: `Bearer ${user.token}` } : {}), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: response.status, ...await response.json() };
}
async function wait(client, predicate, from = 0, timeout = 12000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const frame = client.frames.slice(from).find(predicate);
    if (frame) return frame;
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  throw new Error(`Missing frame; recent topics: ${client.frames.slice(-6).map(frame => frame.topic).join(',')}`);
}
async function connect(user, roomId, ticket) {
  const client = { user, frames: [], ws: new WebSocket(`${base.replace('http:', 'ws:')}/api/rooms/${roomId}/ws?ticket=${encodeURIComponent(ticket)}`),
    send(topic, payload = {}) { this.ws.send(JSON.stringify({ topic, payload })); } };
  sockets.push(client.ws);
  client.ws.onmessage = event => client.frames.push(JSON.parse(event.data));
  await wait(client, frame => frame.topic === 'connection:snapshot'); return client;
}
const game = client => [...client.frames].reverse().find(frame => frame.topic === 'game:state_sync' || frame.topic === 'connection:snapshot')?.payload;
function current(client) { const state = game(client); return state?.room ? state.game : state; }
async function action(client, topic, extra = {}) {
  const revision = current(client).revision, from = client.frames.length;
  client.send(topic, { revision, ...extra });
  return (await wait(client, frame => frame.topic === 'game:state_sync' && frame.payload?.revision > revision, from)).payload;
}
async function error(client, topic, payload, code) {
  const from = client.frames.length; client.send(topic, payload);
  const frame = await wait(client, frame => frame.topic === 'error', from);
  check(`reject ${topic}: ${code}`, code ? frame.payload?.code === code : !!frame.payload?.message);
}
async function main() {
  const accounts = [];
  for (const nickname of ['GomokuBlack', 'GomokuWhite', 'DrawPlayer']) {
    const response = await api('/auth/guest', null, { nickname }); check(`real guest ${nickname}`, response.status === 200 && !!response.token);
    accounts.push(response);
  }
  const [black, white, third] = accounts;
  const draw = await api('/rooms', third, { title: 'Draw control' });
  check('drawing creation retains existing default', draw.status === 201);
  check('reject invalid Gomoku capacity', (await api('/rooms', black, { title: 'Invalid', gameId: 'gomoku', maxPlayers: 4 })).status === 400);
  const created = await api('/rooms', black, { title: 'Gomoku integration', gameId: 'gomoku', totalRounds: 1, drawDuration: 30 });
  check('real Gomoku room creation', created.status === 201);
  const summary = (await api('/rooms', black)).rooms.find(room => room.roomId === created.roomId);
  check('room summary exposes real game and two seats', summary.gameId === 'gomoku' && summary.maxPlayers === 2);
  const hostJoin = await api(`/rooms/${created.roomId}/join`, black, {});
  const host = await connect(black, created.roomId, hostJoin.ticket);
  const matched = await api('/rooms/match', white, { gameId: 'gomoku' });
  check('Gomoku quick match excludes the available drawing room', matched.roomId === created.roomId && matched.roomId !== draw.roomId);
  let opponent = await connect(white, created.roomId, matched.ticket);
  check('third player cannot join a two-seat room', (await api(`/rooms/${created.roomId}/join`, third, {})).status === 409);
  const beforeSettings = host.frames.length;
  host.send('room:settings_update', { title: 'No type switch', gameId: 'draw-and-guess', maxPlayers: 8 });
  check('room game type is immutable', (await wait(host, frame => frame.topic === 'error', beforeSettings)).payload.code === 'wrong_game');
  opponent.send('room:ready_toggle');
  await wait(host, frame => frame.topic === 'room:state_sync' && frame.payload?.players.every(player => player.isReady && player.isOnline));
  host.send('room:start_game');
  await wait(host, frame => frame.topic === 'game:state_sync' && frame.payload?.status === 'playing');
  await wait(opponent, frame => frame.topic === 'game:state_sync' && frame.payload?.status === 'playing');
  check('starts empty authoritative black-first board', current(host).moves.length === 0 && current(host).currentTurn === 'black' && current(host).playerIds.black === black.user.id);
  await error(opponent, 'gomoku:place', { revision: 0, x: 7, y: 7 }, 'not_your_turn');
  await error(host, 'gomoku:place', { revision: 0, x: 99, y: 7 }, 'invalid_action');
  await action(host, 'gomoku:place', { x: 7, y: 7 });
  await wait(opponent, frame => frame.topic === 'game:state_sync' && frame.payload?.revision === current(host).revision);
  check('both clients receive the same real board', JSON.stringify(current(host).board) === JSON.stringify(current(opponent).board));
  await error(opponent, 'gomoku:place', { revision: current(host).revision, x: 7, y: 7 }, 'occupied');
  await error(opponent, 'gomoku:place', { revision: 0, x: 8, y: 7 }, 'stale_state');
  await action(opponent, 'gomoku:place', { x: 8, y: 7 });
  await wait(host, frame => frame.topic === 'game:state_sync' && frame.payload?.moves.length === 2);
  await action(host, 'gomoku:request_undo');
  await wait(opponent, frame => frame.topic === 'game:state_sync' && frame.payload?.pendingRequest?.type === 'undo');
  await error(host, 'gomoku:reply', { revision: current(host).revision, requestId: current(host).pendingRequest.id, accept: true }, 'not_responder');
  await action(opponent, 'gomoku:reply', { requestId: current(opponent).pendingRequest.id, accept: false });
  await wait(host, frame => frame.topic === 'game:state_sync' && frame.payload?.revision === current(opponent).revision);
  check('declined undo retains the real two moves', current(host).moves.length === 2);
  await action(host, 'gomoku:request_undo');
  await wait(opponent, frame => frame.topic === 'game:state_sync' && frame.payload?.pendingRequest?.id === current(host).pendingRequest.id);
  await action(opponent, 'gomoku:reply', { requestId: current(opponent).pendingRequest.id, accept: true });
  await wait(host, frame => frame.topic === 'game:state_sync' && frame.payload?.revision === current(opponent).revision);
  check('accepted undo removes both moves and restores requester turn', current(host).moves.length === 0 && current(host).currentTurn === 'black' && current(host).undoRemaining[black.user.id] === 1);
  const hintFrom = host.frames.length, opponentHints = opponent.frames.filter(frame => frame.topic === 'gomoku:hint').length;
  host.send('gomoku:hint', { revision: current(host).revision });
  const hint = await wait(host, frame => frame.topic === 'gomoku:hint', hintFrom);
  check('private tactical hint uses the real board without moving', hint.payload.x === 7 && hint.payload.y === 7 && current(host).moves.length === 0 && opponent.frames.filter(frame => frame.topic === 'gomoku:hint').length === opponentHints);
  const chatFrom = host.frames.length; opponent.send('chat:send', { content: '💡 Good game', isDanmaku: true });
  const chat = await wait(host, frame => frame.topic === 'chat:message', chatFrom);
  check('real chat uses ordinary chat semantics', chat.payload.payload.content === '💡 Good game' && chat.payload.payload.type === 'danmaku');
  await action(host, 'gomoku:place', { x: 0, y: 0 });
  const deadline = current(host).deadline;
  const offlineFrom = host.frames.length; opponent.ws.close(1000, 'Reconnect test');
  await wait(host, frame => frame.topic === 'room:state_sync' && frame.payload?.players.some(player => player.id === white.user.id && !player.isOnline), offlineFrom);
  const rejoined = await api(`/rooms/${created.roomId}/join`, white, {}); opponent = await connect(white, created.roomId, rejoined.ticket);
  check('real reconnect preserves seat, move, revision and deadline', current(opponent).moves.length === 1 && current(opponent).deadline === deadline && current(opponent).playerIds.white === white.user.id);
  await error(opponent, 'game:submit_guess', { guess: 'random' }, 'wrong_game');
  for (let i = 0; i < 4; i++) {
    await action(opponent, 'gomoku:place', { x: 14 - i, y: 14 });
    await wait(host, frame => frame.topic === 'game:state_sync' && frame.payload?.revision === current(opponent).revision);
    await action(host, 'gomoku:place', { x: i + 1, y: 0 });
    await wait(opponent, frame => frame.topic === 'game:state_sync' && frame.payload?.revision === current(host).revision);
  }
  check('a real five-in-a-row wins the match', current(host).status === 'game_over' && current(host).matchWinnerId === black.user.id && current(host).roundResults[0].moves.length === 9);
  const endedRoom = await wait(host, frame => frame.topic === 'room:state_sync' && frame.payload?.status === 'settlement');
  check('match end retains both players in the same connected room', endedRoom.payload.roomId === created.roomId && endedRoom.payload.players.length === 2 && host.ws.readyState === 1 && opponent.ws.readyState === 1);
  let profile = await api('/me', black), losingProfile = await api('/me', white);
  check('real statistics count one win and one completed match', profile.stats.totalGames === 1 && profile.stats.wins === 1 && losingProfile.stats.totalGames === 1 && losingProfile.stats.wins === 0);
  const history = (await api('/me/matches', black)).matches;
  check('profile history records the actual game, winner and score', history[0].game_id === 'gomoku' && history[0].winner_nickname === black.user.nickname && history[0].scores.find(score => score.playerId === black.user.id).score === 1);
  await error(opponent, 'room:restart', {}, null);
  let from = host.frames.length; host.send('room:restart');
  await wait(host, frame => frame.topic === 'room:state_sync' && frame.payload?.status === 'waiting', from);
  await wait(host, frame => frame.topic === 'game:state_sync' && frame.payload === null, from);
  check('host restart keeps room and resets guest readiness', (await wait(host, frame => frame.topic === 'room:state_sync' && frame.payload?.status === 'waiting', from)).payload.players.find(player => player.id === white.user.id).isReady === false);
  opponent.send('room:ready_toggle'); from = host.frames.length;
  await wait(host, frame => frame.topic === 'room:state_sync' && frame.payload?.players.every(player => player.isReady), from);
  host.send('room:start_game');
  await wait(host, frame => frame.topic === 'game:state_sync' && frame.payload?.status === 'playing', from);
  await wait(opponent, frame => frame.topic === 'game:state_sync' && frame.payload?.matchId === current(host).matchId);
  await action(host, 'gomoku:request_draw');
  await wait(opponent, frame => frame.topic === 'game:state_sync' && frame.payload?.pendingRequest?.type === 'draw');
  await action(opponent, 'gomoku:reply', { requestId: current(opponent).pendingRequest.id, accept: true });
  check('agreed draw ends the match with no invented winner', current(opponent).status === 'game_over' && current(opponent).matchWinnerId === null);
  profile = await api('/me', black); losingProfile = await api('/me', white);
  check('draw counts a game without incrementing wins', profile.stats.totalGames === 2 && profile.stats.wins === 1 && losingProfile.stats.totalGames === 2 && losingProfile.stats.wins === 0);
  check('draw history persists a nullable winner', (await api('/me/matches', black)).matches[0].winner_nickname === null);
  const drawMatched = await api('/rooms/match', third, {});
  check('default quick match still selects drawing rooms', drawMatched.roomId === draw.roomId);
  check('legacy empty-body quick match retains drawing defaults', (await api('/rooms/match', third, undefined, 'POST')).roomId === draw.roomId);
  console.log(`RESULT ${checks}/${checks} passed`);
}
try { await main(); } catch (error) { console.error('FAIL', error.message); process.exitCode = 1; }
finally { for (const ws of sockets) if (ws.readyState === WebSocket.OPEN) ws.close(1000, 'Test complete'); }
