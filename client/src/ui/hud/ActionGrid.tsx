// Cột phải: lưới 3 cột các hành động + nút Chụp ảnh. Thu gọn được (mặc định thu gọn trên điện thoại).
import { useState } from 'react';
import { useGame } from '../../state/store';
import { takePhoto } from '../../game/capture';
import { ACTION_IDS, type ActionId } from '@chua/shared';
import { ACTIONS, type ActionDef } from '../actions';
import { cooldownLeft, doAction, useNow } from './Interact';
import { CameraIcon, ChevronRightIcon, CloseIcon, GridIcon } from '../icons';

function ActionButton({ a, onClick, cooldown, soon }: { a: ActionDef; onClick: () => void; cooldown: number; soon: boolean }) {
  return (
    <button
      onClick={onClick}
      className="group flex w-[58px] flex-col items-center gap-1 active:scale-90 md:w-16"
      aria-label={`${a.label}${cooldown ? `, còn ${cooldown} giây` : ''}${soon ? ' (sắp ra mắt)' : ''}`}
    >
      <span className={`relative grid h-11 w-11 place-items-center overflow-hidden rounded-2xl bg-gradient-to-b text-white shadow-md ring-2 ring-white/60 transition group-hover:-translate-y-0.5 md:h-12 md:w-12 ${a.tone} ${soon ? 'opacity-60 saturate-50' : ''}`}>
        <a.Icon size={22} />
        {cooldown > 0 && (
          <span className="absolute inset-0 grid place-items-center bg-black/45 text-sm font-bold tabular-nums">{cooldown}</span>
        )}
      </span>
      <span className="text-center text-[10px] font-semibold leading-tight text-amberwood-900 [text-shadow:0_1px_0_rgba(255,255,255,0.6)] md:text-[11px]">
        {a.label}
      </span>
    </button>
  );
}

export default function ActionGrid() {
  const open = useGame((s) => s.actionsOpen);
  const toast = useGame((s) => s.toast);
  const cooldowns = useGame((s) => s.cooldowns);
  const now = useNow();
  const [flash, setFlash] = useState(false);
  const live = (id: string): id is ActionId => (ACTION_IDS as string[]).includes(id);

  const act = (a: ActionDef) => {
    if (live(a.id)) doAction(a.id);
    else toast(`${a.label}: sắp ra mắt 🙏`);
  };

  const photo = () => {
    const url = takePhoto();
    if (!url) return toast('Chưa chụp được ảnh, xin thử lại.', 'warn');
    setFlash(true);
    setTimeout(() => setFlash(false), 250);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chua-online-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.png`;
    a.click();
    toast('Đã lưu ảnh chụp 📷');
  };

  if (!open) {
    return (
      <button
        onClick={() => useGame.setState({ actionsOpen: true })}
        className="pointer-events-auto grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-b from-brick-400 to-brick-600 text-amber-50 shadow-lg ring-2 ring-white/60 active:scale-90"
        aria-label="Mở bảng hành động"
        title="Hành động"
      >
        <GridIcon />
      </button>
    );
  }

  return (
    <>
      <div className="glass pointer-events-auto p-2 md:p-2.5">
        <div className="mb-1.5 flex items-center justify-between px-1">
          <span className="text-xs font-bold text-brick-700">Hành động</span>
          <button
            onClick={() => useGame.setState({ actionsOpen: false })}
            className="grid h-6 w-6 place-items-center rounded-full text-amberwood-800 hover:bg-white/50"
            aria-label="Thu gọn bảng hành động"
          >
            <span className="md:hidden"><CloseIcon size={16} /></span>
            <span className="hidden md:block"><ChevronRightIcon size={16} /></span>
          </button>
        </div>
        <div className="grid grid-cols-3 gap-x-1 gap-y-2">
          {ACTIONS.map((a) => (
            <ActionButton
              key={a.id}
              a={a}
              onClick={() => act(a)}
              soon={!live(a.id)}
              cooldown={live(a.id) ? cooldownLeft(cooldowns[a.id], now) : 0}
            />
          ))}
        </div>
        <button onClick={photo} className="btn-glass mt-2 flex w-full items-center justify-center gap-2 py-2">
          <CameraIcon size={18} /> Chụp ảnh
        </button>
      </div>
      {flash && <div className="pointer-events-none fixed inset-0 z-50 bg-white/80" />}
    </>
  );
}
