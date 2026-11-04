// Bản đồ nhỏ (canvas 2D): lớp tĩnh vẽ một lần theo khu vực, chấm người chơi vẽ lại ~10 lần/giây.
// Bắc (−z) ở trên. Bản lớn (interactive) cho phép bấm để đi tới.
import { useEffect, useRef } from 'react';
import { COURTYARD, HALL, HALL_SEATS, SCENES, collide, type SceneId } from '@chua/shared';
import { samplePose, type Pose } from '../net/interp';
import { local } from '../game/local';
import { useGame } from '../state/store';

interface Xf { s: number; ox: number; oy: number; minX: number; minZ: number }
const toMap = (t: Xf, x: number, z: number): [number, number] => [(x - t.minX) * t.s + t.ox, (z - t.minZ) * t.s + t.oy];

function xform(scene: SceneId, size: number): Xf {
  const b = SCENES[scene].bounds;
  const pad = size * 0.06;
  const w = b.maxX - b.minX, d = b.maxZ - b.minZ;
  const s = (size - pad * 2) / Math.max(w, d);
  return { s, ox: (size - w * s) / 2, oy: (size - d * s) / 2, minX: b.minX, minZ: b.minZ };
}

function drawStatic(ctx: CanvasRenderingContext2D, scene: SceneId, size: number, labels: boolean) {
  const t = xform(scene, size);
  const rect = (x0: number, z0: number, x1: number, z1: number, c: string) => {
    const [a, b] = toMap(t, x0, z0);
    const [c2, d] = toMap(t, x1, z1);
    ctx.fillStyle = c;
    ctx.fillRect(a, b, c2 - a, d - b);
  };
  const circle = (x: number, z: number, r: number, c: string) => {
    const [a, b] = toMap(t, x, z);
    ctx.beginPath();
    ctx.arc(a, b, Math.max(1.2, r * t.s), 0, Math.PI * 2);
    ctx.fillStyle = c;
    ctx.fill();
  };
  const label = (x: number, z: number, text: string) => {
    if (!labels) return;
    const [a, b] = toMap(t, x, z);
    ctx.font = `600 ${Math.round(size / 34)}px "Be Vietnam Pro", sans-serif`;
    ctx.textAlign = 'center';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255,248,235,0.85)';
    ctx.strokeText(text, a, b);
    ctx.fillStyle = '#4a3418';
    ctx.fillText(text, a, b);
  };

  if (scene === 'courtyard') {
    ctx.fillStyle = '#9bbb7c';
    ctx.fillRect(0, 0, size, size);
    rect(-20, -11.5, 20, 22.5, '#c46d50');
    rect(-1.5, -10, 1.5, 24, '#e2d1b0');
    const H = COURTYARD.hallBuilding;
    rect(H.x - H.w / 2, H.z - H.d / 2, H.x + H.w / 2, H.z + H.d / 2, '#8f3a28');
    rect(-24, 23.3, -4, 24.3, '#efe3c8');
    rect(4, 23.3, 24, 24.3, '#efe3c8');
    rect(-4, 23.1, 4, 24, '#a8321f');
    circle(COURTYARD.pond.x, COURTYARD.pond.z, COURTYARD.pond.r + 0.3, '#bfae94');
    circle(COURTYARD.pond.x, COURTYARD.pond.z, COURTYARD.pond.r, '#5c9a95');
    circle(COURTYARD.incense.x, COURTYARD.incense.z, 1.3, '#8a6a3a');
    rect(COURTYARD.bell.x - 2.1, COURTYARD.bell.z - 2.1, COURTYARD.bell.x + 2.1, COURTYARD.bell.z + 2.1, '#4f7a68');
    COURTYARD.bigTrees.forEach(([x, z]) => circle(x, z, 2, '#557f4b'));
    COURTYARD.bonsai.forEach(([x, z]) => circle(x, z, 0.8, '#476f3b'));
    COURTYARD.lanternPoles.forEach(([x, z]) => circle(x, z, 0.35, '#e2412a'));
    label(H.x, H.z + 0.6, 'Chánh điện');
    label(COURTYARD.pond.x, COURTYARD.pond.z + COURTYARD.pond.r + 1.8, 'Hồ sen');
    label(COURTYARD.bell.x, COURTYARD.bell.z + 3.6, 'Lầu chuông');
    label(COURTYARD.incense.x, COURTYARD.incense.z + 2.8, 'Đỉnh hương');
    label(0, 22.4, 'Cổng tam quan');
  } else {
    ctx.fillStyle = '#2a1a10';
    ctx.fillRect(0, 0, size, size);
    const b = SCENES.hall.bounds;
    rect(b.minX - 0.6, b.minZ - 0.6, b.maxX + 0.6, b.maxZ + 0.6, '#a0703f');
    rect(-5.75, -3, 5.75, 7, '#8e2a1c');
    const a = HALL.altar;
    rect(a.x - a.hw, a.z - a.hd, a.x + a.hw, a.z + a.hd, '#a8321f');
    circle(a.x, a.z - 0.6, 0.9, '#e0b04f');
    HALL.columns.forEach(([x, z]) => circle(x, z, 0.45, '#7a2418'));
    HALL_SEATS.forEach((s) => circle(s.x, s.z, 0.45, '#e2a24f'));
    rect(-1.3, b.maxZ + 0.2, 1.3, b.maxZ + 0.6, '#fff4dc');
    label(a.x, a.z + a.hd + 1.4, 'Bàn thờ');
    label(0, b.maxZ - 0.6, 'Cửa ra');
  }
}

export default function Minimap({ size, interactive = false, className = '' }: { size: number; interactive?: boolean; className?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const scene = useGame((s) => s.scene);

  useEffect(() => {
    const cv = canvas.current!;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = size * dpr;
    cv.height = size * dpr;
    const ctx = cv.getContext('2d')!;
    // lớp tĩnh
    const bg = document.createElement('canvas');
    bg.width = cv.width;
    bg.height = cv.height;
    const bctx = bg.getContext('2d')!;
    bctx.scale(dpr, dpr);
    drawStatic(bctx, scene, size, size >= 200);

    const t = xform(scene, size);
    const pose: Pose = { x: 0, z: 0, ry: 0, walking: false };
    let raf = 0;
    let last = 0;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (now - last < 100) return;
      last = now;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(bg, 0, 0);
      ctx.scale(dpr, dpr);
      // người khác
      const r = Math.max(2.5, size / 50);
      for (const id of Object.keys(useGame.getState().players)) {
        if (!samplePose(id, pose)) continue;
        const [x, y] = toMap(t, pose.x, pose.z);
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = '#4f9a54';
        ctx.fill();
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = '#fff';
        ctx.stroke();
      }
      // điểm đến
      if (local.target) {
        const [x, y] = toMap(t, local.target.x, local.target.z);
        ctx.beginPath();
        ctx.arc(x, y, r * 1.2, 0, Math.PI * 2);
        ctx.strokeStyle = '#ffe08a';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      // mình: mũi tên theo hướng nhìn
      const [x, y] = toMap(t, local.x, local.z);
      const a = r * 2.2;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(-local.ry); // ry=0 nhìn +z (xuống dưới bản đồ)
      ctx.beginPath();
      ctx.moveTo(0, a);
      ctx.lineTo(a * 0.65, -a * 0.6);
      ctx.lineTo(0, -a * 0.25);
      ctx.lineTo(-a * 0.65, -a * 0.6);
      ctx.closePath();
      ctx.fillStyle = '#f5c24b';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#4a3418';
      ctx.stroke();
      ctx.restore();
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [scene, size]);

  const onClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!interactive) return;
    const rc = e.currentTarget.getBoundingClientRect();
    const t = xform(scene, size);
    const mx = ((e.clientX - rc.left) / rc.width) * size;
    const my = ((e.clientY - rc.top) / rc.height) * size;
    const x = (mx - t.ox) / t.s + t.minX;
    const z = (my - t.oy) / t.s + t.minZ;
    const c = collide(scene, x, z);
    local.target = c;
  };

  return (
    <canvas
      ref={canvas}
      onClick={onClick}
      style={{ width: size, height: size }}
      className={`${interactive ? 'cursor-crosshair' : ''} ${className}`}
      aria-label={interactive ? 'Bản đồ – bấm để đi tới' : 'Bản đồ nhỏ'}
    />
  );
}
