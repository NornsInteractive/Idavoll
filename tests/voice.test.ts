import { expect, it, vi } from 'vitest';

vi.mock('../apps/web/src/services/room-session', () => ({ sendRoomAction: vi.fn(() => true) }));
vi.mock('../apps/web/src/services/api', () => ({
  api: vi.fn(async () => ({ iceServers: [{ urls: 'stun:example.test' }], expiresAt: Date.now() + 3600000 })),
}));

type Track = { enabled: boolean; readyState: string; onended: null | (() => void); stop: ReturnType<typeof vi.fn> };

const makeTrack = (): Track => ({ enabled: false, readyState: 'live', onended: null, stop: vi.fn() });
const makeMedia = (track: Track) => ({ getAudioTracks: () => [track], getTracks: () => [track] });

function stubGlobals() {
  const storage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
  const win = Object.assign(new EventTarget(), { localStorage: storage });
  const doc = Object.assign(new EventTarget(), { hidden: false });
  vi.stubGlobal('window', win);
  vi.stubGlobal('localStorage', storage);
  vi.stubGlobal('document', doc);
  vi.stubGlobal('AudioContext', class {
    state = 'running';
    createMediaStreamSource() { return { connect() {}, disconnect() {} }; }
    createAnalyser() {
      return { fftSize: 256, getByteTimeDomainData(buffer: Uint8Array) { buffer.fill(128); } };
    }
    async close() {}
  });
  vi.stubGlobal('Audio', class {
    autoplay = true;
    muted = false;
    paused = true;
    srcObject: unknown = null;
    async play() { this.paused = false; }
    pause() { this.paused = true; }
  });
  vi.stubGlobal('RTCPeerConnection', class {
    connectionState = 'new';
    signalingState = 'stable';
    localDescription: { type: string; sdp: string } | null = null;
    onnegotiationneeded: (() => void) | null = null;
    onicecandidate: (() => void) | null = null;
    ontrack: (() => void) | null = null;
    onconnectionstatechange: (() => void) | null = null;
    addTransceiver() { return { sender: { replaceTrack: async () => {} } }; }
    async setLocalDescription() { this.localDescription = { type: 'offer', sdp: 'fixture-offer' }; }
    setConfiguration() {}
    restartIce() {}
    close() { this.connectionState = 'closed'; }
  });
  return { win, doc };
}

async function flush(rounds = 30) {
  for (let i = 0; i < rounds; i += 1) await Promise.resolve();
  await new Promise((resolve) => { setTimeout(resolve, 5); });
}

async function boot() {
  vi.resetModules();
  const stubs = stubGlobals();
  const voice = await import('../apps/web/src/services/voice');
  const { useRoomStore } = await import('../apps/web/src/store/useRoomStore');
  const { useUserStore } = await import('../apps/web/src/store/useUserStore');
  const { RoomSettingsSchema } = await import('../packages/protocol/src');
  const { sendRoomAction } = await import('../apps/web/src/services/room-session');
  const player = (id: string) => ({
    id, nickname: id, avatar: '', isHost: id === 'me', isReady: true, isOnline: true, score: 0, micMuted: true,
  });
  useUserStore.setState({ id: 'me' });
  useRoomStore.setState({
    room: {
      roomId: 'room-test', roomCode: '123456', hostId: 'me', settings: RoomSettingsSchema.parse({ title: 'Test room' }),
      status: 'waiting', currentRound: 1, createdAt: Date.now(), players: [player('me'), player('peer')],
    },
  });
  return { ...voice, useRoomStore, useUserStore, sendRoomAction, stubs };
}

it('麦克风请求未返回时退出房间：晚到的 track 被停止且语音状态保持 off', async () => {
  const ctx = await boot();
  const track = makeTrack();
  const media = makeMedia(track);
  let resolveGum!: (m: unknown) => void;
  let rejectGum!: (e: unknown) => void;
  const pending = new Promise((resolve, reject) => { resolveGum = resolve; rejectGum = reject; });
  const gum = vi.fn(() => pending);
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: gum } });
  try {
    const opening = ctx.toggleMute();
    await flush();
    expect(gum).toHaveBeenCalledTimes(1);
    expect(ctx.useRoomStore.getState().voiceStatus).toBe('connecting');

    ctx.stopVoice();
    expect(ctx.useRoomStore.getState().voiceStatus).toBe('off');
    expect(ctx.useRoomStore.getState().isMuted).toBe(true);

    resolveGum(media);
    await opening.catch(() => {});
    await flush();

    expect(track.stop).toHaveBeenCalledTimes(1);
    expect(ctx.useRoomStore.getState().voiceStatus).toBe('off');
    expect(ctx.useRoomStore.getState().isMuted).toBe(true);
    expect(ctx.useRoomStore.getState().voiceError).toBeNull();
    expect(ctx.sendRoomAction).not.toHaveBeenCalledWith('voice:signal', expect.anything());
  } finally {
    resolveGum?.(media);
    rejectGum?.(new Error('cleanup'));
    ctx.stopVoice();
    vi.unstubAllGlobals();
  }
});

it('麦克风权限被拒绝：显示错误、保持静音，按住说话不会变成未静音', async () => {
  const ctx = await boot();
  const track = makeTrack();
  const gum = vi.fn(async () => { throw new DOMException('Permission denied', 'NotAllowedError'); });
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: gum } });
  try {
    await ctx.toggleMute();
    expect(ctx.useRoomStore.getState().voiceStatus).toBe('error');
    expect(ctx.useRoomStore.getState().voiceError).toContain('麦克风权限被拒绝');
    expect(ctx.useRoomStore.getState().isMuted).toBe(true);
    expect(ctx.sendRoomAction).toHaveBeenCalledWith('voice:state', { muted: true });

    ctx.setVoiceMode('hold');
    expect(ctx.useRoomStore.getState().isMuted).toBe(true);

    ctx.setPushToTalk(true);
    await flush();
    expect(ctx.useRoomStore.getState().isMuted).toBe(true);
    expect(ctx.useRoomStore.getState().voiceStatus).toBe('error');
    expect(track.stop).not.toHaveBeenCalled();
    expect(track.enabled).toBe(false);

    ctx.setPushToTalk(false);
    await flush();
    expect(ctx.useRoomStore.getState().isMuted).toBe(true);
  } finally {
    ctx.stopVoice();
    vi.unstubAllGlobals();
  }
});

it('按住说话：按下开麦、松开/失焦/隐藏标签页静音；自由麦模式失焦不释放', async () => {
  const ctx = await boot();
  const track = makeTrack();
  const media = makeMedia(track);
  const gum = vi.fn(async () => media);
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: gum } });
  try {
    await ctx.toggleMute();
    await flush();
    expect(track.enabled).toBe(true);
    expect(ctx.useRoomStore.getState().isMuted).toBe(false);

    // open mode: blur must not force-release the mic
    ctx.stubs.win.dispatchEvent(new Event('blur'));
    await flush();
    expect(track.enabled).toBe(true);
    expect(ctx.useRoomStore.getState().isMuted).toBe(false);

    ctx.setVoiceMode('hold');
    expect(track.enabled).toBe(false);

    ctx.setPushToTalk(true);
    expect(track.enabled).toBe(true);
    expect(ctx.useRoomStore.getState().isMuted).toBe(false);

    ctx.setPushToTalk(false);
    expect(track.enabled).toBe(false);
    expect(ctx.useRoomStore.getState().isMuted).toBe(true);

    ctx.setPushToTalk(true);
    expect(track.enabled).toBe(true);
    ctx.stubs.win.dispatchEvent(new Event('blur'));
    await flush();
    expect(track.enabled).toBe(false);
    expect(ctx.useRoomStore.getState().isMuted).toBe(true);

    ctx.setPushToTalk(true);
    expect(track.enabled).toBe(true);
    ctx.stubs.doc.hidden = true;
    ctx.stubs.doc.dispatchEvent(new Event('visibilitychange'));
    await flush();
    expect(track.enabled).toBe(false);
    expect(ctx.useRoomStore.getState().isMuted).toBe(true);
    expect(track.stop).not.toHaveBeenCalled();
  } finally {
    ctx.stopVoice();
    vi.unstubAllGlobals();
  }
});

it('stopVoice 关闭本地音轨与全部 peer 并复位语音状态', async () => {
  const ctx = await boot();
  const track = makeTrack();
  const media = makeMedia(track);
  const gum = vi.fn(async () => media);
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: gum } });
  try {
    await ctx.toggleMute();
    await flush();
    expect(track.stop).not.toHaveBeenCalled();
    expect(['connecting', 'connected']).toContain(ctx.useRoomStore.getState().voiceStatus);

    ctx.stopVoice();
    expect(track.stop).toHaveBeenCalled();
    expect(ctx.useRoomStore.getState().voiceStatus).toBe('off');
    expect(ctx.useRoomStore.getState().isMuted).toBe(true);
    expect(ctx.useRoomStore.getState().isDeafened).toBe(false);
    expect(ctx.useRoomStore.getState().speakingUserIds).toEqual([]);
  } finally {
    ctx.stopVoice();
    vi.unstubAllGlobals();
  }
});
