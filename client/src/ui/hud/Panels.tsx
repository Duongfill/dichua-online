// Các bảng mở từ thanh dưới / nút góc phải. Máy tính: hộp giữa màn hình; điện thoại: trượt từ dưới lên.
import { useEffect, useState, type ReactNode } from 'react';
import { useGame, type PanelId, type Settings } from '../../state/store';
import Minimap from '../Minimap';
import { LETTERS, useMail } from '../mail';
import { useDesktop, useTouch } from '../hooks';
import { CloseIcon } from '../icons';
import { PeoplePanel } from './Voice';
import { StreamPanel } from './Stream';
import { InstallButton } from '../Pwa';
import { toggleFullscreen } from './Corners';

const TITLES: Record<PanelId, string> = {
  quests: 'Nhiệm vụ', bag: 'Túi đồ', shop: 'Cửa hàng', friends: 'Đạo hữu', map: 'Bản đồ',
  prayers: 'Văn khấn', calendar: 'Lịch lễ', settings: 'Cài đặt', mail: 'Thư', help: 'Trợ giúp', stream: 'Phát chung',
};

const SOON: Partial<Record<PanelId, { text: string; phase: number }>> = {
  quests: { text: 'Nhiệm vụ hằng ngày như thắp hương 1 lần, thỉnh chuông 1 lần… hoàn thành để nhận điểm công đức và kinh nghiệm.', phase: 6 },
  bag: { text: 'Nơi cất nhang, hoa, đèn hoa đăng và vật phẩm nhận từ nhiệm vụ.', phase: 6 },
  shop: { text: 'Đổi điểm công đức / ngọc lấy nhang, hoa, trang phục cho nhân vật.', phase: 6 },
  prayers: { text: 'Các bài văn khấn thường dùng khi lễ Phật, cầu an, cầu siêu – kèm hướng dẫn.', phase: 6 },
  calendar: { text: 'Lịch âm với mùng 1, ngày rằm và các ngày lễ lớn; trạng thái "Hoa" sẽ đổi theo ngày.', phase: 6 },
};

function Toggle({ label, desc, checked, onChange }: { label: string; desc?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl bg-white/45 px-3 py-2.5">
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        {desc && <span className="block text-xs text-amberwood-800/75">{desc}</span>}
      </span>
      <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="relative h-6 w-11 shrink-0 rounded-full bg-amberwood-800/30 transition peer-checked:bg-jade-500 peer-focus-visible:ring-2 peer-focus-visible:ring-brick-400 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-5" />
    </label>
  );
}

function Slider({ label, value, onChange, note }: { label: string; value: number; onChange: (v: number) => void; note?: string }) {
  return (
    <label className="block rounded-2xl bg-white/45 px-3 py-2.5">
      <span className="flex justify-between text-sm font-semibold">
        {label} <span className="tabular-nums text-amberwood-800/70">{Math.round(value * 100)}%</span>
      </span>
      <input type="range" min={0} max={1} step={0.05} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-1 w-full accent-brick-500" />
      {note && <span className="block text-[11px] text-amberwood-800/60">{note}</span>}
    </label>
  );
}

function SettingsPanel() {
  const s = useGame((st) => st.settings);
  const zen = useGame((st) => st.zen);
  const set = (p: Partial<Settings>) => useGame.getState().setSettings(p);
  return (
    <div className="space-y-2">
      <p className="px-1 text-xs font-bold uppercase tracking-wide text-brick-700">Đồ hoạ</p>
      <Toggle label="Đổ bóng" desc="Tắt để mượt hơn trên điện thoại yếu" checked={s.shadows} onChange={(v) => set({ shadows: v })} />
      <Toggle label="Chất lượng cao" desc="Độ phân giải cao hơn, tốn pin hơn" checked={s.quality === 'high'} onChange={(v) => set({ quality: v ? 'high' : 'low' })} />
      <Toggle label="Hiện tên trên đầu" checked={s.showNames} onChange={(v) => set({ showNames: v })} />
      <Toggle label="Bong bóng chat trên đầu" checked={s.bubbles} onChange={(v) => set({ bubbles: v })} />
      <p className="px-1 pt-2 text-xs font-bold uppercase tracking-wide text-brick-700">Tĩnh lặng</p>
      <Toggle label="Tịnh tâm" desc="Ẩn trò chuyện, tắt giọng nói và micro – chỉ nghe tiếng chùa, lời kinh" checked={zen} onChange={(v) => useGame.getState().setZen(v)} />
      <p className="px-1 pt-2 text-xs font-bold uppercase tracking-wide text-brick-700">Âm lượng</p>
      <Toggle label="Nhạc nền chùa" desc="Sân chùa: đàn, chuông, gió, chim · Chánh điện: khánh, mõ, trầm ấm" checked={s.music} onChange={(v) => set({ music: v })} />
      <Slider label="Nhạc nền / kinh" value={s.volMusic} onChange={(v) => set({ volMusic: v })} note="Nhạc nền chùa (và kinh Phát chung ở giai đoạn 5)" />
      <Slider label="Giọng nói" value={s.volVoice} onChange={(v) => set({ volVoice: v })} note="Ở sân chùa: người càng xa nghe càng nhỏ; trong chánh điện nghe chung" />
      <Slider label="Hiệu ứng" value={s.volSfx} onChange={(v) => set({ volSfx: v })} note="Chuông, khánh, mõ, tiếng nước…" />
      <button className="btn-glass mt-1 w-full py-2" onClick={() => toggleFullscreen(useGame.getState().toast)}>
        ⛶ Toàn màn hình
      </button>
      <InstallButton className="mt-1 w-full py-2" />
      <button className="btn-glass mt-1 w-full py-2" onClick={() => useGame.getState().openPanel('stream')}>
        🎵 Phát chung
      </button>
    </div>
  );
}

function MapPanel() {
  const desktop = useDesktop();
  const size = desktop ? 420 : Math.min(320, window.innerWidth - 48);
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="overflow-hidden rounded-2xl border-2 border-white/70 shadow">
        <Minimap size={size} interactive />
      </div>
      <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-amberwood-800">
        <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-[#f5c24b] ring-1 ring-amberwood-900" />Bạn</span>
        <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-[#4f9a54] ring-1 ring-white" />Người khác</span>
        <span>Bấm lên bản đồ để đi tới đó</span>
      </p>
    </div>
  );
}

function HelpPanel() {
  const touch = useTouch();
  const rows: [string, string][] = touch
    ? [
        ['Đi lại', 'Kéo cần điều khiển góc trái dưới'],
        ['Đi tới điểm', 'Chạm vào mặt đất hoặc bản đồ'],
        ['Xoay góc nhìn', 'Kéo trên màn hình'],
        ['Thu phóng', 'Chụm / mở hai ngón tay'],
        ['Tương tác', 'Chạm nút nổi khi đến gần'],
      ]
    : [
        ['Đi lại', 'W A S D hoặc ↑ ↓ ← →'],
        ['Đi tới điểm', 'Bấm vào mặt đất hoặc bản đồ'],
        ['Xoay góc nhìn', 'Kéo chuột'],
        ['Thu phóng', 'Lăn chuột'],
        ['Tương tác', 'Phím E khi đến gần'],
        ['Chat nhanh', 'Phím Enter để gõ'],
      ];
  return (
    <div className="space-y-3 text-sm">
      <table className="w-full overflow-hidden rounded-2xl bg-white/45">
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k} className="border-b border-white/50 last:border-0">
              <th className="px-3 py-2 text-left font-semibold">{k}</th>
              <td className="px-3 py-2 text-amberwood-800">{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="rounded-2xl bg-white/45 px-3 py-2.5">
        <p className="font-semibold text-brick-700">Nội quy chùa</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-5 text-amberwood-800">
          <li>Giữ lời nói ôn hòa, trang nghiêm.</li>
          <li>Không spam, không quảng cáo, không chia sẻ liên kết.</li>
          <li>Tôn trọng mọi người. Từ ngữ thô tục sẽ tự động bị ẩn.</li>
        </ul>
      </div>
      <p className="text-xs text-amberwood-800/70">Mỗi kênh tối đa 50 người; chánh điện tối đa 20 người. Kênh đầy sẽ tự mở kênh mới.</p>
    </div>
  );
}

function MailPanel() {
  const read = useMail((s) => s.read);
  const markRead = useMail((s) => s.markRead);
  const [openId, setOpenId] = useState<string | null>(null);
  const open = LETTERS.find((l) => l.id === openId);
  if (open) {
    return (
      <div className="space-y-2">
        <button className="text-sm font-semibold text-brick-600" onClick={() => setOpenId(null)}>‹ Hộp thư</button>
        <article className="rounded-2xl bg-white/55 p-4">
          <h3 className="font-display text-lg text-brick-700">{open.title}</h3>
          <p className="text-xs text-amberwood-800/70">{open.from} · {new Date(open.date).toLocaleDateString('vi-VN')}</p>
          <p className="mt-2 text-sm leading-relaxed">{open.body}</p>
        </article>
      </div>
    );
  }
  return (
    <ul className="space-y-1.5">
      {LETTERS.map((l) => {
        const unread = !read.includes(l.id);
        return (
          <li key={l.id}>
            <button
              onClick={() => {
                markRead(l.id);
                setOpenId(l.id);
              }}
              className="flex w-full items-center gap-3 rounded-2xl bg-white/45 px-3 py-2.5 text-left hover:bg-white/65"
            >
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${unread ? 'bg-brick-500' : 'bg-transparent'}`} />
              <span className="min-w-0">
                <span className={`block truncate text-sm ${unread ? 'font-bold' : 'font-medium'}`}>{l.title}</span>
                <span className="block text-xs text-amberwood-800/70">{l.from}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function Soon({ id }: { id: PanelId }) {
  const s = SOON[id]!;
  return (
    <div className="flex flex-col items-center gap-3 py-4 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-full bg-gradient-to-b from-amberwood-200 to-amberwood-400 text-3xl shadow">🪷</span>
      <p className="font-display text-xl text-brick-700">Sắp ra mắt</p>
      <p className="max-w-xs text-sm text-amberwood-800">{s.text}</p>
      <span className="rounded-full bg-white/50 px-3 py-1 text-xs font-semibold text-amberwood-800">Dự kiến: giai đoạn {s.phase}</span>
    </div>
  );
}

export default function Panels() {
  const panel = useGame((s) => s.panel);
  const close = () => useGame.getState().openPanel(null);
  useEffect(() => {
    if (!panel) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [panel]);
  if (!panel) return null;

  let body: ReactNode;
  if (panel === 'settings') body = <SettingsPanel />;
  else if (panel === 'map') body = <MapPanel />;
  else if (panel === 'help') body = <HelpPanel />;
  else if (panel === 'mail') body = <MailPanel />;
  else if (panel === 'friends') body = <PeoplePanel />;
  else if (panel === 'stream') body = <StreamPanel />;
  else body = <Soon id={panel} />;

  return (
    <div className="pointer-events-auto fixed inset-0 z-40 flex items-end justify-center md:items-center" role="dialog" aria-modal="true" aria-labelledby="panel-title">
      <div className="absolute inset-0 bg-amberwood-900/30 backdrop-blur-[1px]" onClick={close} />
      <div className="glass fade-enter relative max-h-[82dvh] bg-[#f7ecd6]/90 w-full overflow-y-auto rounded-b-none p-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:w-auto md:min-w-[380px] md:max-w-[520px] md:rounded-3xl md:p-5">
        <header className="mb-3 flex items-center justify-between gap-6">
          <h2 id="panel-title" className="font-display text-xl font-bold text-brick-700">{TITLES[panel]}</h2>
          <button onClick={close} className="grid h-8 w-8 place-items-center rounded-full bg-white/50 hover:bg-white/80" aria-label="Đóng">
            <CloseIcon size={18} />
          </button>
        </header>
        {body}
      </div>
    </div>
  );
}
