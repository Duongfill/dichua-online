// Nút nổi khi đứng gần vật thể tương tác (đỉnh hương, chuông, hồ sen, bàn thờ, cửa).
import { useEffect, useState } from 'react';
import { ACTION_DEFS, HALL_SEATS, type ActionId } from '@chua/shared';
import { local } from '../../game/local';
import { useGame } from '../../state/store';
import { unlockAudio } from '../../game/sfx';
import { ACTIONS } from '../actions';

/** Re-render mỗi `ms` để cập nhật đồng hồ đếm ngược. */
export function useNow(ms = 500) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

export const cooldownLeft = (until: number | undefined, now: number) => Math.max(0, Math.ceil(((until ?? 0) - now) / 1000));

export function doAction(action: ActionId) {
  unlockAudio(); // thao tác của người dùng → cho phép phát âm thanh
  useGame.getState().perform(action);
}

export default function InteractPrompt({ vertical = false }: { vertical?: boolean }) {
  const spots = useGame((s) => s.spots);
  const zone = useGame((s) => s.zone);
  const cooldowns = useGame((s) => s.cooldowns);
  const changeScene = useGame((s) => s.changeScene);
  const seatSpot = useGame((s) => s.seatSpot);
  const seats = useGame((s) => s.seats);
  const selfId = useGame((s) => s.self?.id);
  const now = useNow();
  const mySeat = selfId ? seats.indexOf(selfId) : -1;
  const seatBtn = mySeat >= 0 || seatSpot !== null;
  if (!spots.length && !zone && !seatBtn) return null;
  const eOnSeat = seatBtn && mySeat < 0; // phím E: ngồi trước, rồi tới nghi thức

  return (
    <div className={`pointer-events-auto flex gap-2 whitespace-nowrap ${vertical ? 'flex-col items-end' : 'flex-wrap items-center justify-center'}`}>
      {mySeat >= 0 && (
        <button onClick={() => useGame.getState().stand()} className="fade-enter flex items-center gap-2 rounded-full bg-gradient-to-b from-amberwood-300 to-amberwood-500 py-2 pl-4 pr-3 font-semibold text-amberwood-900 shadow-lg ring-2 ring-white/70 active:scale-95">
          Đứng dậy <span className="hidden text-xs font-medium opacity-75 md:inline">(bồ đoàn {mySeat + 1})</span>
        </button>
      )}
      {mySeat < 0 && seatSpot !== null && (
        <button onClick={() => useGame.getState().sit(seatSpot)} className="fade-enter flex items-center gap-2 rounded-full bg-gradient-to-b from-jade-400 to-jade-600 py-2 pl-4 pr-2 font-semibold text-white shadow-lg ring-2 ring-white/70 active:scale-95">
          Ngồi bồ đoàn<span className="hidden md:inline"> {seatSpot + 1}/{HALL_SEATS.length}</span>
          <kbd className="grid h-7 w-7 place-items-center rounded-full bg-white/85 text-sm text-jade-600">E</kbd>
        </button>
      )}
      {spots.map((s, i) => {
        const def = ACTION_DEFS[s.action];
        const Icon = ACTIONS.find((a) => a.id === s.action)?.Icon;
        const left = cooldownLeft(cooldowns[s.action], now);
        return (
          <button
            key={s.action}
            onClick={() => doAction(s.action)}
            disabled={left > 0}
            className="fade-enter flex items-center gap-2 rounded-full bg-gradient-to-b from-brick-400 to-brick-600 py-2 pl-3 pr-2 font-semibold text-amber-50 shadow-lg ring-2 ring-white/70 active:scale-95 disabled:from-amberwood-500 disabled:to-amberwood-600 disabled:opacity-90"
          >
            {Icon && <Icon size={20} />}
            {def.label}
            {left > 0 ? (
              <span className="grid h-7 min-w-7 place-items-center rounded-full bg-black/25 px-1.5 text-xs tabular-nums">{left}s</span>
            ) : (
              <kbd className="grid h-7 w-7 place-items-center rounded-full bg-white/85 text-sm text-brick-700">{i === 0 && !eOnSeat ? 'E' : '•'}</kbd>
            )}
          </button>
        );
      })}
      {zone && (
        <button
          onClick={() => (zone.id === 'chess' ? useGame.setState({ chessOpen: true }) : changeScene(zone.id === 'hall-door' ? 'hall' : 'courtyard'))}
          className="fade-enter flex items-center gap-2 rounded-full bg-gradient-to-b from-amberwood-300 to-amberwood-500 py-2 pl-4 pr-2 font-semibold text-amberwood-900 shadow-lg ring-2 ring-white/70 active:scale-95"
        >
          {zone.label}
          <kbd className="grid h-7 w-7 place-items-center rounded-full bg-white/80 text-sm">{spots.length || eOnSeat ? '•' : zone.key}</kbd>
        </button>
      )}
    </div>
  );
}

/** Phím E: ngồi bồ đoàn cạnh đó → nghi thức gần nhất → đứng dậy → đi qua cửa. */
export function pressE() {
  const st = useGame.getState();
  const seated = local.seat !== null;
  if (!seated && st.seatSpot !== null) return st.sit(st.seatSpot);
  if (st.spots.length) return doAction(st.spots[0].action);
  if (seated) return st.stand();
  if (st.zone?.id === 'chess') return useGame.setState({ chessOpen: true });
  if (st.zone) st.changeScene(st.zone.id === 'hall-door' ? 'hall' : 'courtyard');
}
