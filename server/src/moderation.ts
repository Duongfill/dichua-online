// Kiểm duyệt cơ bản (dùng cho tên hiển thị; chat dùng ở giai đoạn 2).
// So khớp CÓ DẤU để không chặn nhầm (vd. "đụ" bỏ dấu thành "du" trong "du lịch").

const BAD_WORDS = [
  'địt', 'đụ', 'đéo', 'lồn', 'buồi', 'cặc', 'đĩ', 'điếm', 'óc chó', 'mẹ mày', 'bố mày',
  'vãi lồn', 'đù má', 'đụ má', 'địt mẹ', 'đm', 'đmm', 'đcm', 'đcmm', 'dm', 'dmm',
  'dcm', 'dcmm', 'đkm', 'dkm', 'vcl', 'vkl', 'vl', 'clgt', 'cmm', 'cc', 'loz',
  'fuck', 'fucking', 'fucker', 'motherfucker', 'shit', 'bitch', 'cunt', 'dick', 'pussy', 'asshole',
];
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const BAD_RE = new RegExp(
  `(?<![\\p{L}\\p{N}])(${[...BAD_WORDS].sort((a, b) => b.length - a.length).map(esc).join('|')})(?![\\p{L}\\p{N}])`,
  'giu',
);
const URL_TEST = /(?:https?:\/\/|www\.)\S+|[\p{L}\p{N}-]+\.(?:com|net|org|vn|io|xyz|info|top|me|link|shop|store|club|online|site|live|tv|cc|ly)\b/iu;
const URL_RE = new RegExp(URL_TEST.source, 'giu');
const PHONE_RE = /(?<!\d)(?:\+?84|0)(?:[\s.-]?\d){8,10}(?!\d)/g;
// eslint-disable-next-line no-control-regex
const CONTROL_RE = /[\u0000-\u0008\u000B-\u001F\u007F​-‏‪-‮⁦-⁩]/g;

export function maskProfanity(text: string) {
  let hit = false;
  const out = text.replace(BAD_RE, (m) => {
    hit = true;
    return '*'.repeat([...m].length);
  });
  return { text: out, hit };
}

export function cleanName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const name = [...raw.normalize('NFC').replace(CONTROL_RE, '').replace(/\s+/g, ' ').trim()].slice(0, 20).join('');
  if (!name || maskProfanity(name).hit || URL_TEST.test(name)) return null;
  return name;
}

/** Giới hạn tần suất: cách nhau ≥1,2s, tối đa 5 tin/15s, không lặp tin vừa gửi trong 30s. */
export class ChatLimiter {
  private byUser = new Map<string, { times: number[]; last: string; lastAt: number }>();
  check(userId: string, text: string, now = Date.now()): string | null {
    const s = this.byUser.get(userId) ?? { times: [], last: '', lastAt: 0 };
    s.times = s.times.filter((t) => now - t < 15_000);
    if (s.times.length && now - s.times[s.times.length - 1] < 1200) return 'Xin chậm lại một chút.';
    if (s.times.length >= 5) return 'Bạn gửi hơi nhiều tin, xin đợi giây lát.';
    if (text === s.last && now - s.lastAt < 30_000) return 'Tin nhắn này vừa được gửi.';
    s.times.push(now);
    s.last = text;
    s.lastAt = now;
    this.byUser.set(userId, s);
    return null;
  }
  forget(userId: string) {
    this.byUser.delete(userId);
  }
}

export function cleanChat(raw: unknown, max = 200): string {
  if (typeof raw !== 'string') return '';
  let text = [...raw.normalize('NFC').replace(CONTROL_RE, '').replace(/\s+/g, ' ').trim()].slice(0, max).join('');
  text = text.replace(URL_RE, '[liên kết đã ẩn]').replace(PHONE_RE, '[số điện thoại đã ẩn]');
  return maskProfanity(text).text;
}
