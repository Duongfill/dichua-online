// Tạo icon PWA (PNG) từ hình ngôi chùa của favicon.svg – vẽ bằng code, không cần thư viện ngoài.
// Chạy: node scripts/gen-icons.mjs  → client/public/icons/*.png
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const OUT = new URL('../client/public/icons/', import.meta.url);
mkdirSync(OUT, { recursive: true });

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const BG = hex('#9b4130');

// Hình trong hệ toạ độ 64×64 (giống favicon.svg). Đường cong Q được chia nhỏ thành đa giác.
const quad = (p0, p1, p2, n = 12) =>
  Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    return [(1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0], (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1]];
  });
const roundRect = (x, y, w, h, r) => {
  const pts = [];
  const arc = (cx, cy, a0) => {
    for (let i = 0; i <= 8; i++) {
      const a = a0 + (i / 8) * (Math.PI / 2);
      pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
  };
  arc(x + w - r, y + r, -Math.PI / 2);
  arc(x + w - r, y + h - r, 0);
  arc(x + r, y + h - r, Math.PI / 2);
  arc(x + r, y + r, Math.PI);
  return pts;
};
const SHAPES = [
  { c: hex('#f3dfb4'), poly: [[8, 30], [32, 14], [56, 30], [50, 30], [32, 19], [14, 30]] },
  { c: hex('#e8c98a'), poly: [...quad([6, 31], [10, 27], [12, 30]), [52, 30], ...quad([52, 30], [54, 27], [58, 31]), [54, 33], [10, 33]] },
  { c: hex('#f3dfb4'), poly: roundRect(17, 33, 30, 17, 2) },
  { c: hex('#9b4130'), poly: roundRect(28, 38, 8, 12, 4) },
  { c: hex('#d6a85a'), circle: [32, 24, 2.5] },
];

function inPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
const hit = (s, x, y) => (s.circle ? (x - s.circle[0]) ** 2 + (y - s.circle[1]) ** 2 <= s.circle[2] ** 2 : inPoly(x, y, s.poly));

/** size px; rounded: bo góc nền (icon thường) hay nền tràn (maskable); scale: tỉ lệ hình trong vùng an toàn */
function render(size, { rounded, scale }) {
  const SS = 4; // siêu lấy mẫu 4×4 để khử răng cưa
  const px = new Uint8Array(size * size * 4);
  const bgShape = roundRect(0, 0, 64, 64, 16);
  for (let py = 0; py < size; py++) {
    for (let pxl = 0; pxl < size; pxl++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const u = ((pxl + (sx + 0.5) / SS) / size) * 64; // toạ độ nền 0..64
          const v = ((py + (sy + 0.5) / SS) / size) * 64;
          if (rounded && !inPoly(u, v, bgShape)) continue;
          // hình chùa thu nhỏ quanh tâm (32, 32)
          const x = 32 + (u - 32) / scale, y = 33 + (v - 32) / scale;
          let col = BG;
          for (const s of SHAPES) if (hit(s, x, y)) col = s.c;
          r += col[0]; g += col[1]; b += col[2]; a += 255;
        }
      }
      const n = SS * SS, k = (py * size + pxl) * 4;
      const cov = a / 255;
      px[k] = cov ? r / cov : 0; px[k + 1] = cov ? g / cov : 0; px[k + 2] = cov ? b / cov : 0; px[k + 3] = a / n;
    }
  }
  return png(size, px);
}

// ---- bộ mã hoá PNG tối giản ----
const CRC = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};
function png(size, rgba) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    Buffer.from(rgba.buffer, y * size * 4, size * 4).copy(raw, y * (size * 4 + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

const jobs = [
  ['icon-192.png', 192, { rounded: true, scale: 1.1 }],
  ['icon-512.png', 512, { rounded: true, scale: 1.1 }],
  ['maskable-512.png', 512, { rounded: false, scale: 0.85 }], // nền tràn, hình nằm trong vùng an toàn 80%
  ['apple-touch-icon.png', 180, { rounded: false, scale: 1.0 }], // iOS tự bo góc
];
for (const [name, size, opt] of jobs) {
  writeFileSync(new URL(name, OUT), render(size, opt));
  console.log('✓', name);
}
