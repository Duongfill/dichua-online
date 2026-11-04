// Nút micro, Tịnh tâm, thẻ người chơi (tắt tiếng từng người), danh sách người trong khu vực.
import { HALL_SEATS, ROBE_COLORS, SCENE_NAMES } from '@chua/shared';
import { useGame } from '../../state/store';
import { resumeVoiceAudio, setMic } from '../../game/voice';
import { CloseIcon, LotusLampIcon, MicIcon, MicOffIcon } from '../icons';

export function MicButton({ size = 'sm' }: { size?: 'sm' | 'lg' }) {
  const voice = useGame((s) => s.voice);
  const zen = useGame((s) => s.zen);
  const selfSpeaking = useGame((s) => !!(s.self && s.speaking[s.self.id]));
  const toast = useGame((s) => s.toast);
  const unavailable = voice.status === 'disabled' || voice.status === 'error';

  const onClick = async () => {
    if (unavailable) return toast(voice.error || 'Voice chưa sẵn sàng.', 'warn');
    const err = await setMic(!voice.micOn);
    if (err) toast(err, 'warn');
    else toast(voice.micOn ? 'Đã tắt micro' : 'Micro đang bật – nên dùng tai nghe để tránh vọng tiếng 🎧');
  };

  const label = unavailable
    ? 'Voice chưa sẵn sàng'
    : voice.status === 'connecting'
      ? 'Đang kết nối voice…'
      : voice.micOn
        ? 'Tắt micro'
        : 'Bật micro';
  const dim = size === 'lg' ? 'h-12 w-12' : 'h-9 w-9';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={zen}
      aria-pressed={voice.micOn}
      aria-label={label}
      title={label}
      className={`pointer-events-auto relative grid ${dim} shrink-0 place-items-center rounded-full shadow transition active:scale-90 disabled:opacity-40 ${
        voice.micOn ? 'bg-gradient-to-b from-jade-400 to-jade-600 text-white' : unavailable ? 'bg-white/10 text-amber-100/50' : 'bg-white/15 text-amber-50 hover:bg-white/25'
      } ${size === 'lg' ? 'ring-2 ring-white/40 backdrop-blur' : ''} ${size === 'lg' && !voice.micOn ? '!bg-amberwood-900/50' : ''}`}
    >
      {voice.micOn && selfSpeaking && <span className="pulse-ring absolute inset-0 rounded-full border-2 border-jade-300" />}
      {voice.micOn ? <MicIcon size={size === 'lg' ? 22 : 18} /> : <MicOffIcon size={size === 'lg' ? 22 : 18} />}
      {voice.status === 'connecting' && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 animate-pulse rounded-full bg-amberwood-300" />}
    </button>
  );
}

export function ZenButton({ size = 'sm' }: { size?: 'sm' | 'lg' }) {
  const zen = useGame((s) => s.zen);
  const setZen = useGame((s) => s.setZen);
  const dim = size === 'lg' ? 'h-12 w-12 ring-2 ring-white/40' : 'h-7 px-2.5 gap-1 text-[11px]';
  return (
    <button
      type="button"
      onClick={() => setZen(!zen)}
      aria-pressed={zen}
      title="Tịnh tâm: ẩn trò chuyện, tắt giọng nói của mọi người"
      aria-label={zen ? 'Thoát Tịnh tâm' : 'Tịnh tâm'}
      className={`pointer-events-auto flex ${dim} shrink-0 items-center justify-center rounded-full font-semibold shadow backdrop-blur transition active:scale-90 ${
        zen ? 'bg-gradient-to-b from-amberwood-200 to-amberwood-400 text-amberwood-900' : size === 'lg' ? 'bg-amberwood-900/50 text-amber-50' : 'bg-white/15 text-amber-50 hover:bg-white/25'
      }`}
    >
      <LotusLampIcon size={size === 'lg' ? 22 : 15} />
      {size === 'sm' && <span>Tịnh tâm</span>}
    </button>
  );
}

/** Màn hình thay khung chat khi đang Tịnh tâm. */
export function ZenNotice() {
  const setZen = useGame((s) => s.setZen);
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-6 text-center text-amber-50">
      <LotusLampIcon size={30} className="text-amberwood-300" />
      <p className="font-display text-lg">Đang tịnh tâm</p>
      <p className="max-w-[240px] text-xs text-amber-100/75">Trò chuyện và giọng nói của mọi người đã được ẩn. Chỉ còn tiếng chùa và lời kinh.</p>
      <button onClick={() => setZen(false)} className="mt-1 rounded-full border border-amberwood-300/60 px-4 py-1.5 text-xs font-semibold text-amberwood-200 hover:bg-white/10">
        Thoát tịnh tâm
      </button>
    </div>
  );
}

/** Trình duyệt chặn phát tiếng (chưa có thao tác) → nút bật âm thanh. */
export function AudioUnlock() {
  const needs = useGame((s) => s.voice.needsGesture && s.voice.status === 'on' && !s.zen);
  if (!needs) return null;
  return (
    <button onClick={resumeVoiceAudio} className="pointer-events-auto btn-primary fade-enter text-sm">
      🔊 Chạm để nghe giọng nói mọi người
    </button>
  );
}

/** Thẻ khi bấm vào một người chơi khác. */
export function PlayerPopover() {
  const id = useGame((s) => s.selected);
  const p = useGame((s) => (s.selected ? s.players[s.selected] : undefined));
  const muted = useGame((s) => !!(id && s.muted[id]));
  const speaking = useGame((s) => !!(id && s.speaking[id]));
  const toggleMute = useGame((s) => s.toggleMute);
  const close = () => useGame.setState({ selected: null });
  if (!id || !p) return null;
  const robe = ROBE_COLORS[p.appearance.robe]?.value ?? '#8b5a3c';
  return (
    <div className="glass fade-enter pointer-events-auto flex items-center gap-3 bg-[#f7ecd6]/90 py-2 pl-2 pr-2" role="dialog" aria-label={`Người chơi ${p.name}`}>
      <span className="grid h-10 w-10 place-items-center rounded-full border-2 border-white/80 font-display font-bold text-white" style={{ background: robe }}>
        {[...(p.name.split(/\s+/).pop() ?? '?')][0]?.toUpperCase()}
      </span>
      <div className="min-w-0">
        <p className="max-w-[150px] truncate font-semibold">{p.name}</p>
        <p className="text-xs text-amberwood-800/75">Cấp {p.level}{speaking ? ' · đang nói' : ''}</p>
      </div>
      <button onClick={() => toggleMute(id)} className={`rounded-full px-3 py-1.5 text-xs font-semibold shadow ${muted ? 'bg-jade-500 text-white' : 'bg-white/70 text-amberwood-900'}`}>
        {muted ? '🔊 Bật tiếng' : '🔇 Tắt tiếng'}
      </button>
      <button onClick={close} aria-label="Đóng" className="grid h-7 w-7 place-items-center rounded-full hover:bg-white/60">
        <CloseIcon size={16} />
      </button>
    </div>
  );
}

/** Bảng "Đạo hữu": người trong khu vực + tắt tiếng từng người (kết bạn: giai đoạn 6). */
export function PeoplePanel() {
  const players = useGame((s) => s.players);
  const scene = useGame((s) => s.scene);
  const muted = useGame((s) => s.muted);
  const speaking = useGame((s) => s.speaking);
  const seats = useGame((s) => s.seats);
  const voice = useGame((s) => s.voice);
  const toggleMute = useGame((s) => s.toggleMute);
  const list = Object.values(players).sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  return (
    <div className="space-y-2">
      <p className="text-sm text-amberwood-800">
        {list.length ? `${list.length} người khác đang ở ${SCENE_NAMES[scene].toLowerCase()}.` : `Chưa có ai khác ở ${SCENE_NAMES[scene].toLowerCase()}.`}
        {voice.status === 'disabled' && <span className="block text-xs text-brick-600">Máy chủ chưa bật trò chuyện bằng giọng nói.</span>}
      </p>
      <ul className="max-h-[50dvh] space-y-1.5 overflow-y-auto">
        {list.map((p) => {
          const seat = seats.indexOf(p.id);
          return (
            <li key={p.id} className="flex items-center gap-2.5 rounded-2xl bg-white/45 px-3 py-2">
              <span className="h-8 w-8 shrink-0 rounded-full border-2 border-white/80" style={{ background: ROBE_COLORS[p.appearance.robe]?.value }} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{p.name}</span>
                <span className="block text-[11px] text-amberwood-800/70">
                  Cấp {p.level}
                  {scene === 'hall' && seat >= 0 ? ` · bồ đoàn ${seat + 1}/${HALL_SEATS.length}` : ''}
                  {speaking[p.id] ? ' · 🎙 đang nói' : ''}
                </span>
              </span>
              <button
                onClick={() => toggleMute(p.id)}
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${muted[p.id] ? 'bg-jade-500 text-white' : 'bg-white/70'}`}
                aria-label={muted[p.id] ? `Bật tiếng ${p.name}` : `Tắt tiếng ${p.name}`}
              >
                {muted[p.id] ? '🔊 Bật tiếng' : '🔇 Tắt tiếng'}
              </button>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-amberwood-800/60">Mẹo: bấm vào nhân vật trong chùa để tắt tiếng nhanh. Kết bạn đạo hữu sẽ có ở giai đoạn 6.</p>
    </div>
  );
}
