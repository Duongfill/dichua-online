// Voice qua LiveKit (SFU). Mỗi khu vực của mỗi kênh = 1 phòng voice; đổi khu vực → đổi phòng.
// - Mặc định TẮT mic khi vào. Chỉ xin quyền micro khi người dùng bấm bật.
// - Sân chùa: âm lượng theo khoảng cách (gần nghe rõ, xa nhỏ dần, quá xa thì ngừng nhận để tiết kiệm mạng).
// - Chánh điện: nghe chung cả phòng.
// - Tắt tiếng từng người, Tịnh tâm (tắt hết voice), thanh âm lượng "Giọng nói" trong Cài đặt.
// livekit-client (~150 KB gzip) chỉ tải khi thật sự vào phòng voice → mở game nhanh hơn trên điện thoại
import type { Room, RemoteParticipant, RemoteTrackPublication } from 'livekit-client';
type LK = typeof import('livekit-client');
let lk: LK | null = null;
import { socket } from '../net/socket';
import { samplePose, type Pose } from '../net/interp';
import { useGame } from '../state/store';
import { local } from './local';

const NEAR = 3; // m – nghe rõ hoàn toàn
const FAR = 18; // m – im hẳn
const UNSUB = 24; // m – ngừng nhận luồng
const RESUB = 20; // m – nhận lại (trễ để khỏi bật/tắt liên tục)

export type VoiceStatus = 'off' | 'connecting' | 'on' | 'disabled' | 'error';

let room: Room | null = null;
let roomName = '';
let joining: Promise<void> | null = null;
const pose: Pose = { x: 0, z: 0, ry: 0, walking: false };

const set = (patch: Partial<ReturnType<typeof useGame.getState>['voice']>) =>
  useGame.setState((s) => ({ voice: { ...s.voice, ...patch } }));

/** Vào phòng voice của khu vực hiện tại (gọi sau khi vào chùa / đổi khu vực). */
export function joinVoice() {
  joining = (joining ?? Promise.resolve()).then(doJoin).catch(() => {});
  return joining;
}

async function doJoin() {
  const res = await socket.timeout(6000).emitWithAck('voice:token').catch(() => null);
  if (!res) return set({ status: 'error', error: 'Không lấy được phiên voice.' });
  if (!res.ok) return set({ status: res.disabled ? 'disabled' : 'error', error: res.error });
  const selfId = useGame.getState().self?.id;
  if (room && roomName === res.room && room.state === 'connected' && room.localParticipant.identity === selfId) return;
  const wantMic = useGame.getState().voice.micOn;
  await leaveVoice(false);
  set({ status: 'connecting', error: '' });
  lk ??= await import('livekit-client');
  const { Room, RoomEvent } = lk;

  const r = new Room({
    adaptiveStream: true,
    dynacast: true,
    webAudioMix: true, // để chỉnh âm lượng từng người được cả trên iOS
    audioCaptureDefaults: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  });
  r.on(RoomEvent.ActiveSpeakersChanged, () => syncSpeaking());
  r.on(RoomEvent.AudioPlaybackStatusChanged, () => set({ needsGesture: !r.canPlaybackAudio }));
  // livekit-client KHÔNG tự phát âm thanh người khác: phải attach() luồng audio vào trang
  r.on(RoomEvent.TrackSubscribed, (track) => {
    if (track.kind === 'audio') {
      const el = track.attach();
      el.dataset.voice = '1';
      el.style.display = 'none';
      document.body.appendChild(el);
    }
    applyVolumes();
  });
  r.on(RoomEvent.TrackUnsubscribed, (track) => {
    track.detach().forEach((el) => el.remove());
  });
  r.on(RoomEvent.Disconnected, () => {
    if (room === r) {
      room = null;
      set({ status: 'off' });
      useGame.setState({ speaking: {} });
    }
  });
  room = r;
  roomName = res.room;
  try {
    await r.connect(res.url, res.token, { autoSubscribe: true });
    set({ status: 'on', needsGesture: !r.canPlaybackAudio });
    if (wantMic) await setMic(true);
    applyVolumes();
  } catch (err) {
    console.warn('[voice] connect', err);
    if (room === r) room = null;
    set({ status: 'error', error: 'Không kết nối được máy chủ voice.' });
  }
}

export async function leaveVoice(resetMic = true) {
  const r = room;
  room = null;
  roomName = '';
  if (r) await r.disconnect().catch(() => {});
  document.querySelectorAll('audio[data-voice]').forEach((el) => el.remove());
  useGame.setState({ speaking: {} });
  if (resetMic) set({ micOn: false });
}

/** Bật/tắt micro. Trả về lỗi (chuỗi) nếu không bật được. */
export async function setMic(on: boolean): Promise<string | null> {
  const st = useGame.getState();
  if (on && st.voice.status === 'disabled') return st.voice.error || 'Máy chủ chưa bật voice.';
  if (on && st.zen) return 'Đang Tịnh tâm – hãy tắt Tịnh tâm để bật micro.';
  if (!room || room.state !== 'connected') {
    if (on) return 'Chưa kết nối được voice, xin thử lại sau giây lát.';
    set({ micOn: false });
    return null;
  }
  try {
    await room.localParticipant.setMicrophoneEnabled(on);
    set({ micOn: on });
    return null;
  } catch (err) {
    const name = (err as Error)?.name;
    set({ micOn: false });
    if (name === 'NotAllowedError') return 'Bạn chưa cho phép dùng micro. Hãy cấp quyền trong cài đặt trình duyệt.';
    if (name === 'NotFoundError') return 'Không tìm thấy micro trên thiết bị này.';
    if (!window.isSecureContext) return 'Micro cần HTTPS (hoặc localhost).';
    return 'Không bật được micro.';
  }
}

/** Gọi trong thao tác của người dùng nếu trình duyệt chặn phát âm thanh. */
export function resumeVoiceAudio() {
  room?.startAudio().then(() => set({ needsGesture: false })).catch(() => {});
}

/** Âm lượng từng người: cài đặt × tắt tiếng × Tịnh tâm × khoảng cách (chỉ ở sân chùa). */
export function applyVolumes() {
  const r = room;
  if (!r || !lk) return;
  const { Track } = lk;
  const st = useGame.getState();
  const base = st.zen ? 0 : st.settings.volVoice;
  const proximity = st.scene === 'courtyard';
  r.remoteParticipants.forEach((p: RemoteParticipant) => {
    const pub = p.getTrackPublication(Track.Source.Microphone) as RemoteTrackPublication | undefined;
    if (!pub) return;
    let k = 1;
    if (proximity) {
      const d = samplePose(p.identity, pose) ? Math.hypot(pose.x - local.x, pose.z - local.z) : FAR;
      k = d <= NEAR ? 1 : d >= FAR ? 0 : 1 - (d - NEAR) / (FAR - NEAR);
      // xa hẳn → ngừng nhận luồng; lại gần → nhận lại
      if (d > UNSUB && pub.isSubscribed) pub.setSubscribed(false);
      else if (d < RESUB && !pub.isSubscribed) pub.setSubscribed(true);
    } else if (!pub.isSubscribed) pub.setSubscribed(true);
    if (st.muted[p.identity]) k = 0;
    const track = pub.audioTrack as { setVolume?: (v: number) => void } | undefined;
    track?.setVolume?.(base * k);
  });
}

/** Đọc lại "ai đang nói" từ từng người (sự kiện ActiveSpeakersChanged không phát lại cho người vào sau). */
function syncSpeaking() {
  const r = room;
  const speaking: Record<string, true> = {};
  if (r) {
    if (r.localParticipant.isSpeaking) speaking[r.localParticipant.identity] = true;
    r.remoteParticipants.forEach((p) => {
      if (p.isSpeaking) speaking[p.identity] = true;
    });
  }
  const cur = useGame.getState().speaking;
  const a = Object.keys(speaking), b = Object.keys(cur);
  if (a.length !== b.length || a.some((k) => !cur[k])) useGame.setState({ speaking });
}

setInterval(() => {
  applyVolumes();
  syncSpeaking();
}, 250);

if (import.meta.env.DEV) (window as unknown as { __voice: object }).__voice = { get room() { return room; } }; // chỉ để debug

// Máy chủ voice tạm không tới được (vd. bật LiveKit sau khi vào game) → tự thử lại mỗi 15 giây
setInterval(() => {
  const s = useGame.getState();
  if (s.phase === 'playing' && s.voice.status === 'error' && !room) joinVoice();
}, 15_000);

// Tự vào/ra phòng voice theo trạng thái game (store không import file này để tránh vòng lặp)
useGame.subscribe((s, prev) => {
  if (s.zen && !prev.zen && s.voice.micOn) setMic(false); // Tịnh tâm → tắt micro
  const playing = s.phase === 'playing' && !!s.self;
  if (!playing) {
    if (prev.phase === 'playing') leaveVoice();
    return;
  }
  // vào chùa, kết nối lại (id mới) hoặc đổi khu vực → vào phòng tương ứng
  if (prev.phase !== 'playing' || s.self?.id !== prev.self?.id || s.scene !== prev.scene) joinVoice();
});
