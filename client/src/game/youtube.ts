// Phát link YouTube bằng trình phát nhúng CHÍNH THỨC (IFrame API) – luôn hiện khung video theo quy định YouTube.
// Khung là phần tử DOM cố định tạo 1 lần (không bị tải lại khi đổi khu vực), đồng bộ theo giờ server.
import { streamPos } from '@chua/shared';
import { serverNow, socket } from '../net/socket';
import { useGame } from '../state/store';

interface YTPlayer {
  loadVideoById(o: { videoId: string; startSeconds?: number }): void;
  cueVideoById(o: { videoId: string; startSeconds?: number }): void;
  playVideo(): void;
  pauseVideo(): void;
  seekTo(s: number, allow: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  setVolume(v: number): void;
}
type YTNS = { Player: new (el: HTMLElement, o: object) => YTPlayer };
const w = window as unknown as { YT?: YTNS; onYouTubeIframeAPIReady?: () => void };

let api: Promise<YTNS> | null = null;
const loadApi = () =>
  (api ??= new Promise<YTNS>((resolve) => {
    if (w.YT?.Player) return resolve(w.YT);
    w.onYouTubeIframeAPIReady = () => resolve(w.YT!);
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(s);
  }));

// ---- khung nổi ----
const dock = document.createElement('div');
dock.className = 'yt-dock';
dock.dataset.size = 'small';
dock.innerHTML = `<div class="yt-bar"><span class="yt-title">YouTube</span><button type="button" class="yt-size" title="Phóng to / thu nhỏ">⤢</button></div><div class="yt-frame"><div></div></div>`;
document.body.appendChild(dock);
const titleEl = dock.querySelector('.yt-title') as HTMLElement;
dock.querySelector('.yt-size')!.addEventListener('click', () => {
  dock.dataset.size = dock.dataset.size === 'large' ? 'small' : 'large';
});

let player: YTPlayer | null = null;
let ready = false;
let loadedId = '';
let stuck = 0;
const reported = new Set<string>();
let errorText = '';

async function ensurePlayer() {
  if (player) return;
  const YT = await loadApi();
  if (player) return;
  player = new YT.Player(dock.querySelector('.yt-frame > div') as HTMLElement, {
    width: '100%',
    height: '100%',
    playerVars: { playsinline: 1, rel: 0, modestbranding: 1 },
    events: {
      onReady: () => {
        ready = true;
        syncYoutube();
      },
      onError: (e: { data: number }) => {
        errorText = e.data === 101 || e.data === 150 ? 'Chủ kênh không cho phép nhúng video này' : 'Không phát được video YouTube';
        syncYoutube();
      },
    },
  });
}

export function syncYoutube() {
  const s = useGame.getState();
  const st = s.stream;
  const item = st?.current ? s.lib.find((i) => i.id === st.current) : undefined;
  const show = s.phase === 'playing' && s.settings.stream && item?.kind === 'youtube' && !!item.youtubeId;
  dock.dataset.show = show ? '1' : '0';
  if (!show) {
    if (ready && player && player.getPlayerState() === 1) player.pauseVideo();
    return;
  }
  ensurePlayer();
  if (!ready || !player || !st) return;
  const pos = streamPos(st, serverNow());
  if (loadedId !== item!.youtubeId) {
    loadedId = item!.youtubeId!;
    errorText = '';
    stuck = 0;
    const o = { videoId: loadedId, startSeconds: Math.max(0, pos) };
    st.paused || pos < 0 ? player.cueVideoById(o) : player.loadVideoById(o);
  }
  player.setVolume(Math.round(s.settings.volMusic * 100));
  const state = player.getPlayerState(); // -1 chưa chạy · 0 hết · 1 đang phát · 2 dừng · 3 đang tải · 5 đã nạp
  if (st.paused || pos < 0) {
    if (state === 1) player.pauseVideo();
  } else {
    if (state !== 1 && state !== 3) {
      player.playVideo();
      stuck++;
    } else stuck = 0;
    if (state === 1 && Math.abs(player.getCurrentTime() - pos) > 1.5) player.seekTo(pos, true);
  }
  // báo thời lượng lên server để tự chuyển bài khi hết
  const d = player.getDuration();
  if (item!.duration === 0 && d > 0 && !reported.has(item!.id)) {
    reported.add(item!.id);
    socket.emit('stream:ytDuration', { id: item!.id, duration: d });
  }
  titleEl.textContent = errorText || (stuck > 2 ? '▶ Chạm vào video để phát' : `♪ ${item!.title}`);
}

setInterval(syncYoutube, 1000);
useGame.subscribe((s, p) => {
  if (s.stream !== p.stream || s.lib !== p.lib || s.phase !== p.phase || s.settings !== p.settings) syncYoutube();
});

/** Ảnh bìa video YouTube (cho màn hình 3D). */
export const youtubeThumb = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
