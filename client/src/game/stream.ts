// Phát chung: phát đồng bộ theo giờ server + chỉnh lệch; video (nếu có) chiếu lên màn hình chánh điện.
import { streamPos } from '@chua/shared';
import { serverNow } from '../net/socket';
import { useGame } from '../state/store';
import { connectMedia, setMusicDuck } from './bgm';

const DRIFT = 0.6; // giây
const audio = new Audio();
audio.preload = 'auto';
audio.crossOrigin = 'anonymous';
let gain: GainNode | null = null;
let video: HTMLVideoElement | null = null; // tạo khi chánh điện cần chiếu

export function getVideo() {
  if (!video) {
    video = document.createElement('video');
    Object.assign(video, { muted: true, playsInline: true, preload: 'auto', crossOrigin: 'anonymous' });
  }
  return video;
}

function applyVolume() {
  const s = useGame.getState();
  const v = s.settings.stream ? s.settings.volMusic : 0;
  if (!gain) gain = connectMedia(audio); // sau khi người dùng đã chạm (AudioContext sẵn sàng)
  if (gain) gain.gain.value = v;
  else audio.volume = v;
}

function syncEl(el: HTMLMediaElement, url: string | undefined, pos: number, playing: boolean) {
  if (!url) {
    if (!el.paused) el.pause();
    return;
  }
  if (!el.src.endsWith(url)) el.src = url;
  if (!playing || pos < 0) {
    if (!el.paused) el.pause();
    if (pos >= 0 && el.readyState >= 1 && Math.abs(el.currentTime - pos) > DRIFT) el.currentTime = pos;
    return;
  }
  if (el.readyState >= 1 && Math.abs(el.currentTime - pos) > DRIFT) el.currentTime = pos;
  if (el.paused) el.play().catch(() => useGame.setState({ streamBlocked: true }));
}

/** Đồng bộ lại (gọi mỗi khi trạng thái đổi + định kỳ). */
export function syncStream() {
  const s = useGame.getState();
  const st = s.stream;
  const item = st?.current ? s.lib.find((i) => i.id === st.current) : undefined;
  const on = s.phase === 'playing' && s.settings.stream && !!item && !st!.paused;
  const pos = st ? streamPos(st, serverNow()) : 0;
  applyVolume();
  syncEl(audio, s.phase === 'playing' && s.settings.stream ? item?.audioUrl : undefined, pos, on);
  if (video) syncEl(video, s.scene === 'hall' ? item?.videoUrl : undefined, pos, on);
  setMusicDuck(on ? 0.25 : 1); // nhạc nền nhỏ lại khi đang phát kinh
}

/** Người dùng chạm "Nghe" khi trình duyệt chặn tự phát. */
export function resumeStream() {
  useGame.setState({ streamBlocked: false });
  audio.play().catch(() => {});
  syncStream();
}

audio.addEventListener('playing', () => useGame.getState().streamBlocked && useGame.setState({ streamBlocked: false }));
setInterval(syncStream, 1000);
useGame.subscribe((s, p) => {
  if (s.stream !== p.stream || s.lib !== p.lib || s.scene !== p.scene || s.phase !== p.phase || s.settings !== p.settings) syncStream();
});

/** Tải lên với tiến trình (fetch không báo tiến trình → dùng XHR). */
export function uploadMedia(file: File, title: string, socketId: string, onProgress: (p: number) => void) {
  return new Promise<{ ok: boolean; error?: string; pending?: boolean }>((resolve) => {
    const fd = new FormData();
    fd.append('title', title);
    fd.append('agree', '1');
    fd.append('file', file);
    const x = new XMLHttpRequest();
    x.open('POST', '/api/media/upload');
    x.setRequestHeader('x-socket-id', socketId);
    x.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    x.onload = () => {
      try {
        resolve(JSON.parse(x.responseText));
      } catch {
        resolve({ ok: false, error: `Lỗi máy chủ (${x.status}).` });
      }
    };
    x.onerror = () => resolve({ ok: false, error: 'Mất kết nối khi tải lên.' });
    x.send(fd);
  });
}

if (import.meta.env.DEV) (window as unknown as { __stream: object }).__stream = { audio, getVideo }; // chỉ để debug
