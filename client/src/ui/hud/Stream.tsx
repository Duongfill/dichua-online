// Bảng "Phát chung" + chip "Đang phát".
import { useState } from 'react';
import { MEDIA_EXT, MEDIA_MAX_MB, streamPos, type MediaItem, type PlayMode } from '@chua/shared';
import { useGame } from '../../state/store';
import { socket, serverNow } from '../../net/socket';
import { resumeStream, uploadMedia } from '../../game/stream';
import { useNow } from './Interact';

const fmt = (s: number) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.floor(Math.max(0, s) % 60)).padStart(2, '0')}`;
const MODES: [PlayMode, string][] = [['all', '🔁 Lặp danh sách'], ['one', '🔂 Lặp 1 bài'], ['shuffle', '🔀 Ngẫu nhiên']];
const btn = 'rounded-full bg-white/60 px-2.5 py-1 text-xs font-semibold hover:bg-white/90 disabled:opacity-40';

export function NowPlaying() {
  const st = useGame((s) => s.stream);
  const lib = useGame((s) => s.lib);
  const blocked = useGame((s) => s.streamBlocked);
  const on = useGame((s) => s.settings.stream);
  const item = st?.current ? lib.find((i) => i.id === st.current) : undefined;
  if (!item || !on) return null;
  return (
    <button
      onClick={() => (blocked ? resumeStream() : useGame.getState().openPanel('stream'))}
      className="glass pointer-events-auto fade-enter flex max-w-[80vw] items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold"
    >
      <span className={st!.paused ? '' : 'animate-pulse'}>♪</span>
      <span className="truncate">{blocked ? 'Chạm để nghe Phát chung' : `${st!.paused ? 'Tạm dừng' : 'Đang phát'}: ${item.title}`}</span>
    </button>
  );
}

function Row({ it, children }: { it: MediaItem; children?: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2 rounded-2xl bg-white/45 px-3 py-1.5">
      <span className="text-base">{it.kind === 'video' ? '🎬' : '🎵'}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{it.title}</span>
        <span className="block text-[11px] text-amberwood-800/70">
          {it.status === 'processing' ? 'Đang xử lý…' : it.status === 'error' ? `Lỗi: ${it.error}` : fmt(it.duration)} · {it.uploader}
          {it.reports ? ` · 🚩${it.reports}` : ''}
        </span>
      </span>
      <span className="flex shrink-0 gap-1">{children}</span>
    </li>
  );
}

function Upload({ admin }: { admin: boolean }) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [agree, setAgree] = useState(false);
  const [prog, setProg] = useState<number | null>(null);
  const toast = useGame((s) => s.toast);
  const send = async () => {
    if (!file || !agree || prog !== null) return;
    if (file.size > MEDIA_MAX_MB * 1024 * 1024) return toast(`File quá ${MEDIA_MAX_MB} MB.`, 'warn');
    setProg(0);
    const r = await uploadMedia(file, title || file.name.replace(/\.[^.]+$/, ''), socket.id ?? '', setProg);
    setProg(null);
    if (!r.ok) return toast(r.error ?? 'Tải lên thất bại.', 'warn');
    toast(r.pending ? 'Đã gửi đề xuất – chờ Điều phối duyệt 🙏' : 'Đã tải lên, đang xử lý…');
    setFile(null);
    setTitle('');
    setAgree(false);
  };
  return (
    <div className="space-y-2 rounded-2xl bg-white/45 p-3">
      <p className="text-sm font-semibold">{admin ? 'Tải lên thư viện' : 'Đề xuất bài (Điều phối sẽ duyệt)'}</p>
      <input type="file" accept={MEDIA_EXT.map((e) => '.' + e).join(',')} onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="block w-full text-xs" />
      <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} placeholder="Tên bài (vd. Kinh Bát Nhã)" className="w-full rounded-xl border border-white/60 bg-white/70 px-3 py-1.5 text-sm" />
      <label className="flex items-start gap-2 text-xs text-amberwood-800">
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5" />
        <span>Tôi chỉ tải lên nội dung tôi <b>có quyền sử dụng</b> (tự thu, được chùa/tác giả cho phép, hoặc giấy phép tự do). Nội dung vi phạm sẽ bị gỡ.</span>
      </label>
      <p className="text-[11px] text-amberwood-800/60">{MEDIA_EXT.join(', ')} · tối đa {MEDIA_MAX_MB} MB · video sẽ chiếu lên màn hình trong chánh điện</p>
      <button onClick={send} disabled={!file || !agree || prog !== null} className="btn-primary w-full py-2 text-sm">
        {prog !== null ? `Đang tải lên… ${Math.round(prog * 100)}%` : admin ? 'Tải lên' : 'Gửi đề xuất'}
      </button>
    </div>
  );
}

function AdminLogin() {
  const [pw, setPw] = useState('');
  return (
    <form
      className="flex gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        if (await useGame.getState().adminLogin(pw)) setPw('');
      }}
    >
      <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Mật khẩu Điều phối" autoComplete="current-password" className="min-w-0 flex-1 rounded-xl border border-white/60 bg-white/70 px-3 py-1.5 text-sm" />
      <button className="btn-glass" disabled={!pw}>Vào</button>
    </form>
  );
}

export function StreamPanel() {
  const st = useGame((s) => s.stream);
  const lib = useGame((s) => s.lib);
  const admin = useGame((s) => s.isAdmin);
  const on = useGame((s) => s.settings.stream);
  const { streamCtl: ctl, reportMedia, setSettings } = useGame.getState();
  useNow(500);
  const cur = st?.current ? lib.find((i) => i.id === st.current) : undefined;
  const pos = st && cur ? Math.min(cur.duration, streamPos(st, serverNow())) : 0;
  const queue = (st?.queue ?? []).map((id) => lib.find((i) => i.id === id)).filter(Boolean) as MediaItem[];
  const ready = lib.filter((i) => i.status === 'ready');
  const pending = lib.filter((i) => i.status !== 'ready' && (admin || i.status === 'processing'));

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-white/55 p-3">
        <p className="text-xs font-bold uppercase tracking-wide text-brick-700">Đang phát chung cho cả chùa</p>
        <p className="mt-1 truncate font-display text-lg">{cur ? `${cur.kind === 'video' ? '🎬' : '🎵'} ${cur.title}` : 'Chưa phát bài nào'}</p>
        <div
          className={`mt-2 h-2 overflow-hidden rounded-full bg-amberwood-800/20 ${admin && cur ? 'cursor-pointer' : ''}`}
          onClick={(e) => {
            if (!admin || !cur) return;
            const r = e.currentTarget.getBoundingClientRect();
            ctl({ op: 'seek', pos: ((e.clientX - r.left) / r.width) * cur.duration });
          }}
          title={admin ? 'Bấm để tua' : undefined}
        >
          <div className="h-full rounded-full bg-brick-500" style={{ width: cur ? `${(Math.max(0, pos) / cur.duration) * 100}%` : '0%' }} />
        </div>
        <p className="mt-1 flex justify-between text-[11px] tabular-nums text-amberwood-800/70">
          <span>{fmt(pos)}</span>
          <span>{st?.paused && cur ? 'Tạm dừng' : ''}</span>
          <span>{cur ? fmt(cur.duration) : '--:--'}</span>
        </p>
        {admin && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <button className={btn} onClick={() => ctl({ op: 'prev' })}>⏮</button>
            <button className={btn} onClick={() => ctl({ op: st?.paused || !cur ? 'play' : 'pause' })}>{st?.paused || !cur ? '▶ Phát' : '⏸ Dừng'}</button>
            <button className={btn} onClick={() => ctl({ op: 'next' })}>⏭</button>
            <select value={st?.mode ?? 'all'} onChange={(e) => ctl({ op: 'mode', mode: e.target.value as PlayMode })} className="rounded-full bg-white/60 px-2 py-1 text-xs">
              {MODES.map(([m, l]) => <option key={m} value={m}>{l}</option>)}
            </select>
          </div>
        )}
        <label className="mt-2 flex items-center gap-2 text-xs">
          <input type="checkbox" checked={on} onChange={(e) => setSettings({ stream: e.target.checked })} /> Nghe Phát chung trên máy này (âm lượng: Cài đặt → Nhạc nền / kinh)
        </label>
      </div>

      {queue.length > 0 && (
        <section>
          <p className="mb-1 px-1 text-xs font-bold uppercase tracking-wide text-brick-700">Hàng chờ</p>
          <ul className="space-y-1">
            {queue.map((it, i) => (
              <Row key={it.id} it={it}>
                {it.id === cur?.id && <span className="text-xs">▶</span>}
                {admin && (
                  <>
                    <button className={btn} disabled={i === 0} onClick={() => ctl({ op: 'move', id: it.id, dir: -1 })}>↑</button>
                    <button className={btn} disabled={i === queue.length - 1} onClick={() => ctl({ op: 'move', id: it.id, dir: 1 })}>↓</button>
                    <button className={btn} onClick={() => ctl({ op: 'dequeue', id: it.id })}>✕</button>
                  </>
                )}
              </Row>
            ))}
          </ul>
        </section>
      )}

      <section>
        <p className="mb-1 px-1 text-xs font-bold uppercase tracking-wide text-brick-700">Thư viện ({ready.length})</p>
        {!ready.length && <p className="px-1 text-xs text-amberwood-800/70">Chưa có bài nào. {admin ? 'Hãy tải lên bên dưới.' : 'Bạn có thể đề xuất bài bên dưới.'}</p>}
        <ul className="max-h-56 space-y-1 overflow-y-auto">
          {ready.map((it) => (
            <Row key={it.id} it={it}>
              {admin ? (
                <>
                  <button className={btn} onClick={() => ctl({ op: 'playNow', id: it.id })} title="Phát ngay">▶</button>
                  <button className={btn} onClick={() => ctl({ op: 'enqueue', id: it.id })} title="Thêm vào hàng chờ">＋</button>
                  <button className={btn} onClick={() => confirm(`Xoá "${it.title}"?`) && ctl({ op: 'remove', id: it.id })} title="Xoá">🗑</button>
                </>
              ) : (
                <button className={btn} onClick={() => reportMedia(it.id)} title="Báo cáo vi phạm / bản quyền">🚩</button>
              )}
            </Row>
          ))}
        </ul>
      </section>

      {pending.length > 0 && (
        <section>
          <p className="mb-1 px-1 text-xs font-bold uppercase tracking-wide text-brick-700">{admin ? 'Chờ duyệt / đang xử lý' : 'Đang xử lý'}</p>
          <ul className="space-y-1">
            {pending.map((it) => (
              <Row key={it.id} it={it}>
                {admin && it.status === 'pending' && <button className={btn} onClick={() => ctl({ op: 'approve', id: it.id })}>✓ Duyệt</button>}
                {admin && it.status !== 'processing' && <button className={btn} onClick={() => ctl({ op: 'reject', id: it.id })}>✕</button>}
              </Row>
            ))}
          </ul>
        </section>
      )}

      <Upload admin={admin} />
      {!admin && (
        <details className="rounded-2xl bg-white/35 px-3 py-2 text-sm">
          <summary className="cursor-pointer text-xs font-semibold text-amberwood-800">Dành cho Điều phối / Admin</summary>
          <div className="mt-2"><AdminLogin /></div>
        </details>
      )}
    </div>
  );
}
