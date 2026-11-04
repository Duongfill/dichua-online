// Hồ sơ người chơi theo token trình duyệt (trong RAM). Giai đoạn 6 thay bằng DB + đăng nhập.
// Mất khi server khởi động lại – đủ để tải lại trang không mất công đức/cooldown.
import { randomUUID } from 'node:crypto';
import { expForLevel, titleFor, type ActionId, type Wallet } from '@chua/shared';

export interface Profile {
  key: string; // định danh ẩn (vd. đếm báo cáo không trùng người)
  admin?: boolean;
  level: number;
  wallet: Wallet;
  cooldowns: Partial<Record<ActionId, number>>; // thời điểm (ms) được làm lại
  lastSeen: number;
}

const profiles = new Map<string, Profile>();
const TOKEN_RE = /^[A-Za-z0-9-]{16,64}$/;

const fresh = (): Profile => ({
  key: randomUUID(),
  level: 1,
  wallet: { merit: 0, jade: 10, exp: 0, expNext: expForLevel(1), title: titleFor(1) }, // 10 ngọc chào mừng
  cooldowns: {},
  lastSeen: Date.now(),
});

export function getProfile(token: unknown): Profile {
  if (typeof token !== 'string' || !TOKEN_RE.test(token)) return fresh();
  let p = profiles.get(token);
  if (!p) profiles.set(token, (p = fresh()));
  p.lastSeen = Date.now();
  return p;
}

/** Cộng công đức + kinh nghiệm; trả true nếu lên cấp. */
export function grant(p: Profile, merit: number, exp: number): boolean {
  const w = p.wallet;
  w.merit += merit;
  w.exp += exp;
  let up = false;
  while (w.exp >= w.expNext) {
    w.exp -= w.expNext;
    p.level++;
    w.expNext = expForLevel(p.level);
    up = true;
  }
  w.title = titleFor(p.level);
  return up;
}

// dọn hồ sơ không hoạt động quá 7 ngày
setInterval(() => {
  const cutoff = Date.now() - 7 * 24 * 3600_000;
  for (const [k, p] of profiles) if (p.lastSeen < cutoff) profiles.delete(k);
}, 3600_000).unref();
