// Trạng thái thay đổi mỗi khung hình – để ngoài React/Zustand cho nhanh.

export const local = {
  x: 0,
  z: 0,
  ry: Math.PI,
  walking: false,
  /** điểm đến khi bấm vào mặt đất */
  target: null as null | { x: number; z: number },
  dirty: true,
  /** đang làm nghi thức tới thời điểm này (performance.now) → đứng yên, quay mặt về faceRy */
  busyUntil: 0,
  faceRy: 0,
  /** bấm nút hành động khi ở xa → tự đi tới rồi làm */
  pending: null as null | { action: import('@chua/shared').ActionId } | { sit: number } | { chess: import('@chua/shared').Side },
  /** đang ngồi bàn cờ tướng, cầm quân bên nào */
  chessSide: null as null | import('@chua/shared').Side,
  /** đang ngồi bồ đoàn số mấy */
  seat: null as number | null,
};

if (import.meta.env.DEV) (window as unknown as { __local: typeof local }).__local = local; // chỉ để debug

export const input = {
  fwd: 0,
  back: 0,
  left: 0,
  right: 0,
  joyX: 0, // -1..1 (phải +)
  joyY: 0, // -1..1 (tiến +)
};

/** Góc xoay camera quanh nhân vật – để hướng di chuyển theo góc nhìn. */
export const cam = { yaw: 0, pitch: 0.42, dist: 10 };

const KEYS: Record<string, keyof typeof input> = {
  KeyW: 'fwd', ArrowUp: 'fwd',
  KeyS: 'back', ArrowDown: 'back',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
};

const typing = () => {
  const el = document.activeElement as HTMLElement | null;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
};

export function bindKeyboard(onAction: (code: string) => void) {
  const down = (e: KeyboardEvent) => {
    if (typing()) return;
    const k = KEYS[e.code];
    if (k) {
      input[k] = 1;
      e.preventDefault();
    } else if (!e.repeat) onAction(e.code);
  };
  const up = (e: KeyboardEvent) => {
    const k = KEYS[e.code];
    if (k) input[k] = 0;
  };
  const blur = () => {
    input.fwd = input.back = input.left = input.right = 0;
  };
  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  window.addEventListener('blur', blur);
  return () => {
    window.removeEventListener('keydown', down);
    window.removeEventListener('keyup', up);
    window.removeEventListener('blur', blur);
  };
}

if (import.meta.env.DEV) (window as unknown as { __cam: typeof cam }).__cam = cam; // chỉ để debug
