// Texture vẽ bằng canvas – không cần file ảnh, nhẹ cho điện thoại.
import * as THREE from 'three';

const cache = new Map<string, THREE.Texture>();

function canvasTex(key: string, w: number, h: number, draw: (c: CanvasRenderingContext2D) => void, repeat?: [number, number]) {
  const hit = cache.get(key);
  if (hit) return hit;
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  draw(cv.getContext('2d')!);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  cache.set(key, t);
  return t;
}

// Biến thiên màu giả ngẫu nhiên ổn định
const rnd = (i: number) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/** Sân gạch đỏ (gạch Bát Tràng). */
export const brickTexture = (repeat: [number, number]) =>
  canvasTex(`brick-${repeat}`, 256, 256, (c) => {
    c.fillStyle = '#c9b49a';
    c.fillRect(0, 0, 256, 256);
    const s = 64; // gạch vuông
    for (let y = 0; y < 4; y++)
      for (let x = 0; x < 4; x++) {
        const v = rnd(x * 7 + y * 13);
        const r = 176 + v * 30, g = 86 + v * 22, b = 60 + v * 14;
        c.fillStyle = `rgb(${r},${g},${b})`;
        c.fillRect(x * s + 2, y * s + 2, s - 4, s - 4);
        c.fillStyle = 'rgba(255,255,255,0.06)';
        c.fillRect(x * s + 2, y * s + 2, s - 4, 6);
      }
  }, repeat);

/** Sàn gỗ chánh điện. */
export const woodTexture = (repeat: [number, number]) =>
  canvasTex(`wood-${repeat}`, 256, 256, (c) => {
    for (let i = 0; i < 8; i++) {
      const v = rnd(i * 3.3);
      c.fillStyle = `rgb(${150 + v * 25},${98 + v * 18},${58 + v * 12})`;
      c.fillRect(0, i * 32, 256, 32);
      c.fillStyle = 'rgba(60,30,10,0.35)';
      c.fillRect(0, i * 32, 256, 2);
      c.fillRect(((i * 97) % 200) + 20, i * 32, 2, 32);
      c.strokeStyle = 'rgba(90,50,20,0.15)';
      for (let k = 0; k < 4; k++) {
        c.beginPath();
        c.moveTo(0, i * 32 + 8 + k * 6);
        c.bezierCurveTo(80, i * 32 + 4 + k * 6, 170, i * 32 + 12 + k * 6, 256, i * 32 + 8 + k * 6);
        c.stroke();
      }
    }
  }, repeat);

/** Hoành phi: chữ vàng trên nền đỏ son. */
export const plaqueTexture = (text: string) =>
  canvasTex(`plaque-${text}`, 512, 128, (c) => {
    c.fillStyle = '#7a1f16';
    c.fillRect(0, 0, 512, 128);
    c.strokeStyle = '#e2b45a';
    c.lineWidth = 10;
    c.strokeRect(8, 8, 496, 112);
    c.fillStyle = '#f5d27a';
    c.font = 'bold 64px "Noto Serif", Georgia, serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(text, 256, 68);
  });
