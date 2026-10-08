import { api } from './api';
import { sendRoomAction } from './room-session';
import { useRoomStore } from '../store/useRoomStore';
import { useUserStore } from '../store/useUserStore';

interface Peer {
  pc: RTCPeerConnection;
  audio: HTMLAudioElement;
  sender: RTCRtpSender;
  makingOffer: boolean;
  ignoreOffer: boolean;
  candidates: RTCIceCandidateInit[];
}
const peers = new Map<string, Peer>();
const pendingPeers = new Map<string, Promise<Peer>>();
const signalQueues = new Map<string, Promise<void>>();
const meters = new Map<string, { source: MediaStreamAudioSourceNode; analyser: AnalyserNode; buffer: Uint8Array<ArrayBuffer> }>();
let stream: MediaStream | null = null;
let audioContext: AudioContext | null = null;
let iceServers: RTCIceServer[] = [];
let credentials: Promise<void> | null = null;
let meterTimer: ReturnType<typeof setInterval> | null = null;
let refreshTimer: ReturnType<typeof setTimeout> | null = null;
let generation = 0;
let micRequest: Promise<MediaStream> | null = null;

function fail(error: unknown, expectedGeneration = generation) {
  if (expectedGeneration !== generation) return;
  const message = error instanceof DOMException && error.name === 'NotAllowedError' ? '麦克风权限被拒绝，请在浏览器设置中允许后重试' : error instanceof Error ? error.message : '语音连接失败，请重试';
  useRoomStore.setState({ voiceStatus: 'error', voiceError: message, isMuted: true });
  if (stream) stream.getAudioTracks().forEach(t => { t.enabled = false; });
  sendRoomAction('voice:state', { muted: true });
}
async function loadCredentials() {
  if (credentials) return credentials;
  const roomId = useRoomStore.getState().room?.roomId;
  if (!roomId) throw new Error('请先加入房间');
  const currentGeneration = generation;
  credentials = api<{ iceServers: RTCIceServer[]; expiresAt: number }>(`/rooms/${roomId}/voice`, 'POST', {}).then(result => {
    if (currentGeneration !== generation) return;
    iceServers = result.iceServers;
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => {
      credentials = null;
      void loadCredentials().then(() => {
        if (currentGeneration === generation) peers.forEach(p => { p.pc.setConfiguration({ iceServers }); p.pc.restartIce(); });
      }).catch(error => fail(error, currentGeneration));
    }, Math.max(30000, result.expiresAt - Date.now() - 300000));
  }).catch(error => { if (currentGeneration === generation) credentials = null; throw error; });
  return credentials;
}
function meter(id: string, media: MediaStream) {
  if (!audioContext) audioContext = new AudioContext();
  meters.get(id)?.source.disconnect();
  const source = audioContext.createMediaStreamSource(media);
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 256;
  source.connect(analyser);
  meters.set(id, { source, analyser, buffer: new Uint8Array(new ArrayBuffer(analyser.fftSize)) });
  if (!meterTimer) meterTimer = setInterval(() => {
    const speaking: string[] = [];
    for (const [playerId, m] of meters) {
      m.analyser.getByteTimeDomainData(m.buffer);
      const energy = m.buffer.reduce((sum, value) => sum + ((value - 128) / 128) ** 2, 0) / m.buffer.length;
      if (energy > 0.002 && useRoomStore.getState().room?.players.some(p => p.id === playerId && !p.micMuted)) speaking.push(playerId);
    }
    useRoomStore.setState({ speakingUserIds: speaking });
  }, 150);
}
async function peerFor(id: string): Promise<Peer> {
  if (peers.has(id)) return peers.get(id)!;
  if (pendingPeers.has(id)) return pendingPeers.get(id)!;
  const currentGeneration = generation;
  const pending = (async () => {
    await loadCredentials();
    if (currentGeneration !== generation) throw new Error('语音连接已取消');
    const pc = new RTCPeerConnection({ iceServers });
    const audio = new Audio();
    audio.autoplay = true;
    audio.muted = useRoomStore.getState().isDeafened;
    const transceiver = pc.addTransceiver('audio', { direction: 'sendrecv' });
    if (stream) await transceiver.sender.replaceTrack(stream.getAudioTracks()[0]);
    if (currentGeneration !== generation) { pc.close(); throw new Error('语音连接已取消'); }
    const peer: Peer = { pc, audio, sender: transceiver.sender, makingOffer: false, ignoreOffer: false, candidates: [] };
    peers.set(id, peer);
    pc.onicecandidate = event => { if (event.candidate) sendRoomAction('voice:signal', { targetId: id, signal: event.candidate.toJSON() }); };
    pc.ontrack = event => {
      const media = event.streams[0] || new MediaStream([event.track]);
      audio.srcObject = media;
      void audio.play().catch(() => useRoomStore.setState({ voiceError: '浏览器阻止了语音播放，请点击开麦或闭音按钮启用播放' }));
      meter(id, media);
    };
    pc.onnegotiationneeded = async () => {
      try { peer.makingOffer = true; await pc.setLocalDescription(); sendRoomAction('voice:signal', { targetId: id, signal: { type: pc.localDescription!.type, sdp: pc.localDescription!.sdp } }); }
      catch (error) { if (pc.signalingState !== 'closed') fail(error, currentGeneration); }
      finally { peer.makingOffer = false; }
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') useRoomStore.setState({ voiceStatus: 'connected', voiceError: null });
      if (pc.connectionState === 'failed') { pc.restartIce(); useRoomStore.setState({ voiceError: '部分玩家语音连接失败，正在重试' }); }
    };
    return peer;
  })();
  pendingPeers.set(id, pending);
  try { return await pending; } finally { if (pendingPeers.get(id) === pending) pendingPeers.delete(id); }
}
export function syncVoicePeers() {
  const currentGeneration = generation;
  const me = useUserStore.getState().id;
  const players = useRoomStore.getState().room?.players || [];
  for (const [id, peer] of peers) if (!players.some(p => p.id === id && p.isOnline)) {
    peer.pc.close(); peer.audio.pause(); peer.audio.srcObject = null; peers.delete(id);
    meters.get(id)?.source.disconnect(); meters.delete(id);
  }
  if (stream) for (const player of players) if (player.id !== me && player.isOnline) void peerFor(player.id).catch(error => fail(error, currentGeneration));
}
export function handleVoiceSignal(payload: { senderId: string; signal: RTCSessionDescriptionInit | RTCIceCandidateInit }): Promise<void> {
  const currentGeneration = generation;
  const task = (signalQueues.get(payload.senderId) || Promise.resolve()).then(async () => {
    if (currentGeneration !== generation || !useRoomStore.getState().room?.players.some(p => p.id === payload.senderId && p.isOnline)) return;
    const peer = await peerFor(payload.senderId);
    if (currentGeneration !== generation) return;
    const pc = peer.pc;
    const signal = payload.signal;
    if ('type' in signal) {
      const collision = signal.type === 'offer' && (peer.makingOffer || pc.signalingState !== 'stable');
      peer.ignoreOffer = useUserStore.getState().id < payload.senderId && collision;
      if (peer.ignoreOffer) return;
      await pc.setRemoteDescription(signal);
      for (const candidate of peer.candidates.splice(0)) await pc.addIceCandidate(candidate);
      if (signal.type === 'offer') { await pc.setLocalDescription(); sendRoomAction('voice:signal', { targetId: payload.senderId, signal: { type: pc.localDescription!.type, sdp: pc.localDescription!.sdp } }); }
    } else if (!peer.ignoreOffer) {
      if (pc.remoteDescription) await pc.addIceCandidate(signal); else peer.candidates.push(signal);
    }
  }).catch(error => fail(error, currentGeneration));
  signalQueues.set(payload.senderId, task);
  return task;
}
async function acquireMic() {
  if (stream?.getAudioTracks().some(t => t.readyState === 'live')) return stream;
  stream?.getTracks().forEach(t => t.stop());
  stream = null;
  if (micRequest) return micRequest;
  if (!navigator.mediaDevices?.getUserMedia) throw new Error('当前浏览器不支持麦克风，请使用 HTTPS 或支持语音的浏览器');
  const currentGeneration = generation;
  const request = micRequest = navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false });
  try {
    const media = await request;
    if (currentGeneration !== generation) { media.getTracks().forEach(t => t.stop()); throw new Error('语音连接已取消'); }
    stream = media;
    window.addEventListener('blur', releaseTalk);
    document.addEventListener('visibilitychange', visibilityChanged);
    media.getAudioTracks().forEach(t => { t.enabled = false; t.onended = () => fail(new Error('麦克风已断开，请重新开麦')); });
    meter(useUserStore.getState().id, media);
    return media;
  } finally { if (micRequest === request) micRequest = null; }
}
function setMuted(muted: boolean) {
  stream?.getAudioTracks().forEach(track => { track.enabled = !muted; });
  useRoomStore.setState({ isMuted: muted });
  sendRoomAction('voice:state', { muted });
}
export async function toggleMute() {
  const currentGeneration = generation;
  try {
    if (stream && !useRoomStore.getState().isMuted) { setMuted(true); return; }
    useRoomStore.setState({ voiceStatus: 'connecting', voiceError: null });
    await loadCredentials();
    if (currentGeneration !== generation) return;
    const media = await acquireMic();
    if (currentGeneration !== generation) return;
    if (audioContext?.state === 'suspended') await audioContext.resume();
    const playerIds = useRoomStore.getState().room?.players.filter(p => p.id !== useUserStore.getState().id && p.isOnline).map(p => p.id) || [];
    for (const id of playerIds) {
      const peer = await peerFor(id);
      if (currentGeneration !== generation) return;
      await peer.sender.replaceTrack(media.getAudioTracks()[0]);
      void peer.audio.play().catch(() => {});
    }
    if (currentGeneration !== generation) return;
    setMuted(useRoomStore.getState().voiceMode === 'hold');
    useRoomStore.setState({ voiceStatus: playerIds.length && ![...peers.values()].some(p => p.pc.connectionState === 'connected') ? 'connecting' : 'connected' });
  } catch (error) { fail(error, currentGeneration); }
}
export function toggleDeafen() {
  const value = !useRoomStore.getState().isDeafened;
  for (const peer of peers.values()) { peer.audio.muted = value; if (!value) void peer.audio.play().catch(() => {}); }
  if (audioContext?.state === 'suspended') void audioContext.resume();
  useRoomStore.setState({ isDeafened: value });
}
export function setVoiceMode(mode: 'open' | 'hold') { useRoomStore.setState({ voiceMode: mode }); setMuted(true); }
export function setPushToTalk(pressed: boolean) {
  pushHeld = pressed;
  if (useRoomStore.getState().voiceMode !== 'hold') return;
  if (!pressed) { setMuted(true); return; }
  if (!stream?.getAudioTracks().some(t => t.readyState === 'live')) {
    const currentGeneration = generation;
    void toggleMute().then(() => { if (currentGeneration === generation && pushHeld && stream && useRoomStore.getState().voiceStatus !== 'error') setMuted(false); });
  }
  else setMuted(false);
}
let pushHeld = false;
export function holdToTalk(pressed: boolean) { pushHeld = pressed; setPushToTalk(pressed); }
export function stopVoice() {
  window.removeEventListener('blur', releaseTalk);
  document.removeEventListener('visibilitychange', visibilityChanged);
  generation++;
  micRequest = null;
  stream?.getTracks().forEach(track => { track.onended = null; track.stop(); }); stream = null;
  for (const peer of peers.values()) { peer.pc.close(); peer.audio.pause(); peer.audio.srcObject = null; }
  peers.clear(); pendingPeers.clear(); signalQueues.clear(); meters.forEach(m => m.source.disconnect()); meters.clear();
  if (audioContext) void audioContext.close(); audioContext = null;
  if (meterTimer) clearInterval(meterTimer); meterTimer = null;
  if (refreshTimer) clearTimeout(refreshTimer); refreshTimer = null;
  iceServers = []; credentials = null; pushHeld = false;
  useRoomStore.setState({ voiceStatus: 'off', voiceError: null, isMuted: true, isDeafened: false, speakingUserIds: [] });
}
function releaseTalk() { if (useRoomStore.getState().voiceMode === 'hold') setPushToTalk(false); }
function visibilityChanged() { if (document.hidden) releaseTalk(); }
