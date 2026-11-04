import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import express from 'express';
import { Server } from 'socket.io';
import {
  ACTION_DEFS, CHAT_MAX, CHESS_SEATS, COURTYARD, HALL_SEATS, QUICK_CHATS, SCENE_NAMES, SEAT_RY, TICK_HZ, collide, interactionsAt, sanitizeAppearance,
  type ActionId, type ChatMsg, type Side, type ClientToServer, type SceneId, type ServerToClient, type Stats,
} from '@chua/shared';
import { getProfile, grant } from './profiles';
import { config, voiceEnabled } from './config';
import { voiceToken } from './voice';
import { StreamService } from './stream';
import { timingSafeEqual } from 'node:crypto';
import { ChatLimiter, cleanChat, cleanName } from './moderation';
import { World, publicInfo, roomOf, type ServerPlayer } from './world';

const app = express();
app.disable('x-powered-by');
const server = http.createServer(app);
const io = new Server<ClientToServer, ServerToClient, Record<string, never>, { player?: ServerPlayer }>(server, {
  cors: config.corsOrigin ? { origin: config.corsOrigin.split(',') } : undefined,
  maxHttpBufferSize: 32 * 1024,
  pingInterval: 10_000,
  pingTimeout: 10_000,
});

const world = new World();
world.pickChannel(); // kênh 1 luôn có sẵn

const stream = new StreamService(
  config.mediaDir,
  () => io.emit('stream:lib', stream.list()),
  () => io.emit('stream:state', { ...stream.state, serverNow: Date.now() }),
);
app.use('/media', express.static(config.mediaDir, { maxAge: '7d', index: false }));
app.post('/api/media/upload', (req, res) => {
  // xác thực: socket của người chơi đang ở trong chùa
  const sock = io.sockets.sockets.get(String(req.header('x-socket-id') || ''));
  const p = sock?.data.player;
  if (!p) return res.status(401).json({ ok: false, error: 'Hãy vào chùa trước khi tải lên.' });
  stream.handleUpload(req, res, { id: p.profile.key, name: p.name, admin: !!p.profile.admin });
});

app.get('/healthz', (_req, res) => res.json({ ok: true, online: world.online(), channels: world.channels.size }));
if (fs.existsSync(config.clientDist)) {
  app.use(express.static(config.clientDist, { maxAge: '1h', index: false }));
  app.get('*', (_req, res) => res.sendFile(path.join(config.clientDist, 'index.html')));
}

const limiter = new ChatLimiter();

/** Gửi tin vào khu vực (kênh + scene) và lưu lịch sử. */
function areaChat(chId: number, scene: SceneId, m: Omit<ChatMsg, 'id' | 'ts'>) {
  const ch = world.channels.get(chId);
  if (!ch) return;
  io.to(roomOf(chId, scene)).emit('chat', ch.pushChat(scene, m));
}
const system = (chId: number, scene: SceneId, text: string) => areaChat(chId, scene, { kind: 'system', text });

const sendChess = (chId: number) => {
  const ch = world.channels.get(chId);
  if (ch) io.to(roomOf(chId, 'courtyard')).emit('chess', ch.chess.state);
};
/** Rời bàn cờ (nếu đang ngồi). Giữa ván → thua; báo cho cả sân. */
function leaveChess(p: ServerPlayer) {
  const ch = world.channels.get(p.channel);
  if (!ch || !ch.chess.seatOf(p.id)) return;
  const msg = ch.chess.leave(p.id);
  if (p.anim === 2 && p.seat === null) p.anim = 0;
  ch.dirty.courtyard = true;
  if (msg) {
    system(ch.id, 'courtyard', msg);
    io.to(`ch:${ch.id}`).emit('announce', { kind: 'event', text: msg });
  }
  sendChess(ch.id);
}

const isScene = (s: unknown): s is SceneId => s === 'courtyard' || s === 'hall';
const finite = (...v: unknown[]) => v.every((n) => typeof n === 'number' && Number.isFinite(n));

io.on('connection', (socket) => {
  socket.emit('stream:lib', stream.list());
  socket.emit('stream:state', { ...stream.state, serverNow: Date.now() });
  socket.on('hello', (req, ack) => {
    if (typeof ack !== 'function') return;
    if (socket.data.player) return ack({ ok: false, error: 'Bạn đã ở trong chùa.' });
    const name = cleanName(req?.name);
    if (!name) return ack({ ok: false, error: 'Tên hiển thị không hợp lệ (1–20 ký tự, lời lẽ trang nghiêm).' });
    const appearance = sanitizeAppearance(req?.appearance);

    // Kết nối lại: cố về đúng kênh, khu vực, vị trí cũ
    const r = req?.resume;
    const ch = world.pickChannel(r && Number.isInteger(r.channel) ? r.channel : undefined);
    let scene: SceneId = 'courtyard';
    let pose = world.spawnOf('courtyard');
    if (r && isScene(r.scene) && finite(r.x, r.z, r.ry) && ch.id === r.channel) {
      if (r.scene === 'courtyard' || !world.hallFull(ch)) {
        scene = r.scene;
        const c = collide(scene, r.x, r.z);
        pose = { x: c.x, z: c.z, ry: r.ry };
      }
    }

    const p = world.addPlayer(ch, getProfile(req?.token), { socketId: socket.id, name, appearance, scene, ...pose });
    socket.data.player = p;
    socket.join([`ch:${ch.id}`, roomOf(ch.id, scene)]);
    socket.to(roomOf(ch.id, scene)).emit('player:join', publicInfo(p));
    if (!r) {
      system(ch.id, scene, `${name} đã đến ${SCENE_NAMES[scene].toLowerCase()}`);
      socket.to(`ch:${ch.id}`).emit('announce', { kind: 'info', text: `🙏 ${name} vừa đến chùa` });
    }
    ack({
      ok: true,
      self: { ...publicInfo(p), ...pose },
      wallet: p.wallet,
      admin: !!p.profile.admin,
      channel: ch.id,
      players: ch.list(scene),
      history: ch.history[scene],
      serverTime: Date.now(),
    });
    if (scene === 'hall') socket.emit('seats', ch.seats);
    else socket.emit('chess', ch.chess.state);
    sendStats(ch.id);
    console.log(`[join] ${name} → kênh ${ch.id}/${scene}. Online ${world.online()}`);
  });

  socket.on('move', (m) => {
    const p = socket.data.player;
    if (!p || !Array.isArray(m) || !finite(m[0], m[1], m[2])) return;
    // tối đa ~30 gói/giây
    const now = Date.now();
    if (now - p.moveWindowAt > 1000) {
      p.moveWindowAt = now;
      p.moveCount = 0;
    }
    if (++p.moveCount > 30) return;
    if (now < p.busyUntil) return; // đang lạy / thắp hương… thì đứng yên
    if (p.seat !== null) return; // đang ngồi bồ đoàn → phải đứng dậy trước
    if (p.scene === 'courtyard' && world.channels.get(p.channel)?.chess.seatOf(p.id)) return; // đang ngồi bàn cờ
    world.applyMove(p, m[0], m[1], m[2], m[3] === 1 ? 1 : 0);
  });

  socket.on('scene:change', (req, ack) => {
    const p = socket.data.player;
    if (typeof ack !== 'function') return;
    if (!p) return ack({ ok: false, error: 'Bạn chưa vào chùa.' });
    const to = req?.scene;
    if (!isScene(to) || to === p.scene) return ack({ ok: false, error: 'Khu vực không hợp lệ.' });
    const ch = world.channels.get(p.channel)!;
    if (to === 'hall' && world.hallFull(ch)) return ack({ ok: false, error: 'Chánh điện kênh này đã đủ 20 người. Xin đợi giây lát.' });

    const from = p.scene;
    if (from === 'courtyard') leaveChess(p);
    if (world.freeSeat(p)) io.to(roomOf(ch.id, from)).emit('seats', ch.seats);
    socket.to(roomOf(ch.id, from)).emit('player:leave', { id: p.id });
    socket.leave(roomOf(ch.id, from));
    ch.dirty[from] = true;

    p.scene = to;
    const pose = world.spawnOf(to);
    Object.assign(p, pose, { anim: 0, lastMoveAt: Date.now() });
    socket.join(roomOf(ch.id, to));
    socket.to(roomOf(ch.id, to)).emit('player:join', publicInfo(p));
    ch.dirty[to] = true;
    system(ch.id, from, to === 'hall' ? `${p.name} đã vào chánh điện` : `${p.name} đã ra sân chùa`);
    system(ch.id, to, to === 'hall' ? `${p.name} đã vào chánh điện` : `${p.name} đã ra sân chùa`);
    ack({ ok: true, scene: to, pose, players: ch.list(to), history: ch.history[to] });
    if (to === 'hall') socket.emit('seats', ch.seats);
    else socket.emit('chess', ch.chess.state);
    sendStats(ch.id);
  });

  // ---------- Hành động tương tác (giai đoạn 3) ----------
  socket.on('act', (req, ack) => {
    if (typeof ack !== 'function') return;
    const p = socket.data.player;
    if (!p) return ack({ ok: false, error: 'Bạn chưa vào chùa.' });
    const action = req?.action as ActionId;
    const def = ACTION_DEFS[action];
    if (!def) return ack({ ok: false, error: 'Hành động không hợp lệ.' });
    const ch = world.channels.get(p.channel)!;
    const now = Date.now();
    if (now < p.busyUntil) return ack({ ok: false, error: 'Bạn đang thực hiện một nghi thức, xin chờ giây lát.', retryMs: p.busyUntil - now });
    const until = p.profile.cooldowns[action] ?? 0;
    if (now < until) {
      return ack({ ok: false, error: `Có thể ${def.label.toLowerCase()} lại sau ${Math.ceil((until - now) / 1000)} giây.`, retryMs: until - now });
    }
    // phải đứng đúng chỗ (server tự kiểm tra theo vị trí nó biết, dung sai 1m)
    const spot = interactionsAt(p.scene, p.x, p.z, 1).find((i) => i.action === action);
    if (!spot) return ack({ ok: false, error: `Hãy đến ${def.where} để ${def.label.toLowerCase()}.` });
    if (action === 'bell') {
      if (now < ch.bellBusyUntil[p.scene]) return ack({ ok: false, error: 'Chuông đang ngân, xin đợi giây lát.', retryMs: ch.bellBusyUntil[p.scene] - now });
      ch.bellBusyUntil[p.scene] = now + 3500;
    }

    p.busyUntil = now + def.durationMs;
    p.profile.cooldowns[action] = now + def.cooldownMs;
    const ry = Math.atan2(spot.fx - p.x, spot.fz - p.z);
    Object.assign(p, { ry: p.seat !== null ? SEAT_RY : ry, anim: p.seat !== null ? 2 : 0 });
    ch.dirty[p.scene] = true;
    const levelUp = grant(p.profile, def.merit, def.exp);
    p.level = p.profile.level;

    io.to(roomOf(ch.id, p.scene)).emit('act', {
      pid: p.id, action, x: p.x, z: p.z, ry: p.ry, t: now, seed: Math.floor(Math.random() * 1e9),
    });
    ack({ ok: true, gained: { merit: def.merit, exp: def.exp }, wallet: p.wallet, level: p.level, levelUp, cooldownMs: def.cooldownMs });

    if (now - ch.lastAnnounce > 8000) {
      ch.lastAnnounce = now;
      socket.to(`ch:${ch.id}`).emit('announce', { kind: 'event', text: def.announce.replace('{name}', p.name) });
    }
    if (levelUp) {
      io.to(roomOf(ch.id, p.scene)).emit('player:update', { id: p.id, level: p.level });
      io.to(`ch:${ch.id}`).emit('announce', { kind: 'event', text: `✨ ${p.name} đã lên cấp ${p.level} – ${p.wallet.title}` });
    }
  });

  // ---------- Bồ đoàn (giai đoạn 4) ----------
  socket.on('seat:sit', (req, ack) => {
    if (typeof ack !== 'function') return;
    const p = socket.data.player;
    if (!p) return ack({ ok: false, error: 'Bạn chưa vào chùa.' });
    if (p.scene !== 'hall') return ack({ ok: false, error: 'Bồ đoàn ở trong chánh điện.' });
    const i = req?.index;
    if (!Number.isInteger(i) || i < 0 || i >= HALL_SEATS.length) return ack({ ok: false, error: 'Bồ đoàn không hợp lệ.' });
    const ch = world.channels.get(p.channel)!;
    if (Date.now() < p.busyUntil) return ack({ ok: false, error: 'Xin chờ nghi thức xong.' });
    if (ch.seats[i] && ch.seats[i] !== p.id) return ack({ ok: false, error: 'Bồ đoàn này đã có người ngồi.' });
    const s = HALL_SEATS[i];
    if (Math.hypot(p.x - s.x, p.z - s.z) > 1.6) return ack({ ok: false, error: 'Hãy đến gần bồ đoàn hơn.' });
    world.freeSeat(p);
    ch.seats[i] = p.id;
    Object.assign(p, { seat: i, x: s.x, z: s.z, ry: SEAT_RY, anim: 2 });
    ch.dirty.hall = true;
    io.to(roomOf(ch.id, 'hall')).emit('seats', ch.seats);
    ack({ ok: true, pose: { x: s.x, z: s.z, ry: SEAT_RY } });
  });

  socket.on('seat:stand', (ack) => {
    const p = socket.data.player;
    if (p && world.freeSeat(p)) {
      const ch = world.channels.get(p.channel)!;
      ch.dirty.hall = true;
      p.lastMoveAt = Date.now();
      io.to(roomOf(ch.id, 'hall')).emit('seats', ch.seats);
    }
    if (typeof ack === 'function') ack({ ok: true });
  });

  // ---------- Voice: token LiveKit cho đúng phòng khu vực hiện tại ----------
  socket.on('voice:token', async (ack) => {
    if (typeof ack !== 'function') return;
    const p = socket.data.player;
    if (!p) return ack({ ok: false, error: 'Bạn chưa vào chùa.' });
    if (!voiceEnabled()) {
      return ack({ ok: false, disabled: true, error: 'Máy chủ chưa bật trò chuyện bằng giọng nói (thiếu cấu hình LiveKit).' });
    }
    try {
      const t = await voiceToken(p);
      ack(t ? { ok: true, ...t } : { ok: false, error: 'Không tạo được phiên voice.' });
    } catch (err) {
      console.error('[voice] token', err);
      ack({ ok: false, error: 'Không tạo được phiên voice.' });
    }
  });

  // ---------- Cờ tướng ở sân chùa ----------
  socket.on('chess:sit', (req, ack) => {
    if (typeof ack !== 'function') return;
    const p = socket.data.player;
    if (!p) return ack({ ok: false, error: 'Bạn chưa vào chùa.' });
    if (p.scene !== 'courtyard') return ack({ ok: false, error: 'Bàn cờ ở ngoài sân chùa.' });
    const side = req?.side as Side;
    if (side !== 'r' && side !== 'b') return ack({ ok: false, error: 'Chọn quân Đỏ hoặc Đen.' });
    if (Date.now() < p.busyUntil) return ack({ ok: false, error: 'Xin chờ nghi thức xong.' });
    if (Math.hypot(p.x - COURTYARD.chess.x, p.z - COURTYARD.chess.z) > 3.2) return ack({ ok: false, error: 'Hãy lại gần bàn cờ hơn.' });
    const ch = world.channels.get(p.channel)!;
    const err = ch.chess.sit(p.id, p.name, side);
    if (err) return ack({ ok: false, error: err });
    const s = CHESS_SEATS[side];
    Object.assign(p, { x: s.x, z: s.z, ry: s.ry, anim: 2 });
    ch.dirty.courtyard = true;
    if (ch.chess.state.status === 'playing' && ch.chess.state.moveNo === 0) {
      system(ch.id, 'courtyard', `♟ Ván cờ mới: ${ch.chess.state.red?.name} (Đỏ) – ${ch.chess.state.black?.name} (Đen)`);
    }
    sendChess(ch.id);
    ack({ ok: true, pose: { x: s.x, z: s.z, ry: s.ry } });
  });

  socket.on('chess:leave', (ack) => {
    const p = socket.data.player;
    if (p) leaveChess(p);
    if (typeof ack === 'function') ack({ ok: true });
  });

  socket.on('chess:move', (req, ack) => {
    if (typeof ack !== 'function') return;
    const p = socket.data.player;
    if (!p) return ack({ ok: false, error: 'Bạn chưa vào chùa.' });
    const ch = world.channels.get(p.channel)!;
    const r = ch.chess.move(p.id, req?.from, req?.to);
    if (r.error) return ack({ ok: false, error: r.error });
    sendChess(ch.id);
    if (r.ended) {
      system(ch.id, 'courtyard', r.ended);
      io.to(`ch:${ch.id}`).emit('announce', { kind: 'event', text: r.ended });
    }
    ack({ ok: true });
  });

  socket.on('chess:resign', (ack) => {
    const p = socket.data.player;
    const ch = p && world.channels.get(p.channel);
    const msg = ch ? ch.chess.resign(p.id) : null;
    if (ch && msg) {
      system(ch.id, 'courtyard', msg);
      io.to(`ch:${ch.id}`).emit('announce', { kind: 'event', text: msg });
      sendChess(ch.id);
    }
    if (typeof ack === 'function') ack(msg ? { ok: true } : { ok: false, error: 'Không có ván cờ nào để xin thua.' });
  });

  socket.on('chess:rematch', (ack) => {
    const p = socket.data.player;
    const ch = p && world.channels.get(p.channel);
    if (!p || !ch) return typeof ack === 'function' && ack({ ok: false, error: 'Bạn chưa vào chùa.' });
    const err = ch.chess.rematch(p.id);
    if (!err && ch.chess.state.status === 'playing') {
      system(ch.id, 'courtyard', `♟ Ván cờ mới: ${ch.chess.state.red?.name} (Đỏ) – ${ch.chess.state.black?.name} (Đen)`);
    }
    sendChess(ch.id);
    if (typeof ack === 'function') ack(err ? { ok: false, error: err } : { ok: true });
  });

  // ---------- Phát chung ----------
  socket.on('stream:admin', (req, ack) => {
    if (typeof ack !== 'function') return;
    const p = socket.data.player;
    if (!p) return ack({ ok: false, error: 'Bạn chưa vào chùa.' });
    if (!config.adminPassword) return ack({ ok: false, error: 'Máy chủ chưa đặt ADMIN_PASSWORD.' });
    const a = Buffer.from(String(req?.password ?? ''));
    const b = Buffer.from(config.adminPassword);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return ack({ ok: false, error: 'Sai mật khẩu.' });
    p.profile.admin = true;
    console.log(`[admin] ${p.name} đăng nhập quyền Điều phối`);
    ack({ ok: true });
  });

  socket.on('stream:ctl', (req, ack) => {
    if (typeof ack !== 'function') return;
    const p = socket.data.player;
    if (!p?.profile.admin) return ack({ ok: false, error: 'Chỉ Admin/Điều phối mới điều khiển được.' });
    const err = stream.control(req);
    ack(err ? { ok: false, error: err } : { ok: true });
  });

  socket.on('stream:youtube', async (req, ack) => {
    if (typeof ack !== 'function') return;
    const p = socket.data.player;
    if (!p) return ack({ ok: false, error: 'Bạn chưa vào chùa.' });
    const r = await stream.addYoutube(String(req?.url ?? '').slice(0, 300), { id: p.profile.key, name: p.name, admin: !!p.profile.admin });
    ack(r.error ? { ok: false, error: r.error } : { ok: true, pending: r.pending });
  });

  socket.on('stream:ytDuration', (req) => {
    if (socket.data.player) stream.setDuration(String(req?.id ?? ''), Number(req?.duration));
  });

  socket.on('stream:report', (req, ack) => {
    if (typeof ack !== 'function') return;
    const p = socket.data.player;
    if (!p) return ack({ ok: false, error: 'Bạn chưa vào chùa.' });
    const err = stream.report(String(req?.id ?? ''), p.profile.key);
    console.log(`[report] ${p.name} báo cáo nội dung ${req?.id}`);
    ack(err ? { ok: false, error: err } : { ok: true });
  });

  socket.on('chat:send', (req, ack) => {
    if (typeof ack !== 'function') return;
    const p = socket.data.player;
    if (!p) return ack({ ok: false, error: 'Bạn chưa vào chùa.' });
    let text: string;
    let kind: ChatMsg['kind'] = 'chat';
    if (Number.isInteger(req?.quick) && req.quick! >= 0 && req.quick! < QUICK_CHATS.length) {
      text = QUICK_CHATS[req.quick!];
      kind = 'quick';
    } else {
      text = cleanChat(req?.text, CHAT_MAX);
      if (!text) return ack({ ok: false, error: 'Tin nhắn trống.' });
    }
    const err = limiter.check(p.id, text);
    if (err) return ack({ ok: false, error: err });
    areaChat(p.channel, p.scene, { kind, pid: p.id, name: p.name, text });
    ack({ ok: true });
  });

  socket.on('disconnect', () => {
    const p = socket.data.player;
    if (!p) return;
    io.to(roomOf(p.channel, p.scene)).emit('player:leave', { id: p.id });
    system(p.channel, p.scene, `${p.name} đã rời chùa`);
    leaveChess(p);
    limiter.forget(p.id);
    const wasSeated = p.seat !== null;
    world.removePlayer(p);
    const chLeft = world.channels.get(p.channel);
    if (wasSeated && chLeft) io.to(roomOf(p.channel, 'hall')).emit('seats', chLeft.seats);
    sendStats(p.channel);
    console.log(`[leave] ${p.name}. Online ${world.online()}`);
  });
});

// ---------- Vòng lặp mạng: gửi snapshot theo từng khu vực của từng kênh ----------
setInterval(() => {
  const t = Date.now();
  for (const ch of world.channels.values()) {
    for (const scene of ['courtyard', 'hall'] as SceneId[]) {
      // có người di chuyển → gửi ngay; đứng yên → nhắc lại mỗi giây
      if (!ch.dirty[scene] && t - ch.lastSent[scene] < 1000) continue;
      const p = ch.tuples(scene);
      ch.dirty[scene] = false;
      ch.lastSent[scene] = t;
      if (p.length) io.to(roomOf(ch.id, scene)).volatile.emit('snapshot', { t, p });
    }
  }
}, 1000 / TICK_HZ);

function statsFor(chId: number): Stats {
  const ch = world.channels.get(chId);
  return {
    online: world.online(),
    channel: chId,
    channelOnline: ch?.count() ?? 0,
    hallCount: ch?.count('hall') ?? 0,
    channels: world.channels.size,
  };
}
const sendStats = (chId: number) => io.to(`ch:${chId}`).emit('stats', statsFor(chId));
setInterval(() => world.channels.forEach((c) => sendStats(c.id)), 5000);

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(
      `\n✖ Cổng ${config.port} đang bị chương trình khác dùng (có thể là một bản Chùa Online đang chạy ở cửa sổ khác).\n` +
        `  Cách xử lý: tắt bản đang chạy (Ctrl+C ở cửa sổ đó), hoặc tìm tiến trình bằng:\n` +
        `    netstat -ano | findstr :${config.port}\n` +
        `  rồi tắt nó:  taskkill /PID <số PID> /F\n`,
    );
    process.exit(1);
  }
  throw err;
});

server.listen(config.port, () => {
  console.log(`Chùa Online 3D server: http://localhost:${config.port}${config.isDev ? ' (dev)' : ''}`);
  console.log(voiceEnabled() ? `[voice] LiveKit: ${config.livekit.url}` : '[voice] Chưa cấu hình LiveKit → tắt trò chuyện bằng giọng nói');
});
