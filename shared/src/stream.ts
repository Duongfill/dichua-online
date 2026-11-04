// Phát chung (giai đoạn 5): thư viện nội dung, hàng chờ, trạng thái phát đồng bộ.
export const MEDIA_MAX_MB = 50;
export const MEDIA_TOTAL_MB = 500;
export const MEDIA_EXT = ['mp3', 'wav', 'm4a', 'ogg', 'mp4', 'webm'] as const;

export interface MediaItem {
  id: string;
  title: string;
  kind: 'audio' | 'video' | 'youtube';
  duration: number; // giây
  uploader: string;
  status: 'processing' | 'pending' | 'ready' | 'error'; // pending = chờ admin duyệt
  createdAt: number;
  reports: number;
  audioUrl?: string; // /media/<id>.mp3
  videoUrl?: string; // /media/<id>.mp4 (chiếu màn hình chánh điện / ngoài sân)
  youtubeId?: string; // link YouTube: phát bằng trình phát nhúng chính thức
  error?: string;
}

export type PlayMode = 'all' | 'one' | 'shuffle';

export interface StreamState {
  queue: string[];
  current: string | null;
  startedAt: number; // giờ server khi vị trí = 0
  paused: boolean;
  pausedAt: number; // vị trí (giây) lúc tạm dừng
  mode: PlayMode;
}

export type StreamOp =
  | { op: 'play' | 'pause' | 'next' | 'prev' }
  | { op: 'seek'; pos: number }
  | { op: 'mode'; mode: PlayMode }
  | { op: 'playNow' | 'enqueue' | 'dequeue' | 'approve' | 'reject' | 'remove'; id: string }
  | { op: 'move'; id: string; dir: -1 | 1 };

/** Lấy mã video (11 ký tự) từ link YouTube: watch?v=, youtu.be/, shorts/, embed/, live/. */
export function parseYoutubeId(url: string): string | null {
  const s = String(url || '').trim();
  const m =
    s.match(/^(?:https?:\/\/)?(?:www\.|m\.|music\.)?youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)([A-Za-z0-9_-]{11})/) ||
    s.match(/^(?:https?:\/\/)?youtu\.be\/([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

/** Vị trí phát hiện tại (giây) theo giờ server. */
export const streamPos = (s: StreamState, serverNow: number) => (s.paused ? s.pausedAt : (serverNow - s.startedAt) / 1000);
