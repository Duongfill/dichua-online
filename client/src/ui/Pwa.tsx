// Giao diện app (PWA): nút cài app, hướng dẫn iPhone/iPad, thanh báo có bản mới.
import { applyUpdate, installApp, usePwa } from '../pwa';

/** Nút "Cài app" – chỉ hiện khi cài được (Android/máy tính) hoặc đang ở Safari iPhone/iPad. */
export function InstallButton({ className = '' }: { className?: string }) {
  const { installed, canPrompt, iosGuide } = usePwa();
  if (installed || (!canPrompt && !iosGuide)) return null;
  return (
    <button type="button" className={`btn-glass ${className}`} onClick={() => installApp()}>
      📲 Cài app Chùa Online
    </button>
  );
}

/** Hướng dẫn thêm vào màn hình chính trên iPhone/iPad (Safari không có hộp cài tự động). */
export function IosGuide() {
  const show = usePwa((s) => s.showIos);
  if (!show) return null;
  const close = () => usePwa.setState({ showIos: false });
  return (
    <div className="fixed inset-0 z-[60] grid place-items-end bg-black/35 p-3 sm:place-items-center" onClick={close}>
      <div className="glass fade-enter w-full max-w-sm space-y-3 bg-[#fbf3e2]/95 p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <img src="/icons/icon-192.png" alt="" className="h-12 w-12 rounded-2xl shadow" />
          <div>
            <p className="font-display text-lg font-bold text-brick-700">Cài app Chùa Online</p>
            <p className="text-xs text-amberwood-800">trên iPhone / iPad</p>
          </div>
        </div>
        <ol className="space-y-2 text-sm text-amberwood-900">
          <li>
            1. Mở trang này bằng <b>Safari</b>.
          </li>
          <li>
            2. Bấm nút <b>Chia sẻ</b> <span className="inline-block rounded bg-white/70 px-1">⬆︎</span> ở thanh dưới (hoặc trên cùng trên iPad).
          </li>
          <li>
            3. Kéo xuống, chọn <b>Thêm vào MH chính</b> <span className="inline-block rounded bg-white/70 px-1">＋</span>, rồi bấm <b>Thêm</b>.
          </li>
          <li>4. Mở Chùa Online từ biểu tượng mới trên màn hình chính.</li>
        </ol>
        <button type="button" className="btn-primary w-full" onClick={close}>
          Đã hiểu
        </button>
      </div>
    </div>
  );
}

/** Thanh nhỏ phía trên: đã có bản mới → bấm để tải lại. */
export function UpdateBanner() {
  const ready = usePwa((s) => s.updateReady);
  if (!ready) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-2 z-[55] flex justify-center px-3">
      <div className="glass pointer-events-auto fade-enter flex items-center gap-3 rounded-full px-4 py-2 text-sm font-medium">
        <span>✨ Đã có bản mới của Chùa Online</span>
        <button type="button" className="btn-primary px-3 py-1 text-xs" onClick={applyUpdate}>
          Tải lại
        </button>
        <button type="button" className="text-amberwood-800/70" aria-label="Để sau" onClick={() => usePwa.setState({ updateReady: false })}>
          ✕
        </button>
      </div>
    </div>
  );
}
