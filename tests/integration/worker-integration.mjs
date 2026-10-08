import http from 'node:http';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SERVER = path.join(ROOT, 'apps', 'server');
const PERSIST = path.join(ROOT, '.cache', 'wrangler-state');
const WRANGLER = path.join(SERVER, 'node_modules', '.bin', 'wrangler');
const BASE = process.env.BASE_URL || 'http://127.0.0.1:8791';

const results = [];
let currentSection = '';

function section(title) {
  currentSection = title;
  console.log(`\n=== ${title}`);
}

function check(name, condition, detail = '') {
  const pass = !!condition;
  results.push({ section: currentSection, name, pass, detail: pass ? '' : String(detail) });
  console.log(`${pass ? '  PASS' : '  FAIL'} ${name}${!pass && detail ? ` -- ${detail}` : ''}`);
  return pass;
}

function note(message) {
  console.log(`  .... ${message}`);
}

async function api(route, { method = 'GET', token, body } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${BASE}${route}`, { method, headers, body });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { status: res.status, text, json };
}

function wsUrl(roomId, ticket) {
  return `${BASE.replace(/^http/, 'ws')}/api/rooms/${roomId}/ws?ticket=${encodeURIComponent(ticket)}`;
}

function wsHandshake(url) {
  return new Promise(resolve => {
    const u = new URL(url);
    const req = http.request({
      host: u.hostname,
      port: u.port,
      path: `${u.pathname}${u.search}`,
      headers: {
        Connection: 'Upgrade',
        Upgrade: 'websocket',
        'Sec-WebSocket-Version': '13',
        'Sec-WebSocket-Key': Buffer.from(crypto.randomUUID()).toString('base64'),
      },
    });
    req.on('upgrade', (res, socket) => {
      socket.destroy();
      resolve({ status: 101 });
    });
    req.on('response', res => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => resolve({ status: res.statusCode, body: data.slice(0, 240) }));
    });
    req.on('error', err => resolve({ status: 0, error: String(err) }));
    req.end();
  });
}

function connect(url, label) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const client = {
      label,
      ws,
      frames: [],
      send(topic, payload) {
        ws.send(JSON.stringify({ topic, payload }));
      },
      rawSend(text) {
        ws.send(text);
      },
      close() {
        ws.close(1000, 'test');
      },
    };
    const timer = setTimeout(() => reject(new Error(`${label}: WebSocket open timeout`)), 15000);
    ws.onopen = () => {
      clearTimeout(timer);
      resolve(client);
    };
    ws.onerror = () => {
      clearTimeout(timer);
      reject(new Error(`${label}: WebSocket error`));
    };
    ws.onclose = () => {};
    ws.onmessage = ev => {
      try {
        client.frames.push(JSON.parse(typeof ev.data === 'string' ? ev.data : String(ev.data)));
      } catch {
        client.frames.push({ topic: '__unparsable__', payload: String(ev.data).slice(0, 160) });
      }
    };
  });
}

function waitFor(client, from, predicate, timeoutMs = 20000, label = 'frame') {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const tick = () => {
      for (let i = Math.max(0, from); i < client.frames.length; i++) {
        if (predicate(client.frames[i])) {
          resolve({ frame: client.frames[i], index: i });
          return;
        }
      }
      if (Date.now() - started > timeoutMs) {
        const tail = client.frames.slice(-8).map(f => f.topic).join(',');
        reject(new Error(`${client.label}: timeout waiting for ${label} (recent topics: ${tail})`));
        return;
      }
      setTimeout(tick, 25);
    };
    tick();
  });
}

function latest(client, predicate) {
  for (let i = client.frames.length - 1; i >= 0; i--) {
    if (predicate(client.frames[i])) return client.frames[i];
  }
  return null;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function d1(sql) {
  const out = execFileSync(WRANGLER, ['d1', 'execute', 'idavoll-d1', '--local', '--persist-to', PERSIST, '--json', '--command', sql], {
    cwd: SERVER,
    encoding: 'utf8',
    env: { ...process.env, WRANGLER_SEND_METRICS: 'false' },
    maxBuffer: 32 * 1024 * 1024,
  });
  try {
    return JSON.parse(out.trim());
  } catch {
    return JSON.parse(out.slice(out.indexOf('[{')));
  }
}

function d1Rows(sql) {
  return d1(sql)[0].results;
}

async function main() {
  section('0. 健康检查与未授权访问');
  const health = await api('/api/health');
  check('GET /api/health 返回 200', health.status === 200 && health.json?.status === 'ok', `status=${health.status}`);
  const noToken = await api('/api/me');
  check('无 Authorization 访问 /api/me 返回 401', noToken.status === 401, `status=${noToken.status}`);
  const badToken = await api('/api/me', { token: 'not.a.jwt' });
  check('伪造 token 访问 /api/me 返回 401', badToken.status === 401, `status=${badToken.status}`);
  const noAuthRooms = await api('/api/rooms');
  check('无 token 访问 /api/rooms 返回 401', noAuthRooms.status === 401, `status=${noAuthRooms.status}`);

  section('1. 非法输入 400 / 413');
  const longNick = await api('/api/auth/guest', { method: 'POST', body: JSON.stringify({ nickname: '名'.repeat(25) }) });
  check('guest 昵称超长返回 400', longNick.status === 400, `status=${longNick.status} ${longNick.text.slice(0, 120)}`);
  const badAvatar = await api('/api/auth/guest', { method: 'POST', body: JSON.stringify({ avatar: 'http://insecure.example/a.png' }) });
  check('guest 非 HTTPS 头像返回 400', badAvatar.status === 400, `status=${badAvatar.status}`);
  const badJson = await api('/api/auth/guest', { method: 'POST', body: '{not json' });
  check('guest 非法 JSON 返回 400', badJson.status === 400, `status=${badJson.status}`);
  const huge = await api('/api/auth/guest', { method: 'POST', body: JSON.stringify({ nickname: 'x'.repeat(20000) }) });
  check('超过 16KB 请求返回 413', huge.status === 413, `status=${huge.status}`);

  section('2. guest 登录写入 D1');
  const guestA = (await api('/api/auth/guest', { method: 'POST', body: JSON.stringify({ nickname: '集成甲' }) })).json;
  const guestB = (await api('/api/auth/guest', { method: 'POST', body: JSON.stringify({ nickname: '集成乙' }) })).json;
  const throwaway = (await api('/api/auth/guest', { method: 'POST', body: JSON.stringify({ nickname: '临时用户' }) })).json;
  check('guest 登录返回 user + token', Boolean(guestA?.token && guestB?.token && guestA?.user?.id), JSON.stringify({ a: guestA?.user, b: guestB?.user }));
  const me = await api('/api/me', { token: guestA.token });
  check('/api/me 使用 token 返回本人', me.status === 200 && me.json?.user?.id === guestA.user.id, `status=${me.status}`);

  const userRows = d1Rows(`SELECT id,nickname FROM users WHERE id='${guestA.user.id}'`);
  check('guest 用户已写入本地 D1', userRows.length === 1 && userRows[0].nickname === '集成甲', JSON.stringify(userRows));
  d1(`DELETE FROM users WHERE id='${throwaway.user.id}'`);
  const orphanRows = d1Rows(`SELECT id FROM users WHERE id='${throwaway.user.id}'`);
  check('D1 中用户行已被删除', orphanRows.length === 0, JSON.stringify(orphanRows));
  const orphan = await api('/api/me', { token: throwaway.token });
  check('D1 中不存在的用户返回 401', orphan.status === 401, `status=${orphan.status}`);

  section('3. 私密房密码与房号加入');
  const privateCreate = await api('/api/rooms', {
    method: 'POST',
    token: guestA.token,
    body: JSON.stringify({ title: '私密验证房', maxPlayers: 6, drawDuration: 45, totalRounds: 2, wordDifficulty: 'hard', isPrivate: true, password: 'secret-pass-1' }),
  });
  const privateRoomId = privateCreate.json?.roomId;
  check('创建私密房返回 201 + roomId', privateCreate.status === 201 && Boolean(privateRoomId), `status=${privateCreate.status} ${privateCreate.text.slice(0, 200)}`);

  const privateRow = d1Rows(`SELECT settings_json,room_code FROM rooms WHERE id='${privateRoomId}'`)[0];
  const privateCode = privateRow?.room_code;
  check('私密房 D1 不落明文密码', Boolean(privateRow) && !privateRow.settings_json.includes('secret-pass-1'), JSON.stringify(privateRow));
  check('私密房房号为 6 位数字', /^[0-9]{6}$/.test(String(privateCode)), String(privateCode));

  const wrongPass = await api(`/api/rooms/${privateRoomId}/join`, { method: 'POST', token: guestB.token, body: JSON.stringify({ password: 'wrong-pass' }) });
  check('私密房错误密码返回 403', wrongPass.status === 403, `status=${wrongPass.status} ${wrongPass.text.slice(0, 160)}`);
  const noPass = await api(`/api/rooms/${privateCode}/join`, { method: 'POST', token: guestB.token, body: JSON.stringify({}) });
  check('私密房未带密码按房号返回 403', noPass.status === 403, `status=${noPass.status} ${noPass.text.slice(0, 160)}`);
  const rightPass = await api(`/api/rooms/${privateCode}/join`, { method: 'POST', token: guestB.token, body: JSON.stringify({ password: 'secret-pass-1' }) });
  check('按房号 + 正确密码加入私密房', rightPass.status === 200 && Boolean(rightPass.json?.ticket), `status=${rightPass.status} ${rightPass.text.slice(0, 200)}`);

  const missingRoom = await api('/api/rooms/999999/join', { method: 'POST', token: guestA.token, body: JSON.stringify({}) });
  check('不存在房号返回 404', missingRoom.status === 404, `status=${missingRoom.status}`);

  section('4. 房间创建设置一致');
  const created = await api('/api/rooms', {
    method: 'POST',
    token: guestA.token,
    body: JSON.stringify({ title: '集成验证房', gameId: 'draw-and-guess', maxPlayers: 4, drawDuration: 30, totalRounds: 1, wordDifficulty: 'easy', isPrivate: false }),
  });
  const roomId = created.json?.roomId;
  check('创建房间返回 201', created.status === 201 && Boolean(roomId), `status=${created.status} ${created.text.slice(0, 200)}`);

  const d1Room = d1Rows(`SELECT title,host_id,status,settings_json,player_count,room_code FROM rooms WHERE id='${roomId}'`)[0];
  const d1Settings = d1Room ? JSON.parse(d1Room.settings_json) : null;
  check('D1 房间行与提交设置一致', d1Settings?.title === '集成验证房' && d1Settings?.maxPlayers === 4 && d1Settings?.drawDuration === 30 && d1Settings?.totalRounds === 1 && d1Settings?.wordDifficulty === 'easy' && d1Settings?.isPrivate === false && d1Settings?.gameId === 'draw-and-guess' && d1Room.host_id === guestA.user.id, JSON.stringify(d1Room));

  const publicCode = d1Room?.room_code;
  const listed = await api('/api/rooms', { token: guestA.token });
  const listedRoom = (listed.json?.rooms || []).find(r => r.roomId === roomId);
  check('大厅房间列表包含新房间且字段正确', Boolean(listedRoom) && listedRoom.maxPlayers === 4 && listedRoom.isPrivate === false && listedRoom.title === '集成验证房', JSON.stringify(listedRoom));

  const badSettings = await api('/api/rooms', { method: 'POST', token: guestA.token, body: JSON.stringify({ title: '' }) });
  check('非法房间设置返回 400', badSettings.status === 400, `status=${badSettings.status}`);
  const privateNoPassword = await api('/api/rooms', { method: 'POST', token: guestA.token, body: JSON.stringify({ title: '缺密码私密房', isPrivate: true }) });
  check('私密房缺密码返回 400', privateNoPassword.status === 400, `status=${privateNoPassword.status}`);

  section('5. WebSocket 票据');
  const noTicket = await wsHandshake(`${BASE.replace(/^http/, 'ws')}/api/rooms/${roomId}/ws`);
  check('无 ticket 升级返回 401', noTicket.status === 401, JSON.stringify(noTicket));
  const plainGet = await api(`/api/rooms/${roomId}/ws`);
  check('非 Upgrade 访问 ws 路径返回 400', plainGet.status === 400, `status=${plainGet.status}`);

  const joinA = await api(`/api/rooms/${roomId}/join`, { method: 'POST', token: guestA.token, body: JSON.stringify({}) });
  check('房主获取票据', joinA.status === 200 && Boolean(joinA.json?.ticket), `status=${joinA.status} ${joinA.text.slice(0, 200)}`);
  const host = await connect(wsUrl(roomId, joinA.json.ticket), 'host');

  const joinB1 = await api(`/api/rooms/${publicCode}/join`, { method: 'POST', token: guestB.token, body: JSON.stringify({}) });
  check('按房号加入公开房返回票据', joinB1.status === 200 && Boolean(joinB1.json?.ticket), `status=${joinB1.status} ${joinB1.text.slice(0, 200)}`);
  let guesser = await connect(wsUrl(roomId, joinB1.json.ticket), 'guesser');

  const hostSnap = (await waitFor(host, 0, f => f.topic === 'connection:snapshot', 10000, 'host snapshot')).frame;
  const guesserSnap = (await waitFor(guesser, 0, f => f.topic === 'connection:snapshot', 10000, 'guesser snapshot')).frame;
  const snapSettings = guesserSnap.payload.room.settings;
  check('快照设置与创建时一致', snapSettings.title === '集成验证房' && snapSettings.maxPlayers === 4 && snapSettings.drawDuration === 30 && snapSettings.totalRounds === 1 && snapSettings.wordDifficulty === 'easy' && snapSettings.isPrivate === false, JSON.stringify(snapSettings));
  check('快照包含 2 名玩家且房主正确', guesserSnap.payload.room.players.length === 2 && guesserSnap.payload.room.hostId === guestA.user.id, JSON.stringify(guesserSnap.payload.room.players.map(p => [p.nickname, p.isOnline, p.isReady])));
  check('快照含 room/game/messages 结构', 'game' in guesserSnap.payload && 'messages' in guesserSnap.payload && 'room' in guesserSnap.payload, JSON.stringify(Object.keys(guesserSnap.payload)));
  check('房主快照显示在线', hostSnap.payload.room.players.every(p => p.isOnline), JSON.stringify(hostSnap.payload.room.players.map(p => [p.nickname, p.isOnline])));

  const otherTicketRes = await api(`/api/rooms/${privateRoomId}/join`, { method: 'POST', token: guestB.token, body: JSON.stringify({}) });
  const crossRoom = await wsHandshake(wsUrl(roomId, otherTicketRes.json?.ticket || ''));
  check('跨房间 ticket 升级返回 401', crossRoom.status === 401, JSON.stringify(crossRoom));

  const reused = await wsHandshake(wsUrl(roomId, joinB1.json.ticket));
  check('已使用票据再次升级返回 401（一次性）', reused.status === 401, JSON.stringify(reused));

  const seqs = guesser.frames.map(f => f.seq);
  check('猜手连接 seq 从 1 起连续递增', seqs.length > 0 && seqs[0] === 1 && seqs.every((s, i) => i === 0 || s === seqs[i - 1] + 1), JSON.stringify(seqs));

  section('6. 断线重连快照与 seq 持续可用');
  const offlineWait = waitFor(host, host.frames.length, f => f.topic === 'room:state_sync' && f.payload.players.some(p => p.id === guestB.user.id && !p.isOnline), 10000, 'guesser offline sync');
  guesser.close();
  await offlineWait;
  note('房主已收到猜手离线的 room:state_sync');

  const rejoin = await api(`/api/rooms/${roomId}/join`, { method: 'POST', token: guestB.token, body: JSON.stringify({}) });
  check('重连重新获取票据', rejoin.status === 200 && Boolean(rejoin.json?.ticket), `status=${rejoin.status}`);
  guesser = await connect(wsUrl(roomId, rejoin.json.ticket), 'guesser-reconnect');
  const snap2 = await waitFor(guesser, 0, f => f.topic === 'connection:snapshot', 10000, 'reconnect snapshot');
  check('重连快照恢复房间与在线状态', snap2.frame.payload.room.players.length === 2 && snap2.frame.payload.room.players.find(p => p.id === guestB.user.id)?.isOnline === true, JSON.stringify(snap2.frame.payload.room.players.map(p => [p.nickname, p.isOnline])));
  const reused2 = await wsHandshake(wsUrl(roomId, rejoin.json.ticket));
  check('重连后票据同样不可复用', reused2.status === 401, JSON.stringify(reused2));

  guesser.send('room:heartbeat', {});
  const afterReconnect = await waitFor(guesser, snap2.index + 1, f => f.topic === 'room:state_sync', 10000, 'post-reconnect broadcast');
  const seqs2 = guesser.frames.map(f => f.seq);
  check('重连后 seq 重新从 1 起连续', seqs2[0] === 1 && seqs2.every((s, i) => i === 0 || s === seqs2[i - 1] + 1), JSON.stringify(seqs2));
  check('重连后 socket 持续收到服务端广播', Boolean(afterReconnect.frame), JSON.stringify(afterReconnect.frame.topic));
  await sleep(400);
  check('心跳未触发 error', !latest(guesser, f => f.topic === 'error'), JSON.stringify(latest(guesser, f => f.topic === 'error')?.payload));

  section('7. 准备并开始游戏');
  const readyMark = host.frames.length;
  guesser.send('room:ready_toggle', {});
  await waitFor(host, readyMark, f => f.topic === 'room:state_sync' && f.payload.players.every(p => p.isReady), 10000, 'all ready');
  note('两名玩家均已准备');

  const startMark = host.frames.length;
  const guesserStartMark = guesser.frames.length;
  host.send('room:start_game', {});
  const hostGame1 = await waitFor(host, startMark, f => f.topic === 'game:state_sync' && f.payload, 10000, 'host first game view');
  const guesserGame1 = await waitFor(guesser, guesserStartMark, f => f.topic === 'game:state_sync' && f.payload, 10000, 'guesser first game view');
  check('游戏开始进入 selecting_word', hostGame1.frame.payload.status === 'selecting_word', JSON.stringify(hostGame1.frame.payload.status));
  check('画手为房主', hostGame1.frame.payload.drawerId === guestA.user.id, hostGame1.frame.payload.drawerId);
  check('画手看到 3 个 wordChoices', Array.isArray(hostGame1.frame.payload.wordChoices) && hostGame1.frame.payload.wordChoices.length === 3, JSON.stringify(hostGame1.frame.payload.wordChoices));
  check('猜手看不到 wordChoices/currentWord/secretWord', !('wordChoices' in guesserGame1.frame.payload) && !('currentWord' in guesserGame1.frame.payload) && !('secretWord' in guesserGame1.frame.payload), JSON.stringify(Object.keys(guesserGame1.frame.payload)));

  section('8. 画手选词 / 非法绘画 / 越权');
  const hostGameMark = host.frames.length;
  const guesserGameMark = guesser.frames.length;
  host.send('game:choose_word', { word: hostGame1.frame.payload.wordChoices[0] });
  const hostDrawing = await waitFor(host, hostGameMark, f => f.topic === 'game:state_sync' && f.payload?.status === 'drawing', 10000, 'host drawing');
  const secret1 = hostDrawing.frame.payload.currentWord;
  check('画手选词后进入 drawing 且拿到 currentWord', typeof secret1 === 'string' && secret1.length > 0, JSON.stringify(secret1));

  const guesserDrawing = await waitFor(guesser, guesserGameMark, f => f.topic === 'game:state_sync' && f.payload?.status === 'drawing', 10000, 'guesser drawing');
  const guesserRaw = JSON.stringify(guesserDrawing.frame.payload);
  check('猜手 drawing 视图不含答案字段', !('currentWord' in guesserDrawing.frame.payload) && !('secretWord' in guesserDrawing.frame.payload) && !('wordChoices' in guesserDrawing.frame.payload), JSON.stringify(Object.keys(guesserDrawing.frame.payload)));
  check('猜手 drawing 视图 JSON 不含答案词', !guesserRaw.includes(secret1), guesserRaw.slice(0, 300));

  const errMark1 = guesser.frames.length;
  guesser.send('draw:stroke', { id: 'g1', points: [[10, 10, 0.5]], color: '#5B5BF0', size: 6, isEraser: false, timestamp: Date.now() });
  const notDrawerErr = await waitFor(guesser, errMark1, f => f.topic === 'error', 8000, 'guesser draw rejected');
  check('猜手作画被拒绝', notDrawerErr.frame.payload.message === '仅当前画手可以作画', JSON.stringify(notDrawerErr.frame.payload));

  const errMark2 = host.frames.length;
  host.send('draw:stroke', { id: 'bad', points: [[10, 10]], color: 'red', size: 6, isEraser: false, timestamp: Date.now() });
  const badColorErr = await waitFor(host, errMark2, f => f.topic === 'error', 8000, 'bad stroke rejected');
  check('非法颜色绘画被拒绝', badColorErr.frame.payload.message === '消息格式不正确', JSON.stringify(badColorErr.frame.payload));

  const errMark3 = host.frames.length;
  host.send('draw:stroke', { id: 'nan', points: [[Number.NaN, 1]], color: '#5B5BF0', size: 6, isEraser: false, timestamp: Date.now() });
  const nanErr = await waitFor(host, errMark3, f => f.topic === 'error', 8000, 'NaN stroke rejected');
  check('NaN 坐标绘画被拒绝', nanErr.frame.payload.message === '消息格式不正确', JSON.stringify(nanErr.frame.payload));

  const errMark4 = guesser.frames.length;
  guesser.send('admin:shutdown', {});
  const forgedErr = await waitFor(guesser, errMark4, f => f.topic === 'error', 8000, 'forged topic rejected');
  check('伪造 topic 被拒绝', forgedErr.frame.payload.message === '消息格式不正确', JSON.stringify(forgedErr.frame.payload));

  const errMark5 = guesser.frames.length;
  guesser.rawSend(`{"topic":"chat:send","payload":{"content":"x"}}${' '.repeat(140000)}`);
  const oversizeErr = await waitFor(guesser, errMark5, f => f.topic === 'error', 8000, 'oversize rejected');
  check('超大 WS 帧被拒绝', oversizeErr.frame.payload.message === '消息过大', JSON.stringify(oversizeErr.frame.payload));

  const strokeMarkA = host.frames.length;
  const strokeMarkB = guesser.frames.length;
  host.send('draw:stroke', { id: 'ok1', points: [[100, 100, 1], [200, 200, 1]], color: '#5B5BF0', size: 6, isEraser: false, timestamp: Date.now() });
  const hostStroke = await waitFor(host, strokeMarkA, f => f.topic === 'draw:stroke', 8000, 'host stroke broadcast');
  const guesserStroke = await waitFor(guesser, strokeMarkB, f => f.topic === 'draw:stroke', 8000, 'guesser receives stroke');
  check('画手有效笔迹广播到双方', hostStroke.frame.payload.id === 'ok1' && guesserStroke.frame.payload.id === 'ok1', JSON.stringify({ host: hostStroke.frame.payload, guesser: guesserStroke.frame.payload }));

  section('9. 猜中广播不含答案 / 重复猜中不加分');
  const guessMark = guesser.frames.length;
  const hostChatMark = host.frames.length;
  guesser.send('game:submit_guess', { guess: secret1 });
  const guessResult = await waitFor(guesser, guessMark, f => f.topic === 'game:guess_result', 8000, 'guess result');
  check('正确猜中返回 correct=true 且有得分', guessResult.frame.payload.correct === true && guessResult.frame.payload.earned > 0, JSON.stringify(guessResult.frame.payload));

  const correctChatGuesser = await waitFor(guesser, guessMark, f => f.topic === 'chat:message' && f.payload?.payload?.type === 'correct_guess', 8000, 'correct guess chat guesser');
  const correctChatHost = await waitFor(host, hostChatMark, f => f.topic === 'chat:message' && f.payload?.payload?.type === 'correct_guess', 8000, 'correct guess chat host');
  check('猜中广播不含答案词（双方）', !JSON.stringify(correctChatGuesser.frame.payload).includes(secret1) && !JSON.stringify(correctChatHost.frame.payload).includes(secret1), JSON.stringify(correctChatGuesser.frame.payload));

  const turnEnded = await waitFor(guesser, correctChatGuesser.index, f => f.topic === 'game:state_sync' && f.payload?.status === 'turn_ended', 8000, 'turn ended sync');
  const guesserScore = turnEnded.frame.payload.scores.find(s => s.playerId === guestB.user.id).score;
  check('猜手回合得分已更新', guesserScore > 0, JSON.stringify(turnEnded.frame.payload.scores));

  const repeatMark = guesser.frames.length;
  guesser.send('game:submit_guess', { guess: secret1 });
  const repeatSync = await waitFor(guesser, repeatMark, f => f.topic === 'game:state_sync' && f.payload, 8000, 'repeat guess sync');
  const repeatScore = repeatSync.frame.payload.scores.find(s => s.playerId === guestB.user.id).score;
  check('重复猜中不加分', repeatScore === guesserScore, `before=${guesserScore} after=${repeatScore} status=${repeatSync.frame.payload.status}`);
  if (repeatSync.frame.payload.status === 'turn_ended') {
    const repeatCorrect = repeatSync.frame.payload.scores.find(s => s.playerId === guestB.user.id).hasGuessedCorrectly === true;
    check('重复猜中不重复累加 correctGuesses', repeatCorrect === true, JSON.stringify(repeatSync.frame.payload.scores));
  }

  const drawings = d1Rows(`SELECT id,word,user_id FROM drawings WHERE user_id='${guestA.user.id}'`);
  check('回合结束画作已写入 D1 drawings', drawings.length === 1 && drawings[0].word === secret1, JSON.stringify(drawings));
  const drawingDetail = await api(`/api/drawings/${drawings[0]?.id}`, { token: guestA.token });
  check('画作从 R2 读回且含笔迹', drawingDetail.status === 200 && Array.isArray(drawingDetail.json?.strokes) && drawingDetail.json.strokes.length === 1, `status=${drawingDetail.status} ${drawingDetail.text.slice(0, 240)}`);
  const drawingOtherUser = await api(`/api/drawings/${drawings[0]?.id}`, { token: guestB.token });
  check('他人无法读取画作', drawingOtherUser.status === 404, `status=${drawingOtherUser.status}`);

  section('10. 回合中重连（游戏快照）');
  const offlineMid = waitFor(host, host.frames.length, f => f.topic === 'room:state_sync' && f.payload.players.some(p => p.id === guestB.user.id && !p.isOnline), 12000, 'mid-game offline');
  guesser.close();
  await offlineMid;
  const midRejoin = await api(`/api/rooms/${roomId}/join`, { method: 'POST', token: guestB.token, body: JSON.stringify({}) });
  guesser = await connect(wsUrl(roomId, midRejoin.json.ticket), 'guesser-midgame');
  const midSnap = await waitFor(guesser, 0, f => f.topic === 'connection:snapshot', 12000, 'mid-game snapshot');
  const midGame = midSnap.frame.payload.game;
  check('游戏中重连快照含进行中的 game', Boolean(midGame) && ['turn_ended', 'selecting_word', 'drawing'].includes(midGame.status), JSON.stringify(midGame && { status: midGame.status }));
  check('游戏中重连快照含房间与消息', midSnap.frame.payload.room.players.length === 2 && Array.isArray(midSnap.frame.payload.messages), JSON.stringify(Object.keys(midSnap.frame.payload)));
  const midSeqs = guesser.frames.map(f => f.seq);
  check('游戏中重连 seq 从 1 起连续', midSeqs[0] === 1 && midSeqs.every((s, i) => i === 0 || s === midSeqs[i - 1] + 1), JSON.stringify(midSeqs));

  section('11. 第二回合与完整结算');
  const turn2Start = await waitFor(guesser, 0, f => f.topic === 'game:state_sync' && f.payload && ['selecting_word', 'drawing'].includes(f.payload.status) && f.payload.drawerId === guestB.user.id, 30000, 'turn2 start');
  check('轮换后由第二名玩家担任画手', turn2Start.frame.payload.drawerId === guestB.user.id, JSON.stringify({ drawerId: turn2Start.frame.payload.drawerId, status: turn2Start.frame.payload.status, round: turn2Start.frame.payload.currentRound }));

  if (turn2Start.frame.payload.status === 'selecting_word') {
    guesser.send('game:choose_word', { word: turn2Start.frame.payload.wordChoices[0] });
  }
  const guesserDrawing2 = await waitFor(guesser, turn2Start.index, f => f.topic === 'game:state_sync' && f.payload?.status === 'drawing', 15000, 'second drawing');
  const secret2 = guesserDrawing2.frame.payload.currentWord;
  check('第二回合画手视图含 currentWord', typeof secret2 === 'string' && secret2.length > 0, JSON.stringify(secret2));

  const hostView2 = await waitFor(host, 0, f => f.topic === 'game:state_sync' && f.payload?.status === 'drawing' && f.payload.drawerId === guestB.user.id, 15000, 'host sees drawing2');
  check('第二回合猜手（房主）视图无答案', !('currentWord' in hostView2.frame.payload) && !JSON.stringify(hostView2.frame.payload).includes(secret2), JSON.stringify(Object.keys(hostView2.frame.payload)));

  const hostGuessMark = host.frames.length;
  host.send('game:submit_guess', { guess: secret2 });
  const hostGuessResult = await waitFor(host, hostGuessMark, f => f.topic === 'game:guess_result', 10000, 'host guess result');
  check('第二回合正确猜中', hostGuessResult.frame.payload.correct === true, JSON.stringify(hostGuessResult.frame.payload));

  const settleStart = host.frames.length;
  const settlement = await waitFor(host, settleStart, f => f.topic === 'room:state_sync' && f.payload.status === 'settlement', 40000, 'settlement');
  check('对局完成进入 settlement', settlement.frame.payload.status === 'settlement', JSON.stringify(settlement.frame.payload.status));

  const matchRows = d1Rows(`SELECT id,winner_id,total_rounds FROM match_records WHERE room_id='${roomId}'`);
  check('D1 写入 1 条 match_records', matchRows.length === 1 && matchRows[0].total_rounds === 1, JSON.stringify(matchRows));
  const participantRows = d1Rows(`SELECT user_id,score,won,guesses,correct_guesses FROM match_participants WHERE match_id='${matchRows[0]?.id}'`);
  check('D1 写入 2 条 match_participants', participantRows.length === 2, JSON.stringify(participantRows));
  const countedRows = d1Rows(`SELECT id,total_games,wins FROM users WHERE id IN ('${guestA.user.id}','${guestB.user.id}')`);
  check('D1 users.total_games 各计 1 次（无重复计数）', countedRows.length === 2 && countedRows.every(r => r.total_games === 1), JSON.stringify(countedRows));
  check('D1 users.wins 只写 0/1 且至少一个胜者', countedRows.every(r => r.wins === 0 || r.wins === 1) && countedRows.some(r => r.wins === 1), JSON.stringify(countedRows));

  d1(`INSERT OR IGNORE INTO match_participants (match_id,user_id,score,won,guesses,correct_guesses) VALUES ('${matchRows[0]?.id}','${guestA.user.id}',0,0,0,0)`);
  const recounted = d1Rows(`SELECT total_games FROM users WHERE id='${guestA.user.id}'`);
  check('重复写入同一 match_participant 不再累加（幂等）', recounted[0]?.total_games === 1, JSON.stringify(recounted));

  const matchesA = await api('/api/me/matches', { token: guestA.token });
  check('战绩接口返回该局', matchesA.status === 200 && matchesA.json?.matches?.length === 1 && matchesA.json.matches[0].id === matchRows[0].id, `status=${matchesA.status} ${matchesA.text.slice(0, 300)}`);
  const matchesB = await api('/api/me/matches', { token: guestB.token });
  check('双方都能查询到该局', matchesB.status === 200 && matchesB.json?.matches?.length === 1, `status=${matchesB.status}`);

  section('12. restart 回到等待');
  const nonHostMark = guesser.frames.length;
  guesser.send('room:start_game', {});
  const nonHostStart = await waitFor(guesser, nonHostMark, f => f.topic === 'error', 8000, 'non-host start rejected');
  check('非房主不能开始游戏', nonHostStart.frame.payload.message.includes('房主'), JSON.stringify(nonHostStart.frame.payload));

  const restartMark = host.frames.length;
  const guesserRestartMark = guesser.frames.length;
  host.send('room:restart', {});
  const restarted = await waitFor(host, restartMark, f => f.topic === 'room:state_sync' && f.payload.status === 'waiting', 10000, 'restart waiting');
  check('restart 后房间回到 waiting', restarted.frame.payload.status === 'waiting', JSON.stringify(restarted.frame.payload.status));
  check('restart 后 round 归 1 且分数清零', restarted.frame.payload.currentRound === 1 && restarted.frame.payload.players.every(p => p.score === 0), JSON.stringify({ round: restarted.frame.payload.currentRound, scores: restarted.frame.payload.players.map(p => p.score) }));
  const gameCleared = await waitFor(guesser, guesserRestartMark, f => f.topic === 'game:state_sync' && f.payload === null, 10000, 'game cleared');
  check('restart 后 game 置空并广播', gameCleared.frame.payload === null, JSON.stringify(gameCleared.frame.payload));

  const d1AfterRestart = d1Rows(`SELECT status FROM rooms WHERE id='${roomId}'`);
  check('restart 后 D1 房间状态为 waiting', d1AfterRestart[0]?.status === 'waiting', JSON.stringify(d1AfterRestart));

  host.close();
  guesser.close();
}

process.on('unhandledRejection', err => {
  console.error('UNHANDLED REJECTION:', err);
});

main()
  .then(() => {
    const failed = results.filter(r => !r.pass);
    console.log('\n================ 汇总 ================');
    console.log(`total=${results.length} pass=${results.length - failed.length} fail=${failed.length}`);
    for (const f of failed) console.log(`FAIL [${f.section}] ${f.name} :: ${f.detail}`);
    process.exit(failed.length ? 1 : 0);
  })
  .catch(err => {
    const failed = results.filter(r => !r.pass);
    console.log('\n================ 中断 ================');
    console.error('ERROR:', err && err.stack ? err.stack : err);
    console.log(`completed=${results.length} pass=${results.length - failed.length} fail=${failed.length}`);
    for (const f of failed) console.log(`FAIL [${f.section}] ${f.name} :: ${f.detail}`);
    process.exit(2);
  });
