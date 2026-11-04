// Khu "Sân chùa" (ngoài trời). Vị trí công trình lấy từ @chua/shared/world để khớp va chạm.
import { useMemo } from 'react';
import { Sky } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';
import { COURTYARD } from '@chua/shared';
import { brickTexture } from './textures';
import ChessTable from './ChessTable';
import { EastGarden, OutdoorScreen, Stupa } from './Expansion';
import {
  BellPavilion, BigTree, Bonsai, C, Column, FlagString, IncenseBurner, LanternPost, LotusPond, Plaque, Roof,
} from './props';

type V3 = [number, number, number];
const H = COURTYARD.hallBuilding;

/** Chánh điện nhìn từ ngoài (đi vào bằng cửa chính – chuyển scene). */
function HallBuilding() {
  const front = H.z + H.d / 2; // mặt trước (z lớn hơn)
  return (
    <group position={[H.x, 0, 0]} userData={{ occluder: true }}>
      {/* nền bậc cấp */}
      <mesh position={[0, 0.35, H.z]} receiveShadow castShadow>
        <boxGeometry args={[H.w + 1.5, 0.7, H.d + 1.2]} />
        <meshStandardMaterial color={C.stone} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0, 0.12 + i * 0.2, front + 1.3 - i * 0.35]} receiveShadow>
          <boxGeometry args={[5, 0.24, 0.5]} />
          <meshStandardMaterial color={C.stone} />
        </mesh>
      ))}
      {/* tường */}
      <mesh position={[0, 2.7, H.z]} castShadow receiveShadow>
        <boxGeometry args={[H.w - 2, 4, H.d - 2]} />
        <meshStandardMaterial color={C.wall} />
      </mesh>
      {/* hàng cột hiên */}
      {[-7.5, -4.5, -1.6, 1.6, 4.5, 7.5].map((x) => (
        <Column key={x} position={[x, 0.7, front - 0.4]} h={4} />
      ))}
      {/* cửa chính rộng, bên trong sáng ấm */}
      <mesh position={[0, 2.2, front - 0.98]}>
        <boxGeometry args={[3.2, 3, 0.1]} />
        <meshStandardMaterial color="#3b1a0e" emissive="#ff9a4a" emissiveIntensity={0.35} />
      </mesh>
      <mesh position={[0, 3.8, front - 0.95]}>
        <boxGeometry args={[3.6, 0.18, 0.14]} />
        <meshStandardMaterial color={C.gold} metalness={0.3} roughness={0.4} />
      </mesh>
      {/* cửa sổ tròn */}
      {[-5.5, 5.5].map((x) => (
        <mesh key={x} position={[x, 2.8, front - 0.97]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.7, 0.7, 0.08, 20]} />
          <meshStandardMaterial color={C.lacquerDark} />
        </mesh>
      ))}
      <group position={[0, 0, H.z]}>
        <Roof w={H.w + 2} d={H.d + 1.5} h={2.4} y={4.7} />
        <Roof w={H.w - 5} d={H.d - 2.5} h={2.6} y={6.4} />
        {/* bờ nóc + "lưỡng long chầu nguyệt" cách điệu: viên ngọc giữa */}
        <mesh position={[0, 8.95, 0]}>
          <sphereGeometry args={[0.38, 16, 12]} />
          <meshStandardMaterial color="#f1c84b" emissive="#d99a2b" emissiveIntensity={0.4} metalness={0.4} roughness={0.3} />
        </mesh>
      </group>
      <Plaque text="Chánh Điện" position={[0, 4.35, front - 0.2]} width={3.6} />
      <LanternPost position={[-2.8, 0.7, front + 0.2]} light />
      <LanternPost position={[2.8, 0.7, front + 0.2]} light />
    </group>
  );
}

/** Cổng tam quan cách điệu ở phía Nam. */
function Gate() {
  const z = COURTYARD.gate.z;
  return (
    <group position={[0, 0, z]} userData={{ occluder: true }}>
      {[-3.4, 3.4].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh position={[0, 2.2, 0]} castShadow>
            <boxGeometry args={[0.9, 4.4, 0.9]} />
            <meshStandardMaterial color={C.lacquer} />
          </mesh>
          <mesh position={[0, 4.6, 0]}>
            <sphereGeometry args={[0.35, 12, 10]} />
            <meshStandardMaterial color={C.gold} metalness={0.3} />
          </mesh>
        </group>
      ))}
      <group position={[0, 0, 0]}>
        <Roof w={8.6} d={2.2} h={1.2} y={4.2} color={C.roofTeal} />
      </group>
      <Plaque text="Chùa Online" position={[0, 3.55, 0.47]} width={3.4} />
      <Plaque text="Chùa Online" position={[0, 3.55, -0.47]} width={3.4} />
      {/* tường bao hai bên */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 26, 0.9, 0.3]} castShadow receiveShadow>
          <boxGeometry args={[44, 1.8, 0.6]} />
          <meshStandardMaterial color={C.wall} />
        </mesh>
      ))}
    </group>
  );
}

const POLE_TOP = 3.35;
const FLAG_LINES: [V3, V3][] = [
  ...COURTYARD.lanternPoles.filter((_, i) => i % 2 === 0).map(([x, z]): [V3, V3] => [[x, POLE_TOP, z], [-x, POLE_TOP, z]]),
  [[-3.5, POLE_TOP, 16], [-3.5, POLE_TOP, 10]],
  [[3.5, POLE_TOP, 16], [3.5, POLE_TOP, 10]],
  [[-3.5, POLE_TOP, 10], [-3.5, POLE_TOP, 4]],
  [[3.5, POLE_TOP, 10], [3.5, POLE_TOP, 4]],
];

export default function Courtyard({ onGround }: { onGround: (e: ThreeEvent<MouseEvent>) => void }) {
  const plazaTex = useMemo(() => brickTexture([44, 17]), []);
  const hills = useMemo(
    () => Array.from({ length: 14 }).map((_, i) => {
      const a = (i / 14) * Math.PI * 2;
      const d = 70 + (i % 3) * 10;
      return { p: [Math.cos(a) * d, 0, Math.sin(a) * d] as V3, h: 10 + ((i * 7) % 5) * 4, r: 14 + (i % 4) * 4 };
    }),
    [],
  );

  return (
    <group>
      <Sky distance={4500} sunPosition={[40, 22, 30]} turbidity={5} rayleigh={1.2} mieCoefficient={0.006} />
      <hemisphereLight args={['#fff2d8', '#7a8f5a', 0.85]} />
      <directionalLight
        position={[18, 28, 14]}
        intensity={1.6}
        color="#fff0d2"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
        shadow-bias={-0.0005}
      />

      {/* cỏ */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow onClick={onGround}>
        <circleGeometry args={[110, 48]} />
        <meshStandardMaterial color="#9bbb7c" />
      </mesh>
      {/* sân gạch đỏ */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 5.5]} receiveShadow onClick={onGround}>
        <planeGeometry args={[88, 34]} />
        <meshStandardMaterial map={plazaTex} roughness={0.9} />
      </mesh>
      {/* lối đi lát đá chính giữa */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 7]} receiveShadow onClick={onGround}>
        <planeGeometry args={[3, 34]} />
        <meshStandardMaterial color="#d8c7a6" roughness={0.95} />
      </mesh>

      {/* đồi xa */}
      {hills.map((h, i) => (
        <mesh key={i} position={[h.p[0], h.h / 2 - 1, h.p[2]]}>
          <coneGeometry args={[h.r, h.h, 7]} />
          <meshStandardMaterial color={i % 2 ? '#8faf7a' : '#7d9f6c'} flatShading />
        </mesh>
      ))}

      <HallBuilding />
      <Gate />
      <IncenseBurner position={[COURTYARD.incense.x, 0, COURTYARD.incense.z]} />
      <LotusPond position={[COURTYARD.pond.x, 0, COURTYARD.pond.z]} r={COURTYARD.pond.r} />
      <BellPavilion position={[COURTYARD.bell.x, 0, COURTYARD.bell.z]} />
      <ChessTable />
      <OutdoorScreen />
      <Stupa />
      <EastGarden />
      {COURTYARD.bonsai.map(([x, z], i) => (
        <Bonsai key={i} position={[x, 0, z]} seed={i + 1} />
      ))}
      {COURTYARD.bigTrees.map(([x, z], i) => (
        <BigTree key={i} position={[x, 0, z]} seed={i * 1.3} />
      ))}
      {COURTYARD.lanternPoles.map(([x, z], i) => (
        <group key={i} rotation={[0, x < 0 ? 0 : Math.PI, 0]} position={[x, 0, z]}>
          <LanternPost position={[0, 0, 0]} />
        </group>
      ))}
      {FLAG_LINES.map(([a, b], i) => (
        <FlagString key={i} a={a} b={b} sag={0.5} />
      ))}
    </group>
  );
}
