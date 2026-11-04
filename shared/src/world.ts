// Bố cục thế giới dùng chung: client dùng để va chạm & hiển thị, server dùng để kiểm tra vị trí.
// Đơn vị: mét. Trục: -z là hướng Bắc (phía chánh điện). ry = 0 nghĩa là nhìn về +z.
import type { Pose, SceneId } from './protocol';

export interface Bounds { minX: number; maxX: number; minZ: number; maxZ: number }
export interface Circle { x: number; z: number; r: number }
export interface Box { x: number; z: number; hw: number; hd: number }
export interface Zone { id: 'hall-door' | 'hall-exit'; x: number; z: number; r: number; label: string; key: string }

export const PLAYER_RADIUS = 0.35;

export const SCENES: Record<SceneId, { bounds: Bounds; spawn: Pose }> = {
  courtyard: { bounds: { minX: -24, maxX: 24, minZ: -22, maxZ: 24 }, spawn: { x: 0, z: 13, ry: Math.PI } },
  hall: { bounds: { minX: -9.2, maxX: 9.2, minZ: -10.2, maxZ: 9.2 }, spawn: { x: 0, z: 5.6, ry: Math.PI } },
};

// ---- Sân chùa: vị trí các công trình (component 3D đọc từ đây) ----
export const COURTYARD = {
  hallBuilding: { x: 0, z: -16, w: 19, d: 11 },
  incense: { x: 0, z: -2 },
  pond: { x: 12, z: 4, r: 4.5 },
  bell: { x: -13, z: 3 },
  gate: { z: 23.5 },
  bonsai: [
    [-7, 9], [7, 9], [-7, -5], [7, -5], [-17, 12], [17, 12], [-5, 19], [5, 19],
  ] as [number, number][],
  bigTrees: [
    [-20, 18], [20, 18], [-21, -8], [21, -8], [-19, -18], [19, -18],
  ] as [number, number][],
  lanternPoles: [
    [-3.5, 16], [3.5, 16], [-3.5, 10], [3.5, 10], [-3.5, 4], [3.5, 4],
  ] as [number, number][],
};

// ---- Chánh điện: 20 bồ đoàn, 4 hàng × 5 ----
export const HALL_SEATS: { x: number; z: number }[] = [];
for (let row = 0; row < 4; row++) for (let col = 0; col < 5; col++) HALL_SEATS.push({ x: -4 + col * 2, z: -3.5 + row * 2 });

export const HALL = {
  altar: { x: 0, z: -8.6, hw: 4.2, hd: 1.6 },
  columns: [
    [-6.5, -5], [6.5, -5], [-6.5, 0], [6.5, 0], [-6.5, 5], [6.5, 5],
  ] as [number, number][],
};

export const COLLIDERS: Record<SceneId, { circles: Circle[]; boxes: Box[] }> = {
  courtyard: {
    circles: [
      { x: COURTYARD.incense.x, z: COURTYARD.incense.z, r: 1.3 },
      { x: COURTYARD.pond.x, z: COURTYARD.pond.z, r: COURTYARD.pond.r + 0.2 },
      { x: COURTYARD.bell.x, z: COURTYARD.bell.z, r: 2.3 },
      ...COURTYARD.bonsai.map(([x, z]) => ({ x, z, r: 0.7 })),
      ...COURTYARD.bigTrees.map(([x, z]) => ({ x, z, r: 1.1 })),
      ...COURTYARD.lanternPoles.map(([x, z]) => ({ x, z, r: 0.22 })),
      { x: -3.4, z: COURTYARD.gate.z, r: 0.6 },
      { x: 3.4, z: COURTYARD.gate.z, r: 0.6 },
    ],
    boxes: [
      { x: COURTYARD.hallBuilding.x, z: COURTYARD.hallBuilding.z, hw: COURTYARD.hallBuilding.w / 2, hd: COURTYARD.hallBuilding.d / 2 },
    ],
  },
  hall: {
    circles: HALL.columns.map(([x, z]) => ({ x, z, r: 0.45 })),
    boxes: [HALL.altar],
  },
};

export const ZONES: Record<SceneId, Zone[]> = {
  courtyard: [{ id: 'hall-door', x: 0, z: -9.3, r: 2.4, label: 'Vào chánh điện', key: 'E' }],
  hall: [{ id: 'hall-exit', x: 0, z: 8.2, r: 1.6, label: 'Ra sân chùa', key: 'E' }],
};

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);

/** Đẩy điểm (x,z) ra khỏi vật cản và giữ trong biên khu vực. */
export function collide(scene: SceneId, x: number, z: number, r = PLAYER_RADIUS): { x: number; z: number } {
  const col = COLLIDERS[scene];
  for (const c of col.circles) {
    const dx = x - c.x;
    const dz = z - c.z;
    const d = Math.hypot(dx, dz);
    const min = c.r + r;
    if (d < min) {
      if (d < 1e-4) x = c.x + min;
      else {
        x = c.x + (dx / d) * min;
        z = c.z + (dz / d) * min;
      }
    }
  }
  for (const b of col.boxes) {
    const px = clamp(x, b.x - b.hw, b.x + b.hw);
    const pz = clamp(z, b.z - b.hd, b.z + b.hd);
    const dx = x - px;
    const dz = z - pz;
    const d = Math.hypot(dx, dz);
    if (d < r) {
      if (d < 1e-4) {
        const l = x - (b.x - b.hw), rr = b.x + b.hw - x, t = z - (b.z - b.hd), bt = b.z + b.hd - z;
        const m = Math.min(l, rr, t, bt);
        if (m === l) x = b.x - b.hw - r;
        else if (m === rr) x = b.x + b.hw + r;
        else if (m === t) z = b.z - b.hd - r;
        else z = b.z + b.hd + r;
      } else {
        x = px + (dx / d) * r;
        z = pz + (dz / d) * r;
      }
    }
  }
  const bd = SCENES[scene].bounds;
  return { x: clamp(x, bd.minX + r, bd.maxX - r), z: clamp(z, bd.minZ + r, bd.maxZ - r) };
}

export function zoneAt(scene: SceneId, x: number, z: number): Zone | null {
  return ZONES[scene].find((zn) => Math.hypot(x - zn.x, z - zn.z) <= zn.r) ?? null;
}

// ---------- Bồ đoàn ----------
/** Ngồi quay mặt về bàn thờ (−z) */
export const SEAT_RY = Math.PI;
export const SEAT_REACH = 1.0; // đứng trong khoảng này quanh bồ đoàn thì hiện "Ngồi"

/** Bồ đoàn gần nhất trong tầm với, hoặc -1. */
export function seatAt(x: number, z: number, reach = SEAT_REACH): number {
  let best = -1;
  let bd = reach;
  HALL_SEATS.forEach((s, i) => {
    const d = Math.hypot(x - s.x, z - s.z);
    if (d <= bd) {
      bd = d;
      best = i;
    }
  });
  return best;
}
