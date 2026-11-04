// Âm thanh tổng hợp bằng Web Audio (không cần file, không vướng bản quyền).
// Muốn dùng file thật: thay từng hàm bằng phát AudioBuffer từ /public/sfx/*.mp3.
import { useGame } from '../state/store';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;

/** Gọi trong thao tác của người dùng để trình duyệt cho phép phát âm thanh. */
export function unlockAudio() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  } catch {
    ctx = null;
  }
}

function out(volume: number) {
  if (!ctx || !master || ctx.state !== 'running') return null;
  const v = useGame.getState().settings.volSfx * volume;
  if (v <= 0.001) return null;
  const g = ctx.createGain();
  g.gain.value = v;
  g.connect(master);
  return { ctx, g };
}

function partial(c: AudioContext, dest: AudioNode, freq: number, amp: number, decay: number, t0: number, type: OscillatorType = 'sine') {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(amp, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + decay);
  o.connect(g).connect(dest);
  o.start(t0);
  o.stop(t0 + decay + 0.05);
}

function noise(c: AudioContext, dest: AudioNode, dur: number, t0: number, filter: BiquadFilterType, freq: number, amp: number, attack = 0.01) {
  const len = Math.ceil(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = filter;
  f.frequency.value = freq;
  const g = c.createGain();
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(amp, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f).connect(g).connect(dest);
  src.start(t0);
}

/** Đại hồng chung: âm trầm ngân dài. */
export function bigBell(volume = 1) {
  const o = out(volume);
  if (!o) return;
  const t = o.ctx.currentTime;
  const base = 98;
  [[1, 0.5, 7], [2.0, 0.28, 5], [2.76, 0.2, 4], [4.07, 0.1, 2.5], [5.4, 0.06, 1.5]].forEach(([k, a, d]) =>
    partial(o.ctx, o.g, base * k, a, d, t),
  );
  partial(o.ctx, o.g, base * 1.006, 0.25, 7, t); // tạo nhịp "ngân"
  noise(o.ctx, o.g, 0.12, t, 'lowpass', 900, 0.25);
}

/** Chuông nhỏ (khánh) khi lạy. */
export function smallBell(volume = 1) {
  const o = out(volume);
  if (!o) return;
  const t = o.ctx.currentTime;
  [[1, 0.25, 2.2], [2.7, 0.08, 1.2], [5.1, 0.04, 0.6]].forEach(([k, a, d]) => partial(o.ctx, o.g, 1046 * k, a, d, t));
}

/** Tiếng mõ gỗ. */
export function woodBlock(volume = 1) {
  const o = out(volume);
  if (!o) return;
  const t = o.ctx.currentTime;
  partial(o.ctx, o.g, 720, 0.45, 0.12, t, 'triangle');
  noise(o.ctx, o.g, 0.06, t, 'bandpass', 1500, 0.2, 0.002);
}

/** Quẹt lửa + hương bén. */
export function incenseLight(volume = 1) {
  const o = out(volume);
  if (!o) return;
  const t = o.ctx.currentTime;
  noise(o.ctx, o.g, 0.35, t, 'highpass', 2500, 0.25, 0.005);
  noise(o.ctx, o.g, 1.2, t + 0.2, 'lowpass', 600, 0.12, 0.3);
}

/** Cá rơi xuống nước. */
export function splash(volume = 1) {
  const o = out(volume);
  if (!o) return;
  const t = o.ctx.currentTime;
  noise(o.ctx, o.g, 0.5, t, 'bandpass', 1200, 0.45, 0.004);
  noise(o.ctx, o.g, 0.9, t + 0.05, 'lowpass', 500, 0.2, 0.02);
  partial(o.ctx, o.g, 380, 0.1, 0.18, t + 0.02);
}

/** Âm báo lên cấp. */
export function chime(volume = 1) {
  const o = out(volume);
  if (!o) return;
  const t = o.ctx.currentTime;
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => partial(o.ctx, o.g, f, 0.18, 1.2, t + i * 0.09));
}

/** Âm lượng theo khoảng cách tới người nghe (m). */
export const byDistance = (d: number) => Math.max(0.15, Math.min(1, 1 - d / 30));
