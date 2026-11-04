// Chat theo khu vực: khung mờ góc trái dưới (máy tính) / xem trước + bảng trượt lên (điện thoại).
import { useEffect, useRef, useState } from 'react';
import { CHAT_MAX, QUICK_CHATS, SCENE_NAMES, type ChatMsg } from '@chua/shared';
import { useGame } from '../../state/store';
import { ChatIcon, ChevronLeftIcon, CloseIcon, SendIcon } from '../icons';
import { MicButton, ZenButton, ZenNotice } from './Voice';

const NAME_COLORS = ['#ffd58a', '#b8e3a8', '#a9d4f5', '#f7b7c8', '#f2c08f', '#d3c2f2'];
const nameColor = (id = '') => NAME_COLORS[[...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % NAME_COLORS.length];
const time = (ts: number) => new Date(ts).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

function Line({ m, selfId }: { m: ChatMsg; selfId?: string }) {
  if (m.kind === 'system') {
    return <p className="text-[11.5px] italic text-amber-100/70">· {m.text}</p>;
  }
  const mine = m.pid === selfId;
  return (
    <p className="text-[13px] leading-snug text-amber-50 [overflow-wrap:anywhere]">
      <span className="mr-1 text-[10px] text-amber-100/50">{time(m.ts)}</span>
      <b style={{ color: mine ? '#f5c24b' : nameColor(m.pid) }}>{mine ? 'Bạn' : m.name}:</b>{' '}
      <span className={m.kind === 'quick' ? 'font-semibold text-amberwood-200' : ''}>{m.text}</span>
    </p>
  );
}

function MessageList({ className = '' }: { className?: string }) {
  const messages = useGame((s) => s.messages);
  const selfId = useGame((s) => s.self?.id);
  const ref = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  useEffect(() => {
    const el = ref.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [messages]);
  return (
    <div
      ref={ref}
      onScroll={(e) => {
        const el = e.currentTarget;
        stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 30;
      }}
      className={`space-y-1 overflow-y-auto overscroll-contain px-3 py-2 ${className}`}
      aria-live="polite"
    >
      {messages.length === 0 && <p className="pt-4 text-center text-xs text-amber-100/60">Chưa có lời nào. Xin giữ lời nói ôn hòa.</p>}
      {messages.map((m) => (
        <Line key={m.id} m={m} selfId={selfId} />
      ))}
    </div>
  );
}

function Composer({ autoFocus }: { autoFocus?: boolean }) {
  const sendChat = useGame((s) => s.sendChat);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const send = async (req: { text?: string; quick?: number }) => {
    if (busy) return;
    setBusy(true);
    const res = await sendChat(req);
    setBusy(false);
    if (res.ok) {
      setError('');
      if (req.text) setText('');
    } else setError(res.error);
  };

  return (
    <div className="space-y-1.5 border-t border-white/15 p-2">
      <div className="flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none]">
        {QUICK_CHATS.map((q, i) => (
          <button
            key={q}
            onClick={() => send({ quick: i })}
            className="shrink-0 rounded-full border border-amberwood-300/50 bg-amberwood-300/15 px-2.5 py-1 text-[11.5px] font-semibold text-amberwood-200 transition hover:bg-amberwood-300/30 active:scale-95"
          >
            {q}
          </button>
        ))}
      </div>
      {error && <p className="px-1 text-[11px] text-brick-400">{error}</p>}
      <form
        className="flex items-center gap-1.5"
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim()) send({ text: text.trim() });
        }}
      >
        <MicButton />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={CHAT_MAX}
          autoFocus={autoFocus}
          placeholder="Nhắn với mọi người…"
          enterKeyHint="send"
          aria-label="Nội dung tin nhắn"
          className="min-w-0 flex-1 rounded-full border border-white/25 bg-black/20 px-3.5 py-2 text-[14px] text-amber-50 placeholder:text-amber-100/45 focus:border-amberwood-300 focus:outline-none"
          onKeyDown={(e) => e.key === 'Escape' && (e.currentTarget as HTMLInputElement).blur()}
        />
        <button
          type="submit"
          disabled={!text.trim() || busy}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-b from-amberwood-300 to-amberwood-500 text-amberwood-900 shadow disabled:opacity-40"
          aria-label="Gửi"
        >
          <SendIcon size={17} />
        </button>
      </form>
    </div>
  );
}

/** Máy tính: khung chat cố định góc trái dưới, thu gọn được. */
export function ChatPanel() {
  const scene = useGame((s) => s.scene);
  const zen = useGame((s) => s.zen);
  const [collapsed, setCollapsed] = useState(false);
  if (collapsed) {
    return (
      <button onClick={() => setCollapsed(false)} className="glass-dark pointer-events-auto flex items-center gap-2 px-4 py-2 text-sm font-semibold">
        <ChatIcon size={18} /> Trò chuyện
      </button>
    );
  }
  return (
    <section className="glass-dark pointer-events-auto flex w-[340px] flex-col overflow-hidden" aria-label="Trò chuyện">
      <header className="flex items-center justify-between px-3 pt-2 text-xs font-semibold text-amber-100/80">
        <span>Trò chuyện · {SCENE_NAMES[scene]}</span>
        <span className="flex items-center gap-1">
          <ZenButton />
          <button onClick={() => setCollapsed(true)} className="grid h-6 w-6 place-items-center rounded-full hover:bg-white/15" aria-label="Thu gọn khung chat">
            <ChevronLeftIcon size={16} />
          </button>
        </span>
      </header>
      {zen ? (
        <ZenNotice />
      ) : (
        <>
          <MessageList className="h-40" />
          <Composer />
        </>
      )}
    </section>
  );
}

/** Điện thoại: 3 dòng xem trước (chạm để mở) + nút chat có số tin chưa đọc. */
export function ChatPreview() {
  const messages = useGame((s) => s.messages);
  const zen = useGame((s) => s.zen);
  const setChatOpen = useGame((s) => s.setChatOpen);
  const selfId = useGame((s) => s.self?.id);
  const last = messages.slice(-3);
  if (!last.length || zen) return null;
  return (
    <button
      onClick={() => setChatOpen(true)}
      className="pointer-events-auto block w-[min(62vw,260px)] space-y-0.5 rounded-2xl bg-amberwood-900/35 px-2.5 py-1.5 text-left backdrop-blur-sm"
      aria-label="Mở khung trò chuyện"
    >
      {last.map((m) => (
        <div key={m.id} className="truncate [&_p]:truncate">
          <Line m={m} selfId={selfId} />
        </div>
      ))}
    </button>
  );
}

export function ChatButton() {
  const unread = useGame((s) => (s.zen ? 0 : s.unread));
  const setChatOpen = useGame((s) => s.setChatOpen);
  return (
    <button
      onClick={() => setChatOpen(true)}
      className="pointer-events-auto relative grid h-12 w-12 place-items-center rounded-full bg-amberwood-900/50 text-amber-50 shadow-lg ring-2 ring-white/40 backdrop-blur active:scale-90"
      aria-label={`Trò chuyện${unread ? `, ${unread} tin mới` : ''}`}
    >
      <ChatIcon />
      {unread > 0 && (
        <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-brick-600 px-1 text-[10px] font-bold text-white ring-2 ring-white/80">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </button>
  );
}

export function ChatSheet() {
  const open = useGame((s) => s.chatOpen);
  const zen = useGame((s) => s.zen);
  const scene = useGame((s) => s.scene);
  const setChatOpen = useGame((s) => s.setChatOpen);
  if (!open) return null;
  return (
    <div className="pointer-events-auto fixed inset-0 z-40 flex flex-col justify-end" role="dialog" aria-modal="true" aria-label="Trò chuyện">
      <div className="absolute inset-0 bg-black/30" onClick={() => setChatOpen(false)} />
      <div className="glass-dark fade-enter relative flex h-[62dvh] flex-col overflow-hidden rounded-b-none pb-[env(safe-area-inset-bottom)]">
        <header className="flex items-center justify-between px-4 pt-3 text-sm font-semibold">
          <span>Trò chuyện · {SCENE_NAMES[scene]}</span>
          <button onClick={() => setChatOpen(false)} className="grid h-8 w-8 place-items-center rounded-full hover:bg-white/15" aria-label="Đóng">
            <CloseIcon size={18} />
          </button>
        </header>
        {zen ? (
          <ZenNotice />
        ) : (
          <>
            <MessageList className="min-h-0 flex-1" />
            <Composer />
          </>
        )}
      </div>
    </div>
  );
}
