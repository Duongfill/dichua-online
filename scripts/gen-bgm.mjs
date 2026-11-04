// Tạo nhạc nền chùa NGUYÊN GỐC (tổng hợp số, không dùng mẫu âm thanh nào) → client/public/audio/*.mp3
// Chạy: node scripts/gen-bgm.mjs   (cần ffmpeg trong PATH)
//
// - Thang âm ngũ cung Việt (hò–xự–xang–xê–cống ~ C D F G A).
// - Mỗi bản dài LOOP giây và LẶP LIỀN MẠCH: đuôi nốt/tiếng vang được "cuộn" về đầu bản (bộ đệm vòng).
// - Đổi SEED để có giai điệu khác; muốn dùng nhạc thật thì chỉ cần thay file mp3 cùng tên.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'client', 'public', 'audio');
const SR = 44100;
const LOOP = 120; // giây
const N = SR * LOOP;
const TAU = Math.PI * 2;

const rng = (seed) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const qf = (f) => Math.round(f * LOOP) / LOOP; // tần số tròn chu kỳ trong 1 vòng lặp → nối liền
const note = (name) => {
  const m = name.match(/^([A-G])(#?)(\d)$/);
  const idx = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 }[m[1]] + (m[2] ? 1 : 0) + (Number(m[3]) - 4) * 12;
  return 440 * 2 ** (idx / 12);
};

function track() {
  return { L: new Float32Array(N), R: new Float32Array(N) };
}
/** Cộng mẫu vào bộ đệm vòng, có pan (-1 trái … 1 phải). */
function addAt(buf, t0, len, pan, fn) {
  const s0 = Math.round(t0 * SR);
  const gl = Math.cos(((pan + 1) * Math.PI) / 4);
  const gr = Math.sin(((pan + 1) * Math.PI) / 4);
  for (let i = 0; i < len; i++) {
    const v = fn(i / SR);
    const k = (((s0 + i) % N) + N) % N;
    buf.L[k] += v * gl;
    buf.R[k] += v * gr;
  }
}

// ---------- Nhạc cụ ----------
/** Nền ngân trầm: các sine tròn chu kỳ, thở chậm. */
function drone(buf, parts, breathCycles) {
  const ps = parts.map(([f, a], i) => ({ f: qf(f), a, ph: i * 1.7 }));
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    const breath = 0.72 + 0.28 * Math.sin((TAU * breathCycles * t) / LOOP);
    let l = 0;
    let r = 0;
    for (const p of ps) {
      l += p.a * Math.sin(TAU * p.f * t + p.ph);
      r += p.a * Math.sin(TAU * p.f * t + p.ph + 0.9); // lệch pha nhẹ → rộng stereo
    }
    buf.L[i] += l * breath;
    buf.R[i] += r * breath;
  }
}

/** Gảy dây kiểu đàn tranh: hoạ âm cao tắt nhanh hơn, rung nhẹ sau khi gảy. */
function pluck(buf, t0, f, amp, pan) {
  const len = Math.round(SR * 4.5);
  addAt(buf, t0, len, pan, (t) => {
    const att = 1 - Math.exp(-t / 0.003);
    const vib = 1 + 0.004 * Math.sin(TAU * 5.2 * t) * Math.min(1, t / 0.6);
    let v = 0;
    for (const [k, a] of [[1, 1], [2, 0.42], [3, 0.16], [4, 0.07], [5, 0.03]]) v += a * Math.sin(TAU * f * k * vib * t) * Math.exp(-t * (0.9 + k * 0.55));
    return amp * att * v;
  });
}

/** Đại hồng chung: hoạ âm không hài hoà, ngân rất dài, có "nhịp" do 2 tần số sát nhau. */
function bigBell(buf, t0, base, amp, pan = 0) {
  const len = Math.round(SR * 11);
  const parts = [[1, 1, 9], [1.0065, 0.7, 9], [2.0, 0.45, 6], [2.76, 0.3, 4.5], [4.07, 0.16, 3], [5.4, 0.08, 1.8], [0.5, 0.35, 10]];
  addAt(buf, t0, len, pan, (t) => {
    let v = 0;
    for (const [k, a, d] of parts) v += a * Math.sin(TAU * base * k * t) * Math.exp(-t * (4 / d));
    return amp * (1 - Math.exp(-t / 0.002)) * v;
  });
}

/** Khánh (chuông nhỏ) trong chánh điện. */
function khanh(buf, t0, amp, pan = 0) {
  const len = Math.round(SR * 4);
  addAt(buf, t0, len, pan, (t) => {
    let v = 0;
    for (const [k, a, d] of [[1, 1, 3], [2.71, 0.4, 1.6], [5.1, 0.15, 0.8], [1.004, 0.5, 3]]) v += a * Math.sin(TAU * 988 * k * t) * Math.exp(-t * (3 / d));
    return amp * (1 - Math.exp(-t / 0.001)) * v;
  });
}

/** Mõ gỗ: tiếng "cốc" ngắn, cao độ hơi tụt. */
function mo(buf, t0, amp, pan = 0) {
  const len = Math.round(SR * 0.25);
  let seed = Math.floor(t0 * 1000) + 7;
  const rnd = rng(seed);
  addAt(buf, t0, len, pan, (t) => {
    const f = 620 * (1 + 0.25 * Math.exp(-t * 60));
    const body = Math.sin(TAU * f * t) * Math.exp(-t * 38) + 0.45 * Math.sin(TAU * f * 2.3 * t) * Math.exp(-t * 70);
    const click = (rnd() * 2 - 1) * Math.exp(-t * 400) * 0.5;
    return amp * (body + click);
  });
}

/** Gió nhẹ: nhiễu lọc thấp, to nhỏ chậm; nối đầu–cuối bằng trộn chéo 2 giây. */
function wind(buf, amp, seed) {
  const F = SR * 2;
  const rnd = rng(seed);
  for (const ch of ['L', 'R']) {
    const y = new Float32Array(N + F);
    let a = 0;
    let b = 0;
    for (let i = 0; i < N + F; i++) {
      a += 0.02 * ((rnd() * 2 - 1) - a); // lọc thấp 2 tầng
      b += 0.05 * (a - b);
      y[i] = b;
    }
    for (let i = 0; i < N; i++) {
      const t = i / SR;
      const gust = 0.55 + 0.45 * Math.sin((TAU * 4 * t) / LOOP + (ch === 'L' ? 0 : 1.3)) * Math.sin((TAU * 7 * t) / LOOP);
      const v = i < F ? y[i] * (i / F) + y[N + i] * (1 - i / F) : y[i];
      buf[ch][i] += amp * 30 * v * gust;
    }
  }
}

/** Chim hót: vài tiếng "chíp" quét tần số. */
function bird(buf, t0, amp, pan, rnd) {
  const n = 2 + Math.floor(rnd() * 4);
  let t = t0;
  for (let c = 0; c < n; c++) {
    const dur = 0.07 + rnd() * 0.09;
    const f0 = 2600 + rnd() * 1400;
    const sweep = (rnd() > 0.5 ? 1 : -1) * (600 + rnd() * 1200);
    addAt(buf, t, Math.round(SR * dur), pan, (x) => {
      const k = x / dur;
      const ph = TAU * (f0 * x + (sweep * x * x) / (2 * dur));
      return amp * Math.sin(Math.PI * k) ** 2 * Math.sin(ph + 0.3 * Math.sin(TAU * 45 * x));
    });
    t += dur + 0.04 + rnd() * 0.12;
  }
}

/** Giai điệu ngũ cung rải thưa: từng câu ngắn, đi liền bậc là chính. */
function melody(buf, scale, { seed, gapMin, gapMax, amp }) {
  const rnd = rng(seed);
  let t = 1.5 + rnd() * 2;
  let idx = Math.floor(scale.length / 2);
  while (t < LOOP - 2) {
    const len = 3 + Math.floor(rnd() * 4);
    const pan = (rnd() - 0.5) * 0.8;
    for (let i = 0; i < len; i++) {
      const step = rnd() < 0.7 ? (rnd() < 0.5 ? -1 : 1) : (rnd() < 0.5 ? -2 : 2);
      idx = Math.max(0, Math.min(scale.length - 1, idx + step));
      const last = i === len - 1;
      pluck(buf, t, note(scale[idx]), amp * (last ? 0.85 : 1) * (0.8 + rnd() * 0.3), pan);
      // thỉnh thoảng gảy kèm nốt quãng 8 dưới cho ấm
      if (last && rnd() < 0.5) pluck(buf, t, note(scale[idx]) / 2, amp * 0.5, pan);
      t += last ? 0 : 0.38 + rnd() * 0.55;
    }
    t += gapMin + rnd() * (gapMax - gapMin);
  }
}

// ---------- Tiếng vang (Schroeder) – xử lý 2 vòng nối nhau để đuôi vang cuộn về đầu ----------
function reverb(buf, { mix, room }) {
  const combs = [1557, 1617, 1491, 1422].map((d) => Math.round(d * room));
  const aps = [225, 556];
  for (const [ch, off] of [['L', 0], ['R', 23]]) {
    const x = buf[ch];
    const len = N * 2;
    const wet = new Float32Array(len);
    for (const d0 of combs) {
      const d = d0 + off;
      const line = new Float32Array(d);
      let p = 0;
      let lp = 0;
      for (let i = 0; i < len; i++) {
        const out = line[p];
        lp = out * 0.6 + lp * 0.4; // giảm chói
        line[p] = x[i % N] + lp * 0.84;
        wet[i] += out * 0.25;
        p = (p + 1) % d;
      }
    }
    for (const d of aps) {
      const line = new Float32Array(d);
      let p = 0;
      for (let i = 0; i < len; i++) {
        const bo = line[p];
        const v = wet[i];
        line[p] = v + bo * 0.5;
        wet[i] = bo - v * 0.5;
        p = (p + 1) % d;
      }
    }
    for (let i = 0; i < N; i++) x[i] = x[i] * (1 - mix) + wet[N + i] * mix;
  }
}

function master(buf, peak = 0.8) {
  let m = 0;
  for (const ch of ['L', 'R']) for (const v of buf[ch]) m = Math.max(m, Math.abs(v));
  const g = peak / m;
  for (const ch of ['L', 'R']) for (let i = 0; i < N; i++) buf[ch][i] = Math.tanh(buf[ch][i] * g * 1.1) / Math.tanh(1.1);
}

function writeMp3(buf, file, title) {
  const tmp = path.join(os.tmpdir(), `bgm-${process.pid}-${path.basename(file, '.mp3')}.wav`);
  const data = Buffer.alloc(44 + N * 4);
  data.write('RIFF', 0);
  data.writeUInt32LE(36 + N * 4, 4);
  data.write('WAVEfmt ', 8);
  data.writeUInt32LE(16, 16);
  data.writeUInt16LE(1, 20);
  data.writeUInt16LE(2, 22);
  data.writeUInt32LE(SR, 24);
  data.writeUInt32LE(SR * 4, 28);
  data.writeUInt16LE(4, 32);
  data.writeUInt16LE(16, 34);
  data.write('data', 36);
  data.writeUInt32LE(N * 4, 40);
  for (let i = 0; i < N; i++) {
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, buf.L[i])) * 32767), 44 + i * 4);
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, buf.R[i])) * 32767), 46 + i * 4);
  }
  fs.writeFileSync(tmp, data);
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', tmp, '-c:a', 'libmp3lame', '-b:a', '96k',
    '-metadata', `title=${title}`, '-metadata', 'artist=Chùa Online (tổng hợp)', '-metadata', 'comment=Nhạc tổng hợp nguyên gốc, tự do sử dụng trong dự án', file]);
  fs.unlinkSync(tmp);
  console.log(`✓ ${path.relative(ROOT, file)} (${(fs.statSync(file).size / 1024).toFixed(0)} KB)`);
}

// ---------- Hai bản nhạc ----------
fs.mkdirSync(OUT_DIR, { recursive: true });

{
  // SÂN CHÙA – sáng, thoáng: ngân nền, đàn rải, đại hồng chung, gió, chim
  const b = track();
  drone(b, [[note('C2'), 0.035], [note('C3'), 0.045], [note('G3'), 0.03], [note('C4'), 0.012]], 3);
  melody(b, ['G3', 'A3', 'C4', 'D4', 'F4', 'G4', 'A4', 'C5', 'D5', 'F5', 'G5'], { seed: 11, gapMin: 5, gapMax: 10, amp: 0.15 });
  [3, 43, 83].forEach((t) => bigBell(b, t, note('F2'), 0.32, -0.2));
  wind(b, 0.018, 5);
  const r = rng(99);
  for (let i = 0; i < 9; i++) bird(b, 6 + i * 12.5 + r() * 6, 0.035, (r() - 0.5) * 1.6, r);
  reverb(b, { mix: 0.28, room: 1.15 });
  master(b, 0.78);
  writeMp3(b, path.join(OUT_DIR, 'bgm-courtyard.mp3'), 'Sân chùa – gió sớm');
}

{
  // CHÁNH ĐIỆN – trầm, ấm: ngân sâu, khánh, mõ thưa, đàn ít, vang phòng lớn
  const b = track();
  drone(b, [[note('A1'), 0.04], [note('A2'), 0.05], [note('E3'), 0.032], [note('A3'), 0.014]], 2);
  melody(b, ['E3', 'G3', 'A3', 'C4', 'D4', 'E4', 'G4', 'A4'], { seed: 23, gapMin: 9, gapMax: 15, amp: 0.11 });
  [0.5, 30.5, 60.5, 90.5].forEach((t, i) => khanh(b, t, 0.16, i % 2 ? 0.25 : -0.25));
  for (const start of [14, 74]) for (let k = 0; k < 7; k++) mo(b, start + k * 1.15, 0.13 * (k === 6 ? 0.7 : 1), 0.1);
  reverb(b, { mix: 0.38, room: 1.35 });
  master(b, 0.72);
  writeMp3(b, path.join(OUT_DIR, 'bgm-hall.mp3'), 'Chánh điện – trầm hương');
}
