// Service worker của app Chùa Online (PWA).
// - Trang (index.html): lấy mạng trước, mất mạng thì dùng bản đã lưu → luôn có bản mới nhất khi online.
// - /assets/* (tên có mã băm, không bao giờ đổi), /icons, /audio: lưu lại, lần sau mở tức thì.
// - Không đụng tới socket.io, /api, /media (Phát chung), LiveKit, YouTube… (đi thẳng ra mạng).
// Bản mới: chờ người dùng bấm "Tải lại" (tin nhắn SKIP_WAITING) mới thay bản cũ.
const VERSION = 'v1';
const PAGES = `pages-${VERSION}`;
const STATIC = `static-${VERSION}`;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(PAGES).then((c) => c.addAll(['/', '/manifest.webmanifest', '/icons/icon-192.png'])).catch(() => {}));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== PAGES && k !== STATIC).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (e) => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const p = url.pathname;
  if (p.startsWith('/socket.io') || p.startsWith('/api') || p.startsWith('/media') || p === '/healthz') return;

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(PAGES).then((c) => c.put('/', copy));
          return res;
        })
        .catch(() => caches.match('/').then((r) => r || Response.error())),
    );
    return;
  }

  if (p.startsWith('/assets/') || p.startsWith('/icons/') || p.startsWith('/audio/')) {
    e.respondWith(
      caches.open(STATIC).then((c) =>
        c.match(req).then(
          (hit) =>
            hit ||
            fetch(req).then((res) => {
              if (res.ok && res.status === 200) c.put(req, res.clone());
              return res;
            }),
        ),
      ),
    );
  }
});
