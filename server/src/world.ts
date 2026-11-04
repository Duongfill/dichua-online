// Kênh (channel) & người chơi. Mỗi kênh ≤ 50 người; chánh điện mỗi kênh ≤ 20 người.
import { randomUUID } from 'node:crypto';
import {
  CHANNEL_CAPACITY, HALL_CAPACITY, MOVE_SPEED, SCENES, collide,
  type Anim, type Appearance, type ChatMsg, type PlayerInfo, type PlayerTuple, type SceneId, type Wallet,
} from '@chua/shared';
import type { Profile } from './profiles';
import { ChessTable } from './chess';

export interface ServerPlayer extends PlayerInfo {
  socketId: string;
  channel: number;
  x: number;
  z: number;
  ry: number;
  anim: Anim;
  lastMoveAt: number;
  moveCount: number; // chống spam gói move
  moveWindowAt: number;
  wallet: Wallet; // trỏ tới profile.wallet
  profile: Profile;
  busyUntil: number; // đang làm nghi thức → bỏ qua gói di chuyển
  seat: number | null; // đang ngồi bồ đoàn số mấy (chánh điện)
}

export class Channel {
  players = new Map<string, ServerPlayer>();
  dirty: Record<SceneId, boolean> = { courtyard: true, hall: true };
  lastSent: Record<SceneId, number> = { courtyard: 0, hall: 0 };
  history: Record<SceneId, ChatMsg[]> = { courtyard: [], hall: [] };
  bellBusyUntil: Record<SceneId, number> = { courtyard: 0, hall: 0 }; // chuông đang ngân
  seats: (string | null)[] = Array(HALL_CAPACITY).fill(null); // 20 bồ đoàn trong chánh điện
  chess = new ChessTable(); // bàn cờ tướng ở sân chùa
  lastAnnounce = 0; // giới hạn banner hành động
  private seq = 0;
  constructor(public id: number) {}

  /** Lưu tin vào lịch sử khu vực (30 tin gần nhất) và trả về tin đầy đủ. */
  pushChat(scene: SceneId, m: Omit<ChatMsg, 'id' | 'ts'>): ChatMsg {
    const msg: ChatMsg = { id: `${this.id}-${(this.seq++).toString(36)}`, ts: Date.now(), ...m };
    const h = this.history[scene];
    h.push(msg);
    if (h.length > 30) h.shift();
    return msg;
  }

  count(scene?: SceneId) {
    if (!scene) return this.players.size;
    let n = 0;
    for (const p of this.players.values()) if (p.scene === scene) n++;
    return n;
  }

  list(scene: SceneId): PlayerInfo[] {
    return [...this.players.values()].filter((p) => p.scene === scene).map(publicInfo);
  }

  tuples(scene: SceneId): PlayerTuple[] {
    const out: PlayerTuple[] = [];
    for (const p of this.players.values()) {
      if (p.scene === scene) out.push([p.id, round(p.x), round(p.z), round(p.ry), p.anim]);
    }
    return out;
  }
}

const round = (v: number) => Math.round(v * 100) / 100;

export const publicInfo = (p: ServerPlayer): PlayerInfo => ({
  id: p.id,
  name: p.name,
  level: p.level,
  appearance: p.appearance,
  scene: p.scene,
});

export const roomOf = (ch: number, scene: SceneId) => `ch:${ch}:${scene}`;

export class World {
  channels = new Map<number, Channel>();

  online() {
    let n = 0;
    for (const c of this.channels.values()) n += c.players.size;
    return n;
  }

  /** Kênh còn chỗ có số nhỏ nhất; đầy hết thì mở kênh mới. */
  pickChannel(preferred?: number): Channel {
    if (preferred) {
      const c = this.channels.get(preferred);
      if (c && c.players.size < CHANNEL_CAPACITY) return c;
    }
    const sorted = [...this.channels.values()].sort((a, b) => a.id - b.id);
    for (const c of sorted) if (c.players.size < CHANNEL_CAPACITY) return c;
    let id = 1;
    while (this.channels.has(id)) id++;
    const c = new Channel(id);
    this.channels.set(id, c);
    console.log(`[world] mở kênh ${id}`);
    return c;
  }

  addPlayer(ch: Channel, profile: Profile, opts: { socketId: string; name: string; appearance: Appearance; scene: SceneId; x: number; z: number; ry: number }) {
    const p: ServerPlayer = {
      id: randomUUID().slice(0, 8),
      level: profile.level,
      profile,
      wallet: profile.wallet,
      busyUntil: 0,
      seat: null,
      anim: 0,
      lastMoveAt: Date.now(),
      moveCount: 0,
      moveWindowAt: Date.now(),
      channel: ch.id,
      ...opts,
    };
    ch.players.set(p.id, p);
    ch.dirty[p.scene] = true;
    return p;
  }

  removePlayer(p: ServerPlayer) {
    const ch = this.channels.get(p.channel);
    if (!ch) return;
    ch.players.delete(p.id);
    ch.dirty[p.scene] = true;
    this.freeSeat(p);
    // giữ kênh 1 luôn tồn tại; kênh khác trống thì đóng
    if (ch.id !== 1 && ch.players.size === 0) {
      this.channels.delete(ch.id);
      console.log(`[world] đóng kênh ${ch.id}`);
    }
  }

  /** Đứng dậy khỏi bồ đoàn (nếu đang ngồi). Trả true nếu có thay đổi. */
  freeSeat(p: ServerPlayer) {
    if (p.seat === null) return false;
    const ch = this.channels.get(p.channel);
    if (ch && ch.seats[p.seat] === p.id) ch.seats[p.seat] = null;
    p.seat = null;
    if (p.anim === 2) p.anim = 0;
    return true;
  }

  hallFull(ch: Channel) {
    return ch.count('hall') >= HALL_CAPACITY;
  }

  /** Nhận vị trí từ client: giới hạn tốc độ + va chạm (client vẫn tự dự đoán để mượt). */
  applyMove(p: ServerPlayer, x: number, z: number, ry: number, anim: Anim) {
    const now = Date.now();
    const dt = Math.min(1, (now - p.lastMoveAt) / 1000);
    p.lastMoveAt = now;
    const maxStep = MOVE_SPEED * dt * 1.6 + 0.4; // dung sai cho mạng giật
    let dx = x - p.x;
    let dz = z - p.z;
    const d = Math.hypot(dx, dz);
    if (d > maxStep) {
      dx = (dx / d) * maxStep;
      dz = (dz / d) * maxStep;
    }
    const c = collide(p.scene, p.x + dx, p.z + dz);
    p.x = c.x;
    p.z = c.z;
    p.ry = ry;
    p.anim = anim;
    const ch = this.channels.get(p.channel);
    if (ch) ch.dirty[p.scene] = true;
  }

  spawnOf(scene: SceneId) {
    const s = SCENES[scene].spawn;
    // rải nhẹ để người mới vào không chồng lên nhau
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * 1.2;
    const c = collide(scene, s.x + Math.cos(a) * r, s.z + Math.sin(a) * r);
    return { x: c.x, z: c.z, ry: s.ry };
  }
}
