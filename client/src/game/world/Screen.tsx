// Mặt màn hình Phát chung (dùng cho màn hình ngoài sân và trong chánh điện):
// video đã tải lên → chiếu video đồng bộ; link YouTube → ảnh bìa (video xem ở khung YouTube); không phát gì → bảng chờ.
import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { useGame } from '../../state/store';
import { getVideo } from '../stream';
import { youtubeThumb } from '../youtube';

function idleTexture(text: string) {
  const cv = document.createElement('canvas');
  cv.width = 1024;
  cv.height = 576;
  const c = cv.getContext('2d')!;
  const g = c.createLinearGradient(0, 0, 0, 576);
  g.addColorStop(0, '#3a2414');
  g.addColorStop(1, '#1e120a');
  c.fillStyle = g;
  c.fillRect(0, 0, 1024, 576);
  c.fillStyle = '#e8c98a';
  c.textAlign = 'center';
  c.font = 'bold 120px serif';
  c.fillText('☸', 512, 250);
  c.font = '600 54px "Be Vietnam Pro", sans-serif';
  c.fillText(text, 512, 380);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export default function Screen({ w, h }: { w: number; h: number }) {
  const item = useGame((s) => {
    const it = s.stream?.current && s.settings.stream ? s.lib.find((i) => i.id === s.stream!.current) : undefined;
    return it;
  });
  const videoTex = useMemo(() => {
    const t = new THREE.VideoTexture(getVideo());
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  const idle = useMemo(() => idleTexture('Phát chung'), []);
  const ytLabel = useMemo(() => idleTexture('Đang phát YouTube'), []);
  const [thumb, setThumb] = useState<THREE.Texture | null>(null);
  const ytId = item?.kind === 'youtube' ? item.youtubeId : undefined;

  useEffect(() => {
    setThumb(null);
    if (!ytId) return;
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');
    let alive = true;
    loader.load(youtubeThumb(ytId), (t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      if (alive) setThumb(t);
    }, undefined, () => {}); // không tải được ảnh (CORS) → giữ chữ "Đang phát YouTube"
    return () => {
      alive = false;
    };
  }, [ytId]);

  const map = item?.videoUrl ? videoTex : ytId ? thumb ?? ytLabel : idle;
  return (
    <mesh>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial map={map} toneMapped={false} />
    </mesh>
  );
}
