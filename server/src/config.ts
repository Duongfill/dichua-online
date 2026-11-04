import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(here, '..', '..');

// Đọc chua3d/.env (nếu có) – không ghi đè biến đã đặt sẵn trong môi trường.
try {
  const text = fs.readFileSync(path.join(ROOT, '.env'), 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
    }
  }
} catch {
  /* không có .env */
}

const isDev = process.argv.includes('--dev');

export const config = {
  isDev,
  // Khi dev luôn dùng 3180 (Vite proxy tới đây) – bỏ qua PORT có sẵn trong môi trường.
  port: isDev ? Number(process.env.DEV_SERVER_PORT) || 3180 : Number(process.env.PORT) || 3180,
  clientDist: path.join(ROOT, 'client', 'dist'),
  corsOrigin: process.env.CORS_ORIGIN || null,
  resumeGraceMs: 15_000,
  /** Voice (LiveKit). Thiếu 1 trong 3 biến → tắt voice, game vẫn chạy. */
  livekit: {
    url: process.env.LIVEKIT_URL || '',
    apiKey: process.env.LIVEKIT_API_KEY || '',
    apiSecret: process.env.LIVEKIT_API_SECRET || '',
  },
};

export const voiceEnabled = () => !!(config.livekit.url && config.livekit.apiKey && config.livekit.apiSecret);
