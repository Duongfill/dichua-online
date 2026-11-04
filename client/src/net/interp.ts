// Bộ đệm nội suy cho người chơi khác: hiển thị trễ INTERP_DELAY ms so với server
// để luôn có 2 mẫu kẹp hai bên → chuyển động mượt dù mạng giật.
import type { Snapshot } from '@chua/shared';
import { noteServerTime, serverNow } from './socket';

interface Sample { t: number; x: number; z: number; ry: number; a: number }
const buffers = new Map<string, Sample[]>();
export const INTERP_DELAY = 150;

export function pushSnapshot(s: Snapshot, selfId: string | null) {
  noteServerTime(s.t);
  for (const [id, x, z, ry, a] of s.p) {
    if (id === selfId) continue;
    let b = buffers.get(id);
    if (!b) buffers.set(id, (b = []));
    const last = b[b.length - 1];
    if (last && last.t >= s.t) continue;
    b.push({ t: s.t, x, z, ry, a });
    if (b.length > 40) b.shift();
  }
}

const lerpAngle = (a: number, b: number, f: number) => {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * f;
};

export interface Pose { x: number; z: number; ry: number; walking: boolean; sitting?: boolean }

/** Ghi vị trí nội suy vào `out`. Trả false nếu chưa có dữ liệu. */
export function samplePose(id: string, out: Pose): boolean {
  const b = buffers.get(id);
  if (!b || !b.length) return false;
  const rt = serverNow() - INTERP_DELAY;
  let s0 = b[0];
  let s1 = b[0];
  if (rt <= b[0].t) {
    s0 = s1 = b[0];
  } else if (rt >= b[b.length - 1].t) {
    s0 = s1 = b[b.length - 1];
  } else {
    for (let i = 0; i < b.length - 1; i++) {
      if (b[i].t <= rt && rt < b[i + 1].t) {
        s0 = b[i];
        s1 = b[i + 1];
        break;
      }
    }
  }
  const f = s1.t === s0.t ? 1 : (rt - s0.t) / (s1.t - s0.t);
  out.x = s0.x + (s1.x - s0.x) * f;
  out.z = s0.z + (s1.z - s0.z) * f;
  out.ry = lerpAngle(s0.ry, s1.ry, f);
  // "đang đi" nếu mẫu gần nhất báo đi, hoặc vị trí còn thay đổi
  const a = f < 0.5 ? s0.a : s1.a;
  out.sitting = a === 2;
  out.walking = !out.sitting && (a === 1 || Math.hypot(s1.x - s0.x, s1.z - s0.z) > 0.02);
  // bỏ mẫu quá cũ
  while (b.length > 2 && b[1].t < rt - 500) b.shift();
  return true;
}

export const removeBuffer = (id: string) => buffers.delete(id);
export const clearBuffers = () => buffers.clear();
