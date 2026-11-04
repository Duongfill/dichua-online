// Nhạc nền chùa theo khu vực (Sân chùa / Chánh điện), phát riêng trên từng máy.
// - Web Audio + bộ đệm lặp → lặp liền mạch (thẻ <audio loop> với mp3 hay có khoảng hở/tiếng tách).
// - Đổi khu vực: chuyển chéo 2,5 giây. Chỉ giải mã 1 bản tại một lúc, ở 24 kHz → nhẹ RAM điện thoại.
// - Âm lượng = Cài đặt "Nhạc nền" × duck (giai đoạn 5: hạ nhỏ khi đang Phát chung kinh).
// - Thay nhạc thật: đặt file cùng tên vào client/public/audio/ (nhớ quyền sử dụng).
import type { SceneId } from '@chua/shared';
import { useGame } from '../state/store';

const TRACKS: Record<SceneId, string> = {
  courtyard: '/audio/bgm-courtyard.mp3',
  hall: '/audio/bgm-hall.mp3',
};
const BASE = 0.55; // nhạc nền nhỏ hơn hiệu ứng / giọng nói
const FADE = 2.5;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let duck = 1;
const files = new Map<SceneId, Promise<ArrayBuffer>>(); // giữ bản nén (~1,4 MB), giải mã khi cần
let current: { scene: SceneId; src: AudioBufferSourceNode; gain: GainNode } | null = null;
let wanted: SceneId | null = null;
let busy = false;

const fetchFile = (scene: SceneId) => {
  let p = files.get(scene);
  if (!p) {
    p = fetch(TRACKS[scene]).then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.arrayBuffer();
    });
    p.catch(() => files.delete(scene));
    files.set(scene, p);
  }
  return p;
};

/** Gọi trong thao tác của người dùng (chạm / phím) – trình duyệt mới cho phát âm thanh. */
export function unlockMusic() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      try {
        ctx = new AC({ sampleRate: 24000 });
      } catch {
        ctx = new AC(); // trình duyệt không cho chọn sampleRate
      }
      master = ctx.createGain();
      master.connect(ctx.destination);
      applyVolume();
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    sync();
  } catch (err) {
    console.warn('[bgm] không khởi tạo được âm thanh', err);
  }
}

function target(): SceneId | null {
  const s = useGame.getState();
  return s.phase === 'playing' && s.settings.music ? s.scene : null;
}

function applyVolume() {
  if (!master || !ctx) return;
  const v = useGame.getState().settings.volMusic * BASE * duck;
  master.gain.setTargetAtTime(v, ctx.currentTime, 0.3);
}

/** Nối một thẻ audio vào Web Audio (chỉnh âm lượng được cả trên iOS). null nếu chưa mở khoá âm thanh. */
export function connectMedia(el: HTMLMediaElement): GainNode | null {
  if (!ctx) return null;
  try {
    const g = ctx.createGain();
    ctx.createMediaElementSource(el).connect(g).connect(ctx.destination);
    return g;
  } catch {
    return null;
  }
}

/** Hạ nhỏ nhạc nền (0..1) – dùng khi đang Phát chung kinh. */
export function setMusicDuck(k: number) {
  duck = Math.max(0, Math.min(1, k));
  applyVolume();
}

async function sync() {
  wanted = target();
  if (!ctx || !master || busy) return;
  if ((current?.scene ?? null) === wanted) return;
  busy = true;
  try {
    // tắt dần bản đang phát
    if (current) {
      const old = current;
      current = null;
      old.gain.gain.setTargetAtTime(0, ctx.currentTime, FADE / 4);
      setTimeout(() => {
        try {
          old.src.stop();
        } catch {
          /* đã dừng */
        }
        old.src.disconnect();
        old.gain.disconnect();
      }, FADE * 1000 + 200);
    }
    const scene = wanted;
    if (scene) {
      const data = await fetchFile(scene);
      const buffer = await ctx.decodeAudioData(data.slice(0)); // slice: giữ bản nén để dùng lại
      if (wanted === scene) {
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        src.loop = true;
        const gain = ctx.createGain();
        gain.gain.value = 0;
        gain.gain.setTargetAtTime(1, ctx.currentTime, FADE / 4);
        src.connect(gain).connect(master);
        // bắt đầu ở một đoạn ngẫu nhiên để mỗi lần vào chùa nghe khác nhau
        src.start(0, Math.random() * buffer.duration);
        current = { scene, src, gain };
      }
    }
  } catch (err) {
    console.warn('[bgm] không phát được nhạc nền', err);
  } finally {
    busy = false;
  }
  if ((current?.scene ?? null) !== target()) sync(); // trạng thái đổi trong lúc đang tải
}

// Theo dõi khu vực, bật/tắt, âm lượng
useGame.subscribe((s, prev) => {
  if (s.settings.volMusic !== prev.settings.volMusic) applyVolume();
  if (s.scene !== prev.scene || s.phase !== prev.phase || s.settings.music !== prev.settings.music) sync();
});
// tải trước bản nhạc sân chùa khi vào game (chưa phát tới khi người dùng chạm)
useGame.subscribe((s, prev) => {
  if (s.phase === 'playing' && prev.phase !== 'playing') fetchFile(s.scene).catch(() => {});
});

if (import.meta.env.DEV) (window as unknown as { __bgm: object }).__bgm = { get ctx() { return ctx; }, get current() { return current?.scene ?? null; }, get gain() { return master?.gain.value; }, get master() { return master; } };
