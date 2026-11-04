import { Suspense, useCallback, useEffect } from 'react';
import { Canvas, useThree, type ThreeEvent } from '@react-three/fiber';
import { useGame } from '../state/store';
import CameraRig from './CameraRig';
import { LocalPlayer, RemotePlayers } from './Players';
import Courtyard from './world/Courtyard';
import Hall from './world/Hall';
import { local } from './local';
import { registerCapture } from './capture';

const ATMOS = {
  courtyard: { bg: '#cfe3ee', fog: '#e8ddc6', near: 45, far: 120 },
  hall: { bg: '#2a1a10', fog: '#2a1a10', near: 18, far: 40 },
} as const;

/** Cho phép HUD chụp ảnh: vẽ lại một khung rồi lấy canvas ngay trong cùng tick. */
function CaptureBridge() {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    registerCapture(() => {
      gl.render(scene, camera);
      return gl.domElement;
    });
    return () => registerCapture(null);
  }, [gl, scene, camera]);
  return null;
}

export default function GameCanvas() {
  const scene = useGame((s) => s.scene);
  const shadows = useGame((s) => s.settings.shadows);
  const quality = useGame((s) => s.settings.quality);

  // Bấm (không kéo) lên mặt đất → đi tới đó
  const onGround = useCallback((e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 8) return;
    e.stopPropagation();
    local.target = { x: e.point.x, z: e.point.z };
  }, []);

  return (
    <Canvas
      // đổi bật/tắt bóng cần biên dịch lại shader → dựng lại Canvas (trạng thái game nằm ngoài React nên không mất)
      key={shadows ? 'shadow' : 'flat'}
      shadows={shadows}
      dpr={quality === 'high' ? [1, 1.75] : [0.75, 1]}
      camera={{ fov: 50, near: 0.1, far: 400, position: [0, 6, 12] }}
      gl={{ antialias: quality === 'high', powerPreference: 'high-performance' }}
    >
      {/* key theo khu vực → gỡ nền cũ trước rồi mới gắn nền mới */}
      <color key={`bg-${scene}`} attach="background" args={[ATMOS[scene].bg]} />
      <fog key={`fog-${scene}`} attach="fog" args={[ATMOS[scene].fog, ATMOS[scene].near, ATMOS[scene].far]} />
      <Suspense fallback={null}>
        {scene === 'courtyard' ? <Courtyard onGround={onGround} /> : <Hall onGround={onGround} />}
        <LocalPlayer />
        <RemotePlayers />
        <CameraRig scene={scene} />
      </Suspense>
      <CaptureBridge />
    </Canvas>
  );
}
