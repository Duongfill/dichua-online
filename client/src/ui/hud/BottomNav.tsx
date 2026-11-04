import { useGame } from '../../state/store';
import { NAV } from '../actions';

export default function BottomNav() {
  const panel = useGame((s) => s.panel);
  const openPanel = useGame((s) => s.openPanel);
  return (
    <nav
      aria-label="Chức năng"
      className="pointer-events-auto flex w-full items-stretch justify-between gap-0.5 border-t border-white/40 bg-white/40 px-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-1 shadow-glass backdrop-blur-md md:w-auto md:justify-center md:gap-1 md:rounded-full md:border md:p-1.5"
    >
      {NAV.map(({ id, label, Icon }) => {
        const active = panel === id;
        return (
          <button
            key={id}
            onClick={() => openPanel(active ? null : id)}
            aria-pressed={active}
            title={label}
            className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-2xl px-1 py-1 text-amberwood-900 transition active:scale-90 md:flex-none md:flex-row md:gap-1.5 md:rounded-full md:px-3 md:py-1.5 ${
              active ? 'bg-brick-500 text-amber-50 shadow' : 'hover:bg-white/50'
            }`}
          >
            <Icon size={20} />
            <span className="truncate text-[9.5px] font-semibold md:hidden xl:inline xl:text-xs">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
