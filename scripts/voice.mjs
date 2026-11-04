// Chạy máy chủ LiveKit cho voice khi dev (`npm run voice`).
// Ưu tiên tools/livekit/livekit-server(.exe); không có thì dùng livekit-server trong PATH.
// Chế độ --dev: API key "devkey", secret "secret" (khớp .env.example). CHỈ dùng trên máy mình.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const local = path.join(root, 'tools', 'livekit', process.platform === 'win32' ? 'livekit-server.exe' : 'livekit-server');
const bin = fs.existsSync(local) ? local : 'livekit-server';

// --bind 127.0.0.1: cổng tín hiệu (7880) chỉ cho máy này. Cổng âm thanh WebRTC (UDP 7882) LiveKit tự mở
// trên địa chỉ mạng của máy và tự báo cho trình duyệt – KHÔNG đặt --node-ip 127.0.0.1 vì Chrome không gửi
// WebRTC qua loopback (ICE sẽ thất bại).
// Muốn điện thoại cùng Wi-Fi dùng voice: đặt LIVEKIT_BIND=0.0.0.0 (và LIVEKIT_NODE_IP=<IP máy tính> nếu máy có nhiều mạng).
const args = ['--dev', '--bind', process.env.LIVEKIT_BIND || '127.0.0.1'];
if (process.env.LIVEKIT_NODE_IP) args.push('--node-ip', process.env.LIVEKIT_NODE_IP);
console.log(`[voice] ${bin} ${args.join(' ')}`);

const child = spawn(bin, args, { stdio: 'inherit' });
child.on('error', (err) => {
  console.error(
    `\n✖ Không chạy được livekit-server (${err.message}).\n` +
      '  Tải bản cho hệ điều hành của bạn tại https://github.com/livekit/livekit/releases\n' +
      '  rồi giải nén vào chua3d/tools/livekit/  (hoặc dùng `docker compose up -d`).\n',
  );
  process.exit(1);
});
child.on('exit', (code) => process.exit(code ?? 0));
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => child.kill());
