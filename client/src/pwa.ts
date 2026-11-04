// App cài được (PWA): đăng ký service worker, báo "có bản mới", nút cài app, nhận biết iPhone/iPad.
import { create } from 'zustand';

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const nav = navigator as Navigator & { standalone?: boolean };
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const runningAsApp = () =>
  matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches || nav.standalone === true;

interface PwaState {
  /** đang chạy như app đã cài */
  installed: boolean;
  /** trình duyệt cho phép hiện hộp "Cài đặt" (Android/Chrome/Edge máy tính) */
  canPrompt: boolean;
  /** iPhone/iPad chưa cài: phải hướng dẫn tay (Chia sẻ → Thêm vào MH chính) */
  iosGuide: boolean;
  /** đang mở hướng dẫn iPhone */
  showIos: boolean;
  /** đã tải xong bản mới, chờ tải lại */
  updateReady: boolean;
}

export const usePwa = create<PwaState>(() => ({
  installed: runningAsApp(),
  canPrompt: false,
  iosGuide: isIOS && !runningAsApp(),
  showIos: false,
  updateReady: false,
}));

let deferred: InstallPromptEvent | null = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault(); // tự hiện nút trong game thay vì thanh mặc định
  deferred = e as InstallPromptEvent;
  usePwa.setState({ canPrompt: true });
});
window.addEventListener('appinstalled', () => {
  deferred = null;
  usePwa.setState({ canPrompt: false, installed: true });
});

/** Bấm nút "Cài app": hộp cài của trình duyệt, hoặc hướng dẫn trên iPhone. */
export async function installApp() {
  if (deferred) {
    const d = deferred;
    deferred = null;
    usePwa.setState({ canPrompt: false });
    await d.prompt();
    const { outcome } = await d.userChoice;
    if (outcome === 'dismissed') {
      deferred = d; // còn dùng lại được ở một số trình duyệt; nếu không, sự kiện sẽ tới lại
    }
    return;
  }
  if (usePwa.getState().iosGuide) usePwa.setState({ showIos: true });
}

// ---- service worker + cập nhật ----
let reg: ServiceWorkerRegistration | null = null;
let reloading = false;

export function applyUpdate() {
  const w = reg?.waiting;
  if (!w) return location.reload();
  reloading = true;
  w.postMessage('SKIP_WAITING');
}

function watch(r: ServiceWorkerRegistration) {
  if (r.waiting && navigator.serviceWorker.controller) usePwa.setState({ updateReady: true });
  r.addEventListener('updatefound', () => {
    const sw = r.installing;
    sw?.addEventListener('statechange', () => {
      // có controller cũ = đây là bản cập nhật (không phải lần cài đầu)
      if (sw.state === 'installed' && navigator.serviceWorker.controller) usePwa.setState({ updateReady: true });
    });
  });
}

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((r) => {
        reg = r;
        watch(r);
        const check = () => r.update().catch(() => {});
        setInterval(check, 30 * 60_000);
        document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && check());
      })
      .catch((err) => console.warn('[pwa] không đăng ký được service worker', err));
  });
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) location.reload();
  });
}
