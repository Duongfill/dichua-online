import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const SERVER = process.env.SERVER_URL || 'http://localhost:3180';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5180,
    strictPort: true, // báo lỗi rõ ràng thay vì âm thầm nhảy sang cổng khác
    proxy: {
      '/socket.io': { target: SERVER, ws: true },
      '/api': SERVER,
      '/media': SERVER,
    },
  },
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: { manualChunks: { three: ['three'], r3f: ['@react-three/fiber', '@react-three/drei'] } },
    },
  },
});
