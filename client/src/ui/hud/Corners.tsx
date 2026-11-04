// Góc trái trên (thẻ người chơi) và góc phải trên (tiền tệ, nút nhanh, minimap).
import { CHANNEL_CAPACITY, HALL_CAPACITY, ROBE_COLORS, SCENE_NAMES } from '@chua/shared';
import { useGame } from '../../state/store';
import Minimap from '../Minimap';
import { useUnreadMail } from '../mail';
import { useDesktop } from '../hooks';
import * as I from '../icons';

const fmt = (n: number) => n.toLocaleString('vi-VN');

export function PlayerCard() {
  const self = useGame((s) => s.self)!;
  const wallet = useGame((s) => s.wallet);
  const scene = useGame((s) => s.scene);
  const stats = useGame((s) => s.stats);
  const changeScene = useGame((s) => s.changeScene);
  const transitioning = useGame((s) => s.transitioning);
  const robe = ROBE_COLORS[self.appearance.robe]?.value ?? '#8b5a3c';
  // tên gọi là chữ cuối (vd. "Tâm An" → "A")
  const initial = [...(self.name.trim().split(/\s+/).pop() ?? '?')][0]?.toUpperCase() ?? '?';
  const pct = Math.min(100, Math.max(3, (wallet.exp / wallet.expNext) * 100));

  return (
    <div className="pointer-events-auto flex flex-col items-start gap-1.5">
      <div className="glass flex items-center gap-2.5 py-1.5 pl-1.5 pr-3 md:gap-3 md:py-2 md:pl-2 md:pr-4">
        <div className="relative">
          <div className="grid h-11 w-11 place-items-center rounded-full border-2 border-white/80 font-display text-lg font-bold text-white shadow md:h-14 md:w-14 md:text-xl" style={{ background: robe }}>
            {initial}
          </div>
          <span className="absolute -bottom-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full bg-gradient-to-b from-amberwood-300 to-amberwood-500 px-1 text-[10px] font-bold text-amberwood-900 shadow ring-2 ring-white/80 md:h-6 md:min-w-6 md:text-xs">
            {self.level}
          </span>
        </div>
        <div className="min-w-0">
          <p className="max-w-[110px] truncate text-sm font-semibold leading-tight text-amberwood-900 md:max-w-[150px] md:text-base">{self.name}</p>
          <p className="text-[10px] font-semibold text-brick-600 md:text-[11px]">{wallet.title}</p>
          <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-white/50 md:w-28" title={`Kinh nghiệm ${wallet.exp}/${wallet.expNext}`}>
            <div className="h-full rounded-full bg-gradient-to-r from-jade-400 to-jade-600" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="glass rounded-full px-2.5 py-1 text-[11px] font-semibold md:text-xs">{SCENE_NAMES[scene]}</span>
        <button
          className="btn-primary px-3 py-1 text-[11px] md:text-xs"
          disabled={transitioning}
          onClick={() => changeScene(scene === 'courtyard' ? 'hall' : 'courtyard')}
        >
          {scene === 'courtyard' ? 'Vào chánh điện' : 'Ra sân chùa'}
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 text-[10px] md:text-[11px]">
        <span className="glass rounded-full px-2.5 py-1 font-medium" title="Đổi theo ngày rằm / mùng 1 / lễ (giai đoạn 6)">
          🌸 Hoa: Ngày thường
        </span>
        <span className="glass rounded-full px-2.5 py-1 font-medium" title={`Kênh ${stats?.channel ?? ''}`}>
          <span className="mr-1 inline-block h-2 w-2 rounded-full bg-jade-500 align-middle" />
          {stats ? (
            <>
              {/* điện thoại: bản rút gọn để không đè minimap */}
              <span className="md:hidden">
                {scene === 'hall' ? `${stats.hallCount}/${HALL_CAPACITY}` : `K${stats.channel} · ${stats.channelOnline}/${CHANNEL_CAPACITY}`}
              </span>
              <span className="hidden md:inline">
                {scene === 'hall' ? `Điện ${stats.hallCount}/${HALL_CAPACITY}` : `Kênh ${stats.channel} · ${stats.channelOnline}/${CHANNEL_CAPACITY}`} · {stats.online} online
              </span>
            </>
          ) : (
            '…'
          )}
        </span>
      </div>
    </div>
  );
}

function IconBtn({ label, onClick, children, badge, active }: { label: string; onClick: () => void; children: React.ReactNode; badge?: number; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`relative grid h-9 w-9 place-items-center rounded-full border border-white/50 shadow backdrop-blur transition active:scale-90 md:h-10 md:w-10 ${active ? 'bg-brick-500 text-amber-50' : 'bg-white/45 text-amberwood-900 hover:bg-white/70'}`}
    >
      {children}
      {!!badge && (
        <span className="absolute -right-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-brick-600 px-1 text-[10px] font-bold text-white ring-2 ring-white/80">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </button>
  );
}

function Currency({ icon, value, label, tone }: { icon: React.ReactNode; value: number; label: string; tone: string }) {
  return (
    <div className="glass flex items-center gap-1 rounded-full py-0.5 pl-0.5 pr-2.5" title={label} aria-label={`${label}: ${fmt(value)}`}>
      <span className={`grid h-7 w-7 place-items-center rounded-full bg-gradient-to-b text-white shadow md:h-8 md:w-8 ${tone}`}>{icon}</span>
      <span className="min-w-[2ch] text-xs font-bold tabular-nums text-amberwood-900 md:text-sm">{fmt(value)}</span>
    </div>
  );
}

export async function toggleFullscreen(toast: (t: string) => void) {
  const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> };
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (el.requestFullscreen) await el.requestFullscreen();
    else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
    else toast('Trình duyệt chưa hỗ trợ toàn màn hình. Trên iPhone: Chia sẻ → Thêm vào MH chính.');
  } catch {
    toast('Không bật được toàn màn hình.');
  }
}

export function TopRight() {
  const wallet = useGame((s) => s.wallet);
  const openPanel = useGame((s) => s.openPanel);
  const favorite = useGame((s) => s.favorite);
  const toggleFavorite = useGame((s) => s.toggleFavorite);
  const toast = useGame((s) => s.toast);
  const unreadMail = useUnreadMail();
  const desktop = useDesktop();
  const music = useGame((s) => s.settings.music);
  const setSettings = useGame((s) => s.setSettings);

  return (
    <div className="pointer-events-auto flex flex-col items-end gap-2">
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        <Currency icon={<I.MeritIcon size={18} />} value={wallet.merit} label="Điểm công đức" tone="from-amberwood-300 to-amberwood-500" />
        <Currency icon={<I.JadeIcon size={16} />} value={wallet.jade} label="Ngọc" tone="from-jade-300 to-jade-600" />
      </div>
      <div className="flex items-center gap-1.5">
        <IconBtn label="Thư" onClick={() => openPanel('mail')} badge={unreadMail}>
          <I.MailIcon size={18} />
        </IconBtn>
        <IconBtn label={favorite ? 'Bỏ yêu thích' : 'Yêu thích'} onClick={toggleFavorite} active={favorite}>
          <I.HeartIcon size={18} />
        </IconBtn>
        <IconBtn label={music ? 'Tắt nhạc nền' : 'Bật nhạc nền'} onClick={() => setSettings({ music: !music })} active={music}>
          <I.MusicIcon size={18} />
        </IconBtn>
        <IconBtn label="Trợ giúp" onClick={() => openPanel('help')}>
          <I.HelpIcon size={18} />
        </IconBtn>
        {/* điện thoại: chuyển vào Cài đặt cho đỡ chật */}
        {desktop && (
          <IconBtn label="Toàn màn hình" onClick={() => toggleFullscreen(toast)}>
            <I.FullscreenIcon size={18} />
          </IconBtn>
        )}
      </div>
      <button
        onClick={() => openPanel('map')}
        className="overflow-hidden rounded-2xl border-2 border-white/70 shadow-glass"
        aria-label="Mở bản đồ lớn"
        title="Bản đồ"
      >
        <Minimap size={desktop ? 150 : 96} />
      </button>
    </div>
  );
}
