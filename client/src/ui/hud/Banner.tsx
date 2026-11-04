// Banner sự kiện giữa trên: hiện rồi tự mờ dần (4,5 giây).
import { useGame } from '../../state/store';

export default function Banner() {
  const banners = useGame((s) => s.banners);
  const b = banners[banners.length - 1];
  if (!b) return null;
  return (
    <div key={b.id} className="banner-life pointer-events-none relative px-6" role="status" aria-live="polite">
      <div className="absolute inset-y-1 left-0 right-0 -skew-x-12 rounded-lg bg-gradient-to-r from-transparent via-amberwood-900/55 to-transparent" />
      <p className="relative whitespace-nowrap px-6 py-1.5 text-center text-sm font-semibold text-amber-50 [text-shadow:0_1px_2px_rgba(0,0,0,0.5)] md:text-base">
        <span className="mr-2 text-amberwood-300">✦</span>
        {b.text}
        <span className="ml-2 text-amberwood-300">✦</span>
      </p>
    </div>
  );
}
