// Hành động tương tác (giai đoạn 3): định nghĩa dùng chung cho client & server.
import type { SceneId } from './protocol';

export type ActionId = 'incense' | 'bow' | 'bell' | 'release';
export const ACTION_IDS: ActionId[] = ['incense', 'bow', 'bell', 'release'];

export interface ActionDef {
  id: ActionId;
  label: string;
  merit: number; // điểm công đức nhận được
  exp: number; // kinh nghiệm
  cooldownMs: number; // chống spam
  durationMs: number; // thời gian animation (khoá di chuyển)
  announce: string; // banner, {name} = tên người chơi
  where: string; // gợi ý nơi thực hiện
  goto: string; // "Đang đi tới …" khi tự đi tới
}

export const ACTION_DEFS: Record<ActionId, ActionDef> = {
  incense: {
    id: 'incense', label: 'Thắp hương', merit: 5, exp: 6, cooldownMs: 30_000, durationMs: 2800,
    announce: '🪔 {name} vừa thắp hương cầu bình an', where: 'đỉnh hương giữa sân hoặc bàn thờ trong chánh điện', goto: 'đỉnh hương',
  },
  bow: {
    id: 'bow', label: 'Lạy Phật', merit: 3, exp: 4, cooldownMs: 15_000, durationMs: 4200,
    announce: '🙏 {name} vừa thành kính lễ Phật', where: 'trong chánh điện, trước bàn thờ', goto: 'trước bàn thờ',
  },
  bell: {
    id: 'bell', label: 'Thỉnh chuông', merit: 4, exp: 5, cooldownMs: 20_000, durationMs: 2200,
    announce: '🔔 {name} vừa thỉnh một hồi chuông', where: 'lầu chuông phía tây sân chùa', goto: 'lầu chuông',
  },
  release: {
    id: 'release', label: 'Phóng sinh', merit: 6, exp: 7, cooldownMs: 45_000, durationMs: 2400,
    announce: '🐟 {name} vừa phóng sinh ở hồ sen', where: 'bờ hồ sen phía đông sân chùa', goto: 'bờ hồ sen',
  },
};

/** Điểm tương tác: đứng trong bán kính r quanh (x,z) thì làm được; quay mặt về (fx,fz). */
export interface Interaction {
  action: ActionId;
  x: number;
  z: number;
  r: number;
  fx: number;
  fz: number;
  /** khoảng cách tới tâm để đứng khi tự đi tới (ngoài vật cản) */
  approach: number;
}

export const INTERACTIONS: Record<SceneId, Interaction[]> = {
  courtyard: [
    { action: 'incense', x: 0, z: -2, r: 3.0, fx: 0, fz: -2, approach: 2.1 },
    { action: 'bell', x: -13, z: 3, r: 4.0, fx: -13, fz: 3, approach: 3.1 },
    { action: 'release', x: 12, z: 4, r: 6.4, fx: 12, fz: 4, approach: 5.5 },
  ],
  hall: [
    { action: 'incense', x: 0, z: -6.3, r: 1.5, fx: 0, fz: -8.6, approach: 0.2 },
    { action: 'bow', x: 0, z: -1.5, r: 4.6, fx: 0, fz: -9.2, approach: 1.0 },
  ],
};

/** Các điểm tương tác đang đứng trong, gần nhất (theo tỉ lệ d/r) trước. */
export function interactionsAt(scene: SceneId, x: number, z: number, slack = 0): Interaction[] {
  return INTERACTIONS[scene]
    .map((it) => ({ it, k: Math.hypot(x - it.x, z - it.z) / (it.r + slack) }))
    .filter((o) => o.k <= 1)
    .sort((a, b) => a.k - b.k)
    .map((o) => o.it);
}

// ---------- Cấp độ & danh hiệu ----------
export const expForLevel = (level: number) => Math.round(100 * Math.pow(level, 1.35));

const TITLES: [number, string][] = [
  [1, 'Phật tử mới'],
  [3, 'Người hữu duyên'],
  [5, 'Đạo hữu tinh tấn'],
  [8, 'Hộ pháp'],
  [12, 'Thiện tri thức'],
];
export const titleFor = (level: number) => [...TITLES].reverse().find(([l]) => level >= l)![1];

// ---------- Sự kiện mạng ----------
export interface ActEvent {
  pid: string;
  action: ActionId;
  x: number;
  z: number;
  ry: number; // hướng quay mặt khi làm
  t: number; // giờ server bắt đầu
  seed: number; // để mọi máy vẽ cùng hiệu ứng (vd. màu cá, chỗ cá rơi)
}

export type ActRes =
  | {
      ok: true;
      gained: { merit: number; exp: number };
      wallet: import('./protocol').Wallet;
      level: number;
      levelUp: boolean;
      cooldownMs: number;
    }
  | { ok: false; error: string; retryMs?: number };
