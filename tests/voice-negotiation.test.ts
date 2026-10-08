import { expect, it, vi } from 'vitest';

vi.mock('../apps/web/src/services/room-session', () => ({ sendRoomAction: vi.fn(() => true) }));
vi.mock('../apps/web/src/services/api', () => ({
  api: vi.fn(async () => ({ iceServers: [{ urls: 'stun:example.test' }], expiresAt: Date.now() + 3600000 })),
}));

it('首次协商不丢失，退出后不再发送旧offer', async () => {
  vi.useFakeTimers();
  const storage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
  vi.stubGlobal('window', Object.assign(new EventTarget(), { localStorage: storage }));
  vi.stubGlobal('localStorage', storage);
  vi.stubGlobal('document', new EventTarget());
  const track = { enabled: false, readyState: 'live', onended: null, stop: vi.fn() };
  const media = { getAudioTracks: () => [track], getTracks: () => [track] };
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: async () => media } });
  vi.stubGlobal('AudioContext', class {
    state = 'running';
    createMediaStreamSource() { return { connect() {}, disconnect() {} }; }
    createAnalyser() { return { fftSize: 256, getByteTimeDomainData(buffer: Uint8Array) { buffer.fill(128); } }; }
    async close() {}
  });
  vi.stubGlobal('Audio', class { async play() {} pause() {} });
  let stopDuringOffer: (() => void) | undefined;
  vi.stubGlobal('RTCPeerConnection', class {
    connectionState = 'new';
    signalingState = 'stable';
    localDescription: { type: string; sdp: string } | null = null;
    onnegotiationneeded: (() => Promise<void>) | null = null;
    addTransceiver() {
      let first = true;
      return { sender: { replaceTrack: async () => {
        if (!first) return;
        first = false;
        await Promise.resolve();
        // Chromium can dispatch negotiation before replaceTrack resolves.
        await this.onnegotiationneeded?.();
      } } };
    }
    async setLocalDescription() { this.localDescription = { type: 'offer', sdp: 'fixture-offer' }; stopDuringOffer?.(); }
    close() { this.connectionState = 'closed'; }
  });
  const { useRoomStore } = await import('../apps/web/src/store/useRoomStore');
  const { useUserStore } = await import('../apps/web/src/store/useUserStore');
  const { RoomSettingsSchema } = await import('../packages/protocol/src');
  const { sendRoomAction } = await import('../apps/web/src/services/room-session');
  const { toggleMute, stopVoice } = await import('../apps/web/src/services/voice');
  const player = (id: string) => ({ id, nickname: id, avatar: '', isHost: id === 'me', isReady: true, isOnline: true, score: 0, micMuted: true });
  useUserStore.setState({ id: 'me' });
  useRoomStore.setState({ room: {
    roomId: 'room-test', roomCode: '123456', hostId: 'me', settings: RoomSettingsSchema.parse({ title: 'Test room' }),
    status: 'waiting', currentRound: 1, createdAt: Date.now(), players: [player('me'), player('peer')],
  } });
  try {
    await toggleMute();
    expect(sendRoomAction).toHaveBeenCalledWith('voice:signal', {
      targetId: 'peer', signal: { type: 'offer', sdp: 'fixture-offer' },
    });
    stopVoice();
    vi.mocked(sendRoomAction).mockClear();
    stopDuringOffer = stopVoice;
    await toggleMute();
    expect(sendRoomAction).not.toHaveBeenCalledWith('voice:signal', expect.anything());
    expect(useRoomStore.getState().voiceStatus).toBe('off');
  } finally {
    stopVoice(); vi.useRealTimers(); vi.unstubAllGlobals();
  }
});
