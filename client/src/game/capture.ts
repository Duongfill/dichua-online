// Chụp ảnh khung hình 3D hiện tại (đăng ký từ bên trong <Canvas>).
let captureFn: (() => HTMLCanvasElement | null) | null = null;
export const registerCapture = (fn: typeof captureFn) => {
  captureFn = fn;
};

/** Trả về dataURL PNG đã kèm dấu "Chùa Online · ngày giờ", hoặc null. */
export function takePhoto(): string | null {
  const src = captureFn?.();
  if (!src) return null;
  const out = document.createElement('canvas');
  out.width = src.width;
  out.height = src.height;
  const ctx = out.getContext('2d')!;
  ctx.drawImage(src, 0, 0);
  const s = Math.max(14, Math.round(out.width / 60));
  const text = `Chùa Online · ${new Date().toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}`;
  ctx.font = `600 ${s}px "Be Vietnam Pro", sans-serif`;
  const w = ctx.measureText(text).width;
  ctx.fillStyle = 'rgba(44,31,15,0.45)';
  ctx.fillRect(out.width - w - s * 1.6, out.height - s * 2.4, w + s, s * 1.7);
  ctx.fillStyle = '#fff4dc';
  ctx.fillText(text, out.width - w - s * 1.1, out.height - s * 1.15);
  return out.toDataURL('image/png');
}
