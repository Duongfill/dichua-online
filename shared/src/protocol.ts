import type { ActEvent, ActRes, ActionId } from './actions';
import type { ChessState, Side } from './xiangqi';
import type { MediaItem, StreamOp, StreamState } from './stream';

// Giao thức client <-> server (Socket.IO). Giữ gọn để gửi 15 lần/giây.

export const TICK_HZ = 15;
export const MOVE_SPEED = 4.2; // m/s
export const CHANNEL_CAPACITY = 50;
export const HALL_CAPACITY = 20;

export type SceneId = 'courtyard' | 'hall';
export const SCENE_NAMES: Record<SceneId, string> = { courtyard: 'Sân chùa', hall: 'Chánh điện' };

/** 0 = đứng yên, 1 = đi bộ, 2 = ngồi bồ đoàn */
export type Anim = 0 | 1 | 2;

export interface Appearance {
  hair: number; // chỉ số trong HAIR_STYLES
  hairColor: number; // chỉ số trong HAIR_COLORS
  robe: number; // chỉ số trong ROBE_COLORS
}

export const HAIR_STYLES = ['Trọc', 'Tóc ngắn', 'Búi tó', 'Tóc dài'] as const;
export const HAIR_COLORS = ['#2b2118', '#5b3a22', '#8d8d8d', '#c49a62'] as const;
export const ROBE_COLORS = [
  { name: 'Nâu', value: '#8b5a3c' },
  { name: 'Xám', value: '#8a8d90' },
  { name: 'Lam', value: '#5d7d99' },
  { name: 'Lục', value: '#6f8f6a' },
  { name: 'Vàng', value: '#d4a146' },
  { name: 'Trắng', value: '#ece5d8' },
] as const;

export const DEFAULT_APPEARANCE: Appearance = { hair: 1, hairColor: 0, robe: 0 };

export function sanitizeAppearance(a: Partial<Appearance> | undefined): Appearance {
  const pick = (v: unknown, n: number, d: number) => (Number.isInteger(v) && (v as number) >= 0 && (v as number) < n ? (v as number) : d);
  return {
    hair: pick(a?.hair, HAIR_STYLES.length, DEFAULT_APPEARANCE.hair),
    hairColor: pick(a?.hairColor, HAIR_COLORS.length, DEFAULT_APPEARANCE.hairColor),
    robe: pick(a?.robe, ROBE_COLORS.length, DEFAULT_APPEARANCE.robe),
  };
}

export interface PlayerInfo {
  id: string;
  name: string;
  level: number;
  appearance: Appearance;
  scene: SceneId;
}

export interface Pose {
  x: number;
  z: number;
  ry: number;
}

/** [id, x, z, ry, anim] – mảng thay vì object để snapshot nhỏ */
export type PlayerTuple = [string, number, number, number, Anim];
/** client gửi lên: [x, z, ry, anim] */
export type MoveTuple = [number, number, number, Anim];

export interface Snapshot {
  t: number; // giờ server (ms)
  p: PlayerTuple[];
}

// ---------- Chat (giai đoạn 2) ----------
export const QUICK_CHATS = ['A Di Đà Phật', 'Chào mọi người', 'Tùy hỷ', 'Bình an nhé'] as const;
export const CHAT_MAX = 160;

export interface ChatMsg {
  id: string;
  kind: 'chat' | 'quick' | 'system';
  pid?: string; // người gửi
  name?: string;
  text: string;
  ts: number;
}
export type ChatReq = { text?: string; quick?: number };
export type Ack = { ok: true } | { ok: false; error: string };

export interface Announce {
  text: string;
  kind: 'info' | 'event';
}

/** Ví & tiến độ – giai đoạn 3/6 sẽ cộng điểm và lưu DB; hiện để trong RAM. */
export interface Wallet {
  merit: number; // điểm công đức
  jade: number; // ngọc
  exp: number;
  expNext: number;
  title: string;
}

export interface HelloReq {
  name: string;
  appearance: Appearance;
  /** mã ngẫu nhiên lưu ở trình duyệt – giữ công đức/cấp khi tải lại trang (tới khi có đăng nhập ở GĐ6) */
  token?: string;
  /** khi kết nối lại: thử về đúng chỗ cũ */
  resume?: { scene: SceneId; x: number; z: number; ry: number; channel: number };
}

export type HelloRes =
  | { ok: true; self: PlayerInfo & Pose; wallet: Wallet; admin: boolean; channel: number; players: PlayerInfo[]; history: ChatMsg[]; serverTime: number }
  | { ok: false; error: string };

export type SceneRes =
  | { ok: true; scene: SceneId; pose: Pose; players: PlayerInfo[]; history: ChatMsg[] }
  | { ok: false; error: string };

// ---------- Bồ đoàn & voice (giai đoạn 4) ----------
export type SeatsState = (string | null)[]; // id người ngồi ở từng bồ đoàn
export type SitRes = { ok: true; pose: Pose } | { ok: false; error: string };
export type VoiceTokenRes =
  | { ok: true; url: string; token: string; room: string }
  | { ok: false; error: string; disabled?: boolean };

export interface Stats {
  online: number; // toàn server
  channel: number;
  channelOnline: number;
  hallCount: number;
  channels: number;
}

export interface ServerToClient {
  snapshot: (s: Snapshot) => void;
  'player:join': (p: PlayerInfo) => void;
  'player:leave': (p: { id: string }) => void;
  stats: (s: Stats) => void;
  chat: (m: ChatMsg) => void;
  announce: (a: Announce) => void;
  act: (e: ActEvent) => void;
  'player:update': (p: { id: string; level: number }) => void;
  seats: (s: SeatsState) => void;
  chess: (s: ChessState) => void;
  'stream:lib': (items: MediaItem[]) => void;
  'stream:state': (s: StreamState & { serverNow: number }) => void;
}

export interface ClientToServer {
  hello: (req: HelloReq, ack: (res: HelloRes) => void) => void;
  move: (m: MoveTuple) => void;
  'chat:send': (req: ChatReq, ack: (res: Ack) => void) => void;
  act: (req: { action: ActionId }, ack: (res: ActRes) => void) => void;
  'seat:sit': (req: { index: number }, ack: (res: SitRes) => void) => void;
  'seat:stand': (ack: (res: Ack) => void) => void;
  'voice:token': (ack: (res: VoiceTokenRes) => void) => void;
  'chess:sit': (req: { side: Side }, ack: (res: SitRes) => void) => void;
  'chess:leave': (ack: (res: Ack) => void) => void;
  'chess:move': (req: { from: number; to: number }, ack: (res: Ack) => void) => void;
  'chess:resign': (ack: (res: Ack) => void) => void;
  'chess:rematch': (ack: (res: Ack) => void) => void;
  'stream:admin': (req: { password: string }, ack: (res: Ack) => void) => void;
  'stream:ctl': (req: StreamOp, ack: (res: Ack) => void) => void;
  'stream:report': (req: { id: string }, ack: (res: Ack) => void) => void;
  'stream:youtube': (req: { url: string }, ack: (res: Ack & { pending?: boolean }) => void) => void;
  'stream:ytDuration': (req: { id: string; duration: number }) => void;
  'scene:change': (req: { scene: SceneId }, ack: (res: SceneRes) => void) => void;
}
