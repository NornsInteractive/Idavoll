import { RoomState, ChatMessage, UserAccount, RoomSettingsSchema, MessageInputSchema, DrawStroke, GomokuState, GomokuAction, isGomokuState } from '@idavoll/protocol';
import { DrawAndGuessGameModule, ServerGameState, gameView } from '@idavoll/game-draw-and-guess';
import { RoomHost } from '@idavoll/game-sdk';
import { Env } from './env';
import { signJWT, verifyJWT } from './auth';
import { initGomoku, handleGomokuAction, tickGomoku, leaveGomoku, gomokuHint, GomokuRuleError } from './gomoku';

const viewGame = (game: ServerGameState | GomokuState, userId: string) => isGomokuState(game) ? game : gameView(game, userId);

interface Snapshot {
  room: RoomState;
  game: ServerGameState | GomokuState | null;
  messages: ChatMessage[];
  matchId: string;
  disconnected: Record<string, number>;
  tickets: Record<string, { userId: string; expiresAt: number }>;
  passwordHash?: string;
  passwordSalt?: string;
  redo: DrawStroke[];
  archivedTurns: number[];
}
interface SocketData { userId: string; seq: number; second: number; count: number; chats: number; }

export class GameRoomDO implements DurableObject {
  private data: Snapshot | null = null;
  private module = new DrawAndGuessGameModule();
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private state: DurableObjectState, private env: Env) {
    state.blockConcurrencyWhile(async () => { this.data = await state.storage.get<Snapshot>('snapshot') || null; });
  }
  private run<T>(fn: () => Promise<T>): Promise<T> {
    const task = this.queue.then(fn);
    this.queue = task.catch(() => {});
    return task;
  }
  fetch(request: Request): Promise<Response> { return this.run(() => this.handleFetch(request)); }
  private async hashPassword(password: string, salt: string): Promise<string> {
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
    const hash = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(salt), iterations: 100000 }, key, 256);
    return Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('');
  }
  private async handleFetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/rate' && request.method === 'POST') {
      const attempts = (await this.state.storage.get<number[]>('attempts') || []).filter(time => time > Date.now() - 60000);
      if (attempts.length >= 30) return Response.json({ error: '操作过于频繁' }, { status: 429 });
      attempts.push(Date.now());
      await this.state.storage.put('attempts', attempts);
      return Response.json({ ok: true });
    }
    if (url.pathname === '/init' && !this.data) {
      const input = await request.json() as { roomId: string; roomCode: string; settings: RoomState['settings']; password?: string; user: UserAccount };
      const passwordSalt = input.password ? crypto.randomUUID() : undefined;
      this.data = {
        room: { roomId: input.roomId, roomCode: input.roomCode, hostId: input.user.id, settings: input.settings, status: 'waiting', currentRound: 1, createdAt: Date.now(), players: [{ ...input.user, isHost: true, isReady: true, isOnline: false, score: 0, micMuted: true }] },
        game: null, messages: [], matchId: '', disconnected: { [input.user.id]: Date.now() }, tickets: {}, redo: [], archivedTurns: [],
        passwordSalt, passwordHash: passwordSalt ? await this.hashPassword(input.password!, passwordSalt) : undefined,
      };
      await this.save();
      return Response.json({ ok: true });
    }
    if (!this.data) return Response.json({ error: '房间不存在' }, { status: 404 });
    await this.removeExpired();
    await this.advanceClock();
    const data = this.data;
    if (url.pathname === '/member') {
      const { userId } = await request.json() as { userId: string };
      return Response.json({ ok: true }, { status: data.room.players.some(p => p.id === userId && p.isOnline) ? 200 : 403 });
    }
    if (url.pathname === '/join') {
      const { user, password } = await request.json() as { user: UserAccount; password?: string };
      if (!data.room.players.length && data.room.hostId) return Response.json({ error: '房间已关闭' }, { status: 410 });
      let player = data.room.players.find(p => p.id === user.id);
      if (!player) {
        if (data.room.settings.isPrivate && (!password || await this.hashPassword(password, data.passwordSalt!) !== data.passwordHash)) return Response.json({ error: '房间密码错误' }, { status: 403 });
        if (data.room.status !== 'waiting') return Response.json({ error: '游戏已经开始' }, { status: 409 });
        if (data.room.players.length >= data.room.settings.maxPlayers) return Response.json({ error: '房间已满' }, { status: 409 });
        player = { ...user, isHost: false, isReady: false, isOnline: false, score: 0, micMuted: true };
        data.room.players.push(player);
        data.disconnected[user.id] = Date.now();
      } else { player.nickname = user.nickname; player.avatar = user.avatar; }
      for (const [id, ticket] of Object.entries(data.tickets)) if (ticket.userId === user.id) delete data.tickets[id];
      const jti = crypto.randomUUID();
      data.tickets[jti] = { userId: user.id, expiresAt: Date.now() + 30000 };
      const ticket = await signJWT({ sub: user.id, kind: 'room', roomId: data.room.roomId, jti }, this.env.JWT_SECRET, 30);
      await this.save();
      this.broadcastRoom();
      return Response.json({ roomId: data.room.roomId, roomCode: data.room.roomCode, ticket });
    }
    if (request.headers.get('Upgrade')?.toLowerCase() === 'websocket') {
      const claim = await verifyJWT(url.searchParams.get('ticket') || '', this.env.JWT_SECRET, 'room');
      const ticket = claim?.jti ? data.tickets[claim.jti] : null;
      const player = data.room.players.find(p => p.id === claim?.sub);
      if (!claim || claim.roomId !== data.room.roomId || !ticket || ticket.expiresAt < Date.now() || ticket.userId !== claim.sub || !player) return Response.json({ error: '连接凭据已失效' }, { status: 401 });
      delete data.tickets[claim.jti!];
      const [client, server] = Object.values(new WebSocketPair());
      for (const ws of this.state.getWebSockets(claim.sub)) ws.close(4001, 'Connected elsewhere');
      this.state.acceptWebSocket(server, [claim.sub]);
      server.serializeAttachment({ userId: claim.sub, seq: 0, second: 0, count: 0, chats: 0 } satisfies SocketData);
      player.isOnline = true;
      player.micMuted = true;
      delete data.disconnected[claim.sub];
      const profile = await this.env.DB.prepare('SELECT nickname,avatar FROM users WHERE id=?').bind(claim.sub).first<{ nickname: string; avatar: string }>();
      if (profile) Object.assign(player, profile);
      await this.save();
      this.send(server, 'connection:snapshot', { room: data.room, game: data.game ? viewGame(data.game, claim.sub) : null, messages: data.messages });
      this.broadcastRoom();
      return new Response(null, { status: 101, webSocket: client });
    }
    return Response.json({ error: 'Not found' }, { status: 404 });
  }
  webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer): Promise<void> { return this.run(() => this.message(ws, raw)); }
  private async message(ws: WebSocket, raw: string | ArrayBuffer) {
    if (!this.data) return;
    try {
      if (typeof raw !== 'string' || new TextEncoder().encode(raw).length > 131072) throw new Error('消息过大');
      const event = MessageInputSchema.parse(JSON.parse(raw));
      const attachment = ws.deserializeAttachment() as SocketData;
      const now = Math.floor(Date.now() / 1000);
      if (attachment.second !== now) { attachment.second = now; attachment.count = 0; attachment.chats = 0; }
      attachment.count++;
      if (event.topic === 'chat:send' || event.topic === 'game:submit_guess') attachment.chats++;
      ws.serializeAttachment(attachment);
      if (attachment.count > 120 || attachment.chats > 5) throw new Error('操作过于频繁');
      const d = this.data;
      const user = d.room.players.find(p => p.id === attachment.userId && p.isOnline);
      if (!user || ws.readyState !== 1 || !this.state.getWebSockets(user.id).includes(ws)) throw new Error('请重新连接房间');
      const host = user.id === d.room.hostId;
      if (event.topic === 'room:heartbeat') {
        await this.env.DB.prepare('UPDATE users SET last_seen=? WHERE id=?').bind(Date.now(), user.id).run();
        const profile = await this.env.DB.prepare('SELECT nickname,avatar FROM users WHERE id=?').bind(user.id).first<{ nickname: string; avatar: string }>();
        if (profile && (profile.nickname !== user.nickname || profile.avatar !== user.avatar)) {
          Object.assign(user, profile);
          if (d.game) {
            const score = d.game.scores.find(s => s.playerId === user.id);
            if (score) Object.assign(score, profile);
            if (!isGomokuState(d.game) && d.game.drawerId === user.id) d.game.drawerNickname = profile.nickname;
          }
          await this.save(false); this.broadcastRoom(); this.broadcastGame();
        }
        await this.updateIndex();
        return;
      }
      if (event.topic === 'room:leave') { await this.leave(user.id); return; }
      if (event.topic === 'voice:signal') {
        if (!d.room.players.some(p => p.id === event.payload.targetId && p.isOnline)) throw new Error('语音目标不在线');
        for (const target of this.state.getWebSockets(event.payload.targetId)) this.send(target, 'voice:signal', { senderId: user.id, signal: event.payload.signal });
        return;
      }
      if (event.topic === 'voice:state') { user.micMuted = event.payload.muted; await this.save(); this.broadcastRoom(); return; }
      if (event.topic === 'room:ready_toggle') {
        if (d.room.status !== 'waiting') throw new Error('仅等待时可以准备');
        user.isReady = host ? true : !user.isReady;
        await this.save(); this.broadcastRoom(); return;
      }
      if (event.topic === 'room:settings_update') {
        if (!host || d.room.status !== 'waiting') throw new Error('仅房主可以在等待时修改设置');
        const { password, ...settings } = RoomSettingsSchema.parse(event.payload);
        if (settings.gameId !== d.room.settings.gameId) throw new GomokuRuleError('wrong_game');
        if (settings.maxPlayers < d.room.players.length) throw new Error('人数上限小于当前玩家数');
        if (settings.isPrivate && !password && !d.passwordHash) throw new Error('请设置房间密码');
        if (password && (password.length < 4 || password.length > 64)) throw new Error('密码须为 4–64 个字符');
        if (settings.isPrivate && password) { d.passwordSalt = crypto.randomUUID(); d.passwordHash = await this.hashPassword(password, d.passwordSalt); }
        if (!settings.isPrivate) { d.passwordHash = undefined; d.passwordSalt = undefined; }
        d.room.settings = settings;
        await this.save(); this.broadcastRoom(); return;
      }
      if (event.topic === 'room:restart') {
        if (!host || d.room.status !== 'settlement') throw new Error('仅房主可以在结算后重开');
        d.room.status = 'waiting'; d.room.currentRound = 1; d.game = null; d.redo = []; d.archivedTurns = [];
        d.room.players.forEach(p => { p.isReady = p.isHost; p.score = 0; });
        await this.save(); this.broadcastRoom(); this.broadcastGame(); return;
      }
      if (event.topic === 'room:start_game') {
        if (!host || d.room.status !== 'waiting' || d.room.players.length < 2 || d.room.players.some(p => !p.isOnline || !p.isReady)) throw new Error('需要至少两位在线且准备的玩家，由房主开始');
        d.matchId = crypto.randomUUID(); d.archivedTurns = []; d.redo = [];
        d.game = d.room.settings.gameId === 'gomoku' ? initGomoku(d.room.players, d.room.settings, d.matchId) : this.module.initGame(d.room.players, d.room.settings);
        d.room.status = 'playing';
        await this.save(); this.broadcastRoom(); this.broadcastGame(); return;
      }
      await this.advanceClock();
      const activeGame = d.game;
      if (event.topic.startsWith('gomoku:')) {
        if (!isGomokuState(activeGame)) throw new GomokuRuleError('wrong_game');
        const action = event as GomokuAction;
        if (action.topic === 'gomoku:hint') {
          this.send(ws, 'gomoku:hint', gomokuHint(activeGame, action.payload.revision, user.id));
          return;
        }
        d.game = handleGomokuAction(activeGame, action, user.id);
        if (d.game.status === 'game_over') await this.save(false);
        await this.afterGameChange(); await this.save(false); this.broadcastGame();
        return;
      }
      if (isGomokuState(activeGame) && (event.topic.startsWith('draw:') || event.topic.startsWith('game:'))) throw new GomokuRuleError('wrong_game');
      const game = activeGame && !isGomokuState(activeGame) ? activeGame : null;
      if (event.topic.startsWith('draw:')) {
        if (!game || game.status !== 'drawing' || game.drawerId !== user.id) throw new Error('仅当前画手可以作画');
        if (event.topic === 'draw:stroke') {
          const stroke = { ...event.payload, timestamp: Date.now() };
          const index = game.strokes.findIndex(s => s.id === stroke.id);
          const totalPoints = game.strokes.reduce((n, s) => n + (s.id === stroke.id ? 0 : s.points.length), 0) + stroke.points.length;
          if (totalPoints > 30000 || (index < 0 && game.strokes.length >= 500)) throw new Error('画板已达到容量上限');
          if (index < 0) { game.strokes.push(stroke); d.redo = []; } else game.strokes[index] = stroke;
          await this.save(false); this.broadcast('draw:stroke', stroke); return;
        }
        if (event.topic === 'draw:undo') { const stroke = game.strokes.pop(); if (stroke) d.redo.push(stroke); }
        if (event.topic === 'draw:redo') { const stroke = d.redo.pop(); if (stroke) game.strokes.push(stroke); }
        if (event.topic === 'draw:clear') { game.strokes = []; d.redo = []; }
        await this.save(false); this.broadcastGame(); return;
      }
      if (event.topic === 'chat:send' || event.topic === 'game:submit_guess') {
        const isGuess = event.topic === 'game:submit_guess';
        const content = event.topic === 'chat:send' ? event.payload.content : event.payload.guess;
        const isDanmaku = event.topic === 'chat:send' && !!event.payload.isDanmaku;
        if (game?.status === 'drawing' && content.toLocaleLowerCase().includes(game.secretWord.toLocaleLowerCase())) {
          if (!isGuess || user.id === game.drawerId || game.scores.find(s => s.playerId === user.id)?.hasGuessedCorrectly || content.toLocaleLowerCase() !== game.secretWord.toLocaleLowerCase()) throw new Error('本回合结束前请不要公布答案');
        }
        let correct = false;
        if (isGuess && game?.status === 'drawing' && user.id !== game.drawerId) {
          const result = this.module.handleAction(game, { type: 'submit_guess', guess: content }, user.id, this.host());
          d.game = result.state;
          correct = !!result.effects?.some(e => (e as { type: string }).type === 'correct_guess');
          this.send(ws, 'game:guess_result', { correct, earned: correct ? result.state.earnings[user.id] : 0 });
        }
        const msg: ChatMessage = { version: 'v1', seq: Date.now(), timestamp: Date.now(), senderId: user.id, type: 'chat:message', payload: { id: crypto.randomUUID(), type: correct ? 'correct_guess' : isDanmaku ? 'danmaku' : isGuess && game?.status === 'drawing' && user.id !== game.drawerId ? 'guess' : 'text', content: correct ? `🎉 ${user.nickname} 猜对了！` : content, senderNickname: user.nickname, senderAvatar: user.avatar, isDanmaku: correct ? false : isDanmaku } };
        d.messages = [...d.messages.slice(-99), msg];
        await this.afterGameChange();
        await this.save(false); this.broadcast('chat:message', msg);
        if (activeGame) this.broadcastGame();
        return;
      }
      if (event.topic.startsWith('game:')) {
        if (!game || d.room.status !== 'playing') throw new Error('当前没有正在进行的游戏');
        const action = event.topic.slice(5) as 'choose_word' | 'pass_turn' | 'reroll_word' | 'reveal_hint';
        const result = this.module.handleAction(game, { type: action, ...event.payload }, user.id, this.host());
        if (result.state === game) throw new Error('当前状态不允许此操作');
        if (result.state.secretWord !== game.secretWord) d.redo = [];
        d.game = result.state;
        await this.afterGameChange(); await this.save(false); this.broadcastGame();
        return;
      }
    } catch (error) {
      const invalidGomoku = this.data.room.settings.gameId === 'gomoku' && error && typeof error === 'object' && 'issues' in error;
      const failure = invalidGomoku ? new GomokuRuleError('invalid_action') : error;
      this.send(ws, 'error', failure instanceof GomokuRuleError ? { code: failure.code, message: failure.message } : { message: failure && typeof failure === 'object' && 'issues' in failure ? '消息格式不正确' : failure instanceof Error ? failure.message : '操作失败' });
    }
  }
  private async afterGameChange() {
    const d = this.data!;
    const game = d.game;
    if (!game) return;
    d.room.currentRound = game.currentRound;
    for (const p of d.room.players) p.score = game.scores.find(s => s.playerId === p.id)?.score || 0;
    if (isGomokuState(game)) {
      if (game.status === 'game_over' && d.room.status !== 'settlement') {
        const winner = game.scores.find(score => score.playerId === game.matchWinnerId);
        await this.env.DB.batch([
          this.env.DB.prepare('INSERT OR IGNORE INTO match_records (id,room_id,winner_id,winner_nickname,total_rounds,scores_json,played_at) VALUES (?,?,?,?,?,?,?)').bind(d.matchId, d.room.roomId, winner?.playerId ?? null, winner?.nickname ?? null, game.roundResults.length, JSON.stringify(game.scores), Date.now()),
          ...game.scores.map(score => this.env.DB.prepare('INSERT OR IGNORE INTO match_participants (match_id,user_id,score,won,guesses,correct_guesses) VALUES (?,?,?,?,?,?)').bind(d.matchId, score.playerId, score.score, score.playerId === game.matchWinnerId ? 1 : 0, 0, 0)),
        ]);
        d.room.status = 'settlement';
        try { await this.updateIndex(); } catch (error) { d.room.status = 'playing'; throw error; }
        this.broadcastRoom(); this.broadcastGame();
      }
      return;
    }
    if (game.status === 'turn_ended' && game.secretWord && game.strokes.length && !d.archivedTurns.includes(game.turnIndex || 0)) {
      const id = `${d.matchId}_${game.turnIndex || 0}`;
      const storageKey = `drawings/${id}.json`;
      await this.env.DRAWINGS_BUCKET.put(storageKey, JSON.stringify({ word: game.secretWord, strokes: game.strokes, width: 800, height: 600 }), { httpMetadata: { contentType: 'application/json' } });
      await this.env.DB.prepare('INSERT OR IGNORE INTO drawings (id,user_id,match_id,word,storage_key,created_at) VALUES (?,?,?,?,?,?)').bind(id, game.drawerId, d.matchId, game.secretWord, storageKey, Date.now()).run();
      d.archivedTurns.push(game.turnIndex || 0);
    }
    if (game.status === 'game_over' && d.room.status !== 'settlement') {
      if (!game.aborted) {
        const top = [...game.scores].sort((a, b) => b.score - a.score)[0];
        const queries = [this.env.DB.prepare('INSERT OR IGNORE INTO match_records (id,room_id,winner_id,winner_nickname,total_rounds,scores_json,played_at) VALUES (?,?,?,?,?,?,?)').bind(d.matchId, d.room.roomId, top.playerId, top.nickname, game.totalRounds, JSON.stringify(game.scores), Date.now()), ...game.scores.map(s => this.env.DB.prepare('INSERT OR IGNORE INTO match_participants (match_id,user_id,score,won,guesses,correct_guesses) VALUES (?,?,?,?,?,?)').bind(d.matchId, s.playerId, s.score, s.score === top.score ? 1 : 0, game.guesses[s.playerId] || 0, game.correctGuesses[s.playerId] || 0))];
        await this.env.DB.batch(queries);
      }
      d.room.status = 'settlement';
      try { await this.updateIndex(); } catch (error) { d.room.status = 'playing'; throw error; }
      this.broadcastRoom(); this.broadcastGame();
    }
  }
  private async advanceClock() {
    const game = this.data?.game;
    if (isGomokuState(game)) {
      if (game.status === 'game_over') { await this.afterGameChange(); return; }
      if (this.data!.room.status !== 'playing') return;
      const next = tickGomoku(game);
      this.data!.game = next;
      if (next.revision !== game.revision) {
        if (next.status === 'game_over') await this.save(false);
        await this.afterGameChange(); await this.save(); this.broadcastRoom(); this.broadcastGame();
      } else this.broadcast('game:clock', { gameId: 'gomoku', timeLeft: next.timeLeft, deadline: next.deadline });
      return;
    }
    if (game && ['turn_ended', 'game_over'].includes(game.status)) await this.afterGameChange();
    if (!game || this.data!.room.status !== 'playing' || !game.deadline) return;
    const remaining = Math.max(0, Math.ceil((game.deadline - Date.now()) / 1000));
    const next = this.module.onTick(game, Math.max(0, game.timeLeft - remaining), this.host());
    this.data!.game = next;
    if (game.status !== next.status || game.turnIndex !== next.turnIndex) {
      this.data!.redo = [];
      await this.afterGameChange(); await this.save(); this.broadcastGame();
    } else this.broadcast('game:clock', { timeLeft: remaining, deadline: game.deadline });
  }
  alarm(): Promise<void> { return this.run(async () => {
    try { if (this.data) { await this.removeExpired(); await this.advanceClock(); await this.save(false); } }
    finally { await this.scheduleAlarm(); }
  }); }
  webSocketClose(ws: WebSocket, code: number, reason: string): Promise<void> {
    return this.run(async () => {
      // This compatibility date requires completing the close handshake explicitly.
      ws.close([1005, 1006, 1015].includes(code) ? 1000 : code, reason);
      await this.closed(ws);
    });
  }
  webSocketError(ws: WebSocket): Promise<void> { return this.run(async () => { ws.close(1011, 'Connection error'); await this.closed(ws); }); }
  private async closed(ws: WebSocket) {
    const attachment = ws.deserializeAttachment() as SocketData | null;
    if (!this.data || !attachment) return;
    if (this.state.getWebSockets(attachment.userId).some(other => other !== ws && other.readyState === 1)) return;
    const player = this.data.room.players.find(p => p.id === attachment.userId);
    if (player) { player.isOnline = false; player.micMuted = true; this.data.disconnected[player.id] = Date.now(); await this.save(); this.broadcastRoom(); }
  }
  private async removeExpired() {
    if (!this.data) return;
    for (const [id, time] of Object.entries(this.data.disconnected)) if (Date.now() - time >= 30000) await this.leave(id);
    for (const [id, ticket] of Object.entries(this.data.tickets)) if (ticket.expiresAt < Date.now()) delete this.data.tickets[id];
  }
  private async leave(userId: string) {
    const d = this.data!;
    d.room.players = d.room.players.filter(p => p.id !== userId);
    delete d.disconnected[userId];
    for (const [id, ticket] of Object.entries(d.tickets)) if (ticket.userId === userId) delete d.tickets[id];
    for (const ws of this.state.getWebSockets(userId)) ws.close(1000, 'Left room');
    if (d.room.hostId === userId && d.room.players.length) {
      d.room.hostId = (d.room.players.find(p => p.isOnline) || d.room.players[0]).id;
      d.room.players.forEach(p => { p.isHost = p.id === d.room.hostId; if (p.isHost) p.isReady = true; });
    }
    if (d.game && d.room.status === 'playing') {
      d.game = isGomokuState(d.game) ? leaveGomoku(d.game, userId) : this.module.onPlayerLeave(d.game, userId, this.host());
      if (isGomokuState(d.game) && d.game.status === 'game_over') await this.save(false);
      await this.afterGameChange();
    }
    await this.save(); this.broadcastRoom(); this.broadcastGame();
  }
  private async save(index = true) {
    await this.state.storage.put('snapshot', this.data);
    if (index) await this.updateIndex();
    await this.scheduleAlarm();
  }
  private async scheduleAlarm() {
    const d = this.data;
    if (!d || !d.room.players.length) { await this.state.storage.deleteAlarm(); return; }
    const disconnectAt = Object.values(d.disconnected).map(time => time + 30000);
    const next = d.room.status === 'playing' ? Date.now() + 1000 : disconnectAt.length ? Math.max(Date.now() + 100, Math.min(...disconnectAt)) : null;
    if (next !== null) {
      const alarm = await this.state.storage.getAlarm();
      if (!alarm || alarm <= Date.now() || alarm > next) await this.state.storage.setAlarm(next);
    } else await this.state.storage.deleteAlarm();
  }
  private async updateIndex() {
    const room = this.data!.room;
    await this.env.DB.prepare('UPDATE rooms SET title=?,host_id=?,status=?,settings_json=?,player_count=?,updated_at=? WHERE id=?').bind(room.settings.title, room.hostId, room.players.length ? room.status : 'closed', JSON.stringify(room.settings), room.players.length, Date.now(), room.roomId).run();
  }
  private send(ws: WebSocket, topic: string, payload: unknown) {
    try { const attachment = ws.deserializeAttachment() as SocketData; attachment.seq++; ws.serializeAttachment(attachment); ws.send(JSON.stringify({ topic, payload, seq: attachment.seq, timestamp: Date.now() })); }
    catch { ws.close(1011, 'Delivery failed'); }
  }
  private broadcast(topic: string, payload: unknown) { for (const ws of this.state.getWebSockets()) this.send(ws, topic, payload); }
  private broadcastRoom() { this.broadcast('room:state_sync', this.data!.room); }
  private broadcastGame() {
    for (const ws of this.state.getWebSockets()) { const a = ws.deserializeAttachment() as SocketData; this.send(ws, 'game:state_sync', this.data!.game ? viewGame(this.data!.game, a.userId) : null); }
  }
  private host(): RoomHost {
    return { getRoomState: () => this.data!.room, broadcast: (topic, data) => this.broadcast(topic, data), sendTo: (id, topic, data) => this.state.getWebSockets(id).forEach(ws => this.send(ws, topic, data)), scheduleTimer: () => { throw new Error('Use Durable Object alarm'); }, cancelTimer: () => {}, kickPlayer: id => { void this.leave(id); } };
  }
}
