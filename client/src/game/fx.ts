// Bus hiệu ứng: sự kiện hành động (của mình & người khác) → animation nhân vật + hiệu ứng vật thể.
import type { ActEvent, ActionId, SceneId } from '@chua/shared';
import { ACTION_DEFS } from '@chua/shared';
import { useEffect, useRef } from 'react';
import { serverNow } from '../net/socket';
import { local } from './local';
import { byDistance } from './sfx';

/** Âm lượng theo khoảng cách từ mình tới nơi xảy ra hiệu ứng. */
export const volAt = (x: number, z: number) => byDistance(Math.hypot(local.x - x, local.z - z));

export interface FxEvent extends ActEvent {
  scene: SceneId;
  self: boolean;
  /** giờ local (performance.now) tương ứng với lúc bắt đầu */
  start: number;
}

type Listener = (e: FxEvent) => void;
const listeners = new Set<Listener>();
export const onFx = (l: Listener) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

/** Hành động đang diễn ra của từng người (Character đọc mỗi khung hình). */
export const activeActions = new Map<string, { action: ActionId; start: number; end: number }>();

export function emitFx(e: ActEvent, scene: SceneId, self: boolean) {
  // quy đổi giờ server → performance.now() để mọi máy diễn khớp nhau
  const start = performance.now() - Math.max(0, serverNow() - e.t);
  const fe: FxEvent = { ...e, scene, self, start };
  activeActions.set(e.pid, { action: e.action, start, end: start + ACTION_DEFS[e.action].durationMs });
  listeners.forEach((l) => l(fe));
}

export function currentAction(pid: string, now = performance.now()) {
  const a = activeActions.get(pid);
  if (!a) return null;
  if (now > a.end) {
    activeActions.delete(pid);
    return null;
  }
  return a;
}

/** Hẹn giờ theo mốc của hiệu ứng (vd. tiếng chuông lúc 0,55s) – bỏ qua nếu đã trễ quá. */
export function at(e: FxEvent, ms: number, fn: () => void) {
  const delay = e.start + ms - performance.now();
  if (delay < -400) return;
  setTimeout(fn, Math.max(0, delay));
}

/** Đăng ký nghe hiệu ứng trong component (tự huỷ khi unmount). */
export function useFx(handler: Listener) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => onFx((e) => ref.current(e)), []);
}

/** Số ngẫu nhiên ổn định theo seed (để mọi máy ra cùng kết quả). */
export const seeded = (seed: number, i = 0) => {
  const x = Math.sin(seed * 0.0001 + i * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};
