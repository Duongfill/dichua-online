import { io, type Socket } from 'socket.io-client';
import type { ClientToServer, ServerToClient } from '@chua/shared';

export const socket: Socket<ServerToClient, ClientToServer> = io(import.meta.env.VITE_SERVER_URL || undefined, {
  autoConnect: false,
  transports: ['websocket', 'polling'],
  reconnectionDelayMax: 4000,
});

// Độ lệch đồng hồ server − client. Lấy theo gói đến nhanh nhất (độ trễ nhỏ nhất),
// rồi trôi chậm về trung bình để theo kịp nếu đồng hồ máy bị lệch dần.
let offset: number | null = null;
export function noteServerTime(serverT: number) {
  const d = serverT - Date.now();
  if (offset === null || d > offset) offset = d;
  else offset += (d - offset) * 0.02;
}
export const serverNow = () => Date.now() + (offset ?? 0);
export const resetClock = () => {
  offset = null;
};
