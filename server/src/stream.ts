// Phát chung: thư viện + tải lên + chuyển mã ffmpeg + trình phát đồng bộ cho cả chùa.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import type { IncomingMessage, ServerResponse } from 'node:http';
import Busboy from 'busboy';
import ffmpegPath from 'ffmpeg-static';
import { MEDIA_EXT, MEDIA_MAX_MB, MEDIA_TOTAL_MB, type MediaItem, type StreamOp, type StreamState } from '@chua/shared';
import { cleanName } from './moderation';

const LEAD_MS = 800; // cho client kịp tải trước khi bài bắt đầu
const VIDEO_EXT = new Set(['mp4', 'webm']);

export class StreamService {
  items = new Map<string, MediaItem>();
  private reporters = new Map<string, Set<string>>();
  private lastUpload = new Map<string, number>();
  private timer: NodeJS.Timeout | null = null;
  private busy: Promise<void> = Promise.resolve(); // chuyển mã lần lượt từng file
  state: StreamState = { queue: [], current: null, startedAt: 0, paused: true, pausedAt: 0, mode: 'all' };

  constructor(public dir: string, private emitLib: () => void, private emitState: () => void) {
    fs.mkdirSync(dir, { recursive: true });
    try {
      const saved = JSON.parse(fs.readFileSync(this.file, 'utf8')) as { items: MediaItem[]; queue: string[]; mode: StreamState['mode'] };
      for (const it of saved.items) {
        if (it.status === 'processing') Object.assign(it, { status: 'error', error: 'Server khởi động lại giữa lúc chuyển mã' });
        this.items.set(it.id, it);
      }
      this.state.queue = saved.queue.filter((id) => this.items.get(id)?.status === 'ready');
      this.state.mode = saved.mode ?? 'all';
    } catch {
      /* chưa có thư viện */
    }
  }

  private get file() {
    return path.join(this.dir, 'library.json');
  }
  private save() {
    fs.writeFileSync(this.file, JSON.stringify({ items: [...this.items.values()], queue: this.state.queue, mode: this.state.mode }, null, 1));
  }
  list() {
    return [...this.items.values()].sort((a, b) => b.createdAt - a.createdAt);
  }
  private usedBytes() {
    let n = 0;
    for (const f of fs.readdirSync(this.dir)) n += fs.statSync(path.join(this.dir, f)).size;
    return n;
  }

  // ---------- Tải lên ----------
  /** POST /api/media/upload (multipart: title, agree, file). `who` = người chơi đã xác thực qua socket. */
  handleUpload(req: IncomingMessage, res: ServerResponse, who: { id: string; name: string; admin: boolean }) {
    const reply = (code: number, body: object) => {
      res.writeHead(code, { 'content-type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(body));
    };
    const last = this.lastUpload.get(who.id) ?? 0;
    if (!who.admin && Date.now() - last < 20_000) return reply(429, { ok: false, error: 'Xin đợi 20 giây giữa hai lần tải lên.' });
    if (this.usedBytes() > MEDIA_TOTAL_MB * 1024 * 1024) return reply(507, { ok: false, error: `Kho đã đầy (${MEDIA_TOTAL_MB} MB). Nhờ admin xoá bớt.` });

    let bb: Busboy.Busboy;
    try {
      bb = Busboy({ headers: req.headers, limits: { fileSize: MEDIA_MAX_MB * 1024 * 1024, files: 1, fields: 4 } });
    } catch {
      return reply(400, { ok: false, error: 'Yêu cầu tải lên không hợp lệ.' });
    }
    const fields: Record<string, string> = {};
    let tmp = '';
    let ext = '';
    let failed = '';
    let writeDone: Promise<void> = Promise.resolve();
    bb.on('field', (k, v) => (fields[k] = v.slice(0, 200)));
    bb.on('file', (_name, stream, info) => {
      // tên file: chỉ dùng để lấy đuôi; không bao giờ dùng làm đường dẫn
      ext = path.extname(info.filename || '').slice(1).toLowerCase();
      const okMime = /^(audio|video)\//.test(info.mimeType) || info.mimeType === 'application/octet-stream';
      if (!(MEDIA_EXT as readonly string[]).includes(ext) || !okMime) {
        failed = `Chỉ nhận ${MEDIA_EXT.join(', ')}.`;
        stream.resume();
        return;
      }
      tmp = path.join(os.tmpdir(), `chua-up-${randomUUID()}.${ext}`);
      const out = fs.createWriteStream(tmp);
      stream.on('limit', () => (failed = `File quá ${MEDIA_MAX_MB} MB.`));
      writeDone = new Promise((r) => out.on('close', () => r()));
      stream.pipe(out);
    });
    bb.on('close', async () => {
      await writeDone;
      if (!failed && fields.agree !== '1') failed = 'Cần xác nhận bạn có quyền sử dụng nội dung này.';
      if (!failed && !tmp) failed = 'Chưa chọn file.';
      if (failed) {
        if (tmp) fs.rm(tmp, () => {});
        return reply(400, { ok: false, error: failed });
      }
      this.lastUpload.set(who.id, Date.now());
      const title = cleanName(fields.title?.trim() || '') ?? 'Bài không tên';
      const item: MediaItem = {
        id: randomUUID().slice(0, 12), title, kind: VIDEO_EXT.has(ext) ? 'video' : 'audio', duration: 0,
        uploader: who.name, status: 'processing', createdAt: Date.now(), reports: 0,
      };
      this.items.set(item.id, item);
      this.save();
      this.emitLib();
      reply(200, { ok: true, id: item.id, pending: !who.admin });
      this.busy = this.busy.then(() => this.transcode(item, tmp, who.admin));
    });
    req.pipe(bb);
  }

  private ffmpeg(args: string[]) {
    return new Promise<{ code: number; err: string }>((resolve) => {
      const p = spawn(ffmpegPath as unknown as string, ['-hide_banner', '-y', ...args]);
      let err = '';
      p.stderr.on('data', (d) => (err = (err + d).slice(-20_000)));
      p.on('close', (code) => resolve({ code: code ?? 1, err }));
      p.on('error', (e) => resolve({ code: 1, err: String(e) }));
    });
  }

  /** Chuyển mã sang mp3 (và mp4 480p nếu là video). ffmpeg giải mã được = file hợp lệ. */
  private async transcode(item: MediaItem, src: string, approved: boolean) {
    const mp3 = path.join(this.dir, `${item.id}.mp3`);
    try {
      const a = await this.ffmpeg(['-i', src, '-vn', '-map_metadata', '-1', '-ac', '2', '-ar', '44100', '-b:a', '128k', mp3]);
      if (a.code !== 0) throw new Error('Không đọc được âm thanh trong file (định dạng hỏng hoặc không hỗ trợ).');
      const m = a.err.match(/Duration: (\d+):(\d+):(\d+\.\d+)/);
      item.duration = m ? +m[1] * 3600 + +m[2] * 60 + +m[3] : 0;
      if (!item.duration) throw new Error('Không xác định được thời lượng.');
      item.audioUrl = `/media/${item.id}.mp3`;
      if (item.kind === 'video') {
        const mp4 = path.join(this.dir, `${item.id}.mp4`);
        const v = await this.ffmpeg(['-i', src, '-an', '-map_metadata', '-1', '-vf', 'scale=-2:480', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '28', '-movflags', '+faststart', mp4]);
        if (v.code === 0) item.videoUrl = `/media/${item.id}.mp4`;
        else item.kind = 'audio'; // không có hình → coi như âm thanh
      }
      item.status = approved ? 'ready' : 'pending';
    } catch (e) {
      Object.assign(item, { status: 'error', error: (e as Error).message });
      fs.rm(mp3, () => {});
    } finally {
      fs.rm(src, () => {});
      this.save();
      this.emitLib();
    }
  }

  // ---------- Trình phát ----------
  pos(now = Date.now()) {
    return this.state.paused ? this.state.pausedAt : (now - this.state.startedAt) / 1000;
  }

  private start(id: string | null, at = 0) {
    if (this.timer) clearTimeout(this.timer);
    const it = id ? this.items.get(id) : undefined;
    if (!it || it.status !== 'ready') {
      Object.assign(this.state, { current: null, paused: true, pausedAt: 0 });
    } else {
      Object.assign(this.state, { current: id, paused: false, pausedAt: 0, startedAt: Date.now() + LEAD_MS - at * 1000 });
      this.timer = setTimeout(() => this.ended(), (it.duration - at) * 1000 + LEAD_MS + 300);
    }
    this.emitState();
  }

  private ended() {
    if (this.state.mode === 'one') return this.start(this.state.current);
    this.step(1);
  }

  private step(dir: 1 | -1) {
    const q = this.state.queue.filter((id) => this.items.get(id)?.status === 'ready');
    if (!q.length) return this.start(null);
    if (this.state.mode === 'shuffle' && dir === 1) {
      const others = q.filter((id) => id !== this.state.current);
      return this.start((others.length ? others : q)[Math.floor(Math.random() * (others.length || q.length))]);
    }
    const i = this.state.current ? q.indexOf(this.state.current) : -1;
    this.start(q[(i + dir + q.length) % q.length]);
  }

  /** Lệnh từ admin. Trả lỗi (chuỗi) hoặc null. */
  control(c: StreamOp): string | null {
    const s = this.state;
    const it = 'id' in c ? this.items.get(c.id) : undefined;
    if ('id' in c && !it) return 'Không tìm thấy bài.';
    switch (c.op) {
      case 'play':
        if (s.current && s.paused) this.start(s.current, s.pausedAt);
        else if (!s.current) this.step(1);
        return null;
      case 'pause':
        if (!s.current || s.paused) return null;
        if (this.timer) clearTimeout(this.timer);
        Object.assign(s, { paused: true, pausedAt: Math.max(0, this.pos()) });
        this.emitState();
        return null;
      case 'next':
        this.step(1);
        return null;
      case 'prev':
        this.step(-1);
        return null;
      case 'seek': {
        const cur = s.current && this.items.get(s.current);
        if (!cur) return 'Chưa có bài đang phát.';
        const p = Math.max(0, Math.min(cur.duration - 1, Number(c.pos) || 0));
        if (s.paused) {
          s.pausedAt = p;
          this.emitState();
        } else this.start(s.current, p);
        return null;
      }
      case 'mode':
        if (!['all', 'one', 'shuffle'].includes(c.mode)) return 'Chế độ không hợp lệ.';
        s.mode = c.mode;
        break;
      case 'playNow':
        if (it!.status !== 'ready') return 'Bài chưa sẵn sàng.';
        if (!s.queue.includes(c.id)) s.queue.push(c.id);
        this.save();
        this.start(c.id);
        return null;
      case 'enqueue':
        if (it!.status !== 'ready') return 'Bài chưa sẵn sàng.';
        if (!s.queue.includes(c.id)) s.queue.push(c.id);
        break;
      case 'dequeue':
        s.queue = s.queue.filter((x) => x !== c.id);
        break;
      case 'move': {
        const i = s.queue.indexOf(c.id);
        const j = i + c.dir;
        if (i < 0 || j < 0 || j >= s.queue.length) return null;
        [s.queue[i], s.queue[j]] = [s.queue[j], s.queue[i]];
        break;
      }
      case 'approve':
        if (it!.status !== 'pending') return 'Bài không ở trạng thái chờ duyệt.';
        it!.status = 'ready';
        this.reporters.delete(c.id);
        it!.reports = 0;
        this.save();
        this.emitLib();
        return null;
      case 'reject':
      case 'remove':
        this.items.delete(c.id);
        s.queue = s.queue.filter((x) => x !== c.id);
        for (const e of ['mp3', 'mp4']) fs.rm(path.join(this.dir, `${c.id}.${e}`), () => {});
        this.save();
        this.emitLib();
        if (s.current === c.id) this.step(1);
        else this.emitState();
        return null;
    }
    this.save();
    this.emitState();
    return null;
  }

  /** Báo cáo vi phạm/bản quyền: đủ 3 người → gỡ xuống chờ admin xem lại. */
  report(id: string, by: string): string | null {
    const it = this.items.get(id);
    if (!it) return 'Không tìm thấy bài.';
    const set = this.reporters.get(id) ?? new Set<string>();
    set.add(by);
    this.reporters.set(id, set);
    it.reports = set.size;
    if (set.size >= 3 && it.status === 'ready') {
      it.status = 'pending';
      this.state.queue = this.state.queue.filter((x) => x !== id);
      if (this.state.current === id) this.step(1);
    }
    this.save();
    this.emitLib();
    return null;
  }
}
