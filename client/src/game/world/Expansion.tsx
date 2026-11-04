// Khu mở rộng: phía tây – màn hình lớn ngoài trời + ghế đá; phía đông – bảo tháp 7 tầng + vườn.
import { COURTYARD } from '@chua/shared';
import { Bonsai, C, LanternPost, Plaque, Roof } from './props';
import Screen from './Screen';

export function OutdoorScreen() {
  const S = COURTYARD.screen;
  const bottom = 2.1;
  return (
    <group>
      {/* màn hình quay về phía đông (+x), nhìn ra sân */}
      <group position={[S.x, 0, S.z]} rotation={[0, Math.PI / 2, 0]} userData={{ occluder: true }}>
        {[-1, 1].map((k) => (
          <mesh key={k} position={[(k * S.w) / 2, (bottom + S.h + 0.6) / 2, -0.1]} castShadow>
            <boxGeometry args={[0.5, bottom + S.h + 0.6, 0.5]} />
            <meshStandardMaterial color={C.lacquer} />
          </mesh>
        ))}
        <mesh position={[0, bottom + S.h / 2, -0.12]} castShadow>
          <boxGeometry args={[S.w + 0.5, S.h + 0.5, 0.15]} />
          <meshStandardMaterial color={C.wood} />
        </mesh>
        <group position={[0, bottom + S.h / 2, 0]}>
          <Screen w={S.w} h={S.h} />
        </group>
        <group position={[0, bottom + S.h + 0.35, -0.1]}>
          <Roof w={S.w + 1.6} d={1.6} h={0.9} y={0} color={C.roofTeal} />
        </group>
        <Plaque text="Phát chung" position={[0, bottom - 0.45, 0.02]} width={2.8} />
      </group>
      {/* ghế đá dài */}
      {COURTYARD.benches.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 0.42, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.7, 0.12, 2.4]} />
            <meshStandardMaterial color={C.stone} />
          </mesh>
          {[-0.85, 0.85].map((dz) => (
            <mesh key={dz} position={[0, 0.18, dz]} castShadow>
              <boxGeometry args={[0.5, 0.36, 0.3]} />
              <meshStandardMaterial color={C.stoneDark} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

export function Stupa() {
  const P = COURTYARD.stupa;
  const tiers = Array.from({ length: 7 }, (_, i) => ({ size: 4.2 - i * 0.48, y: 0.9 + i * 1.25 }));
  return (
    <group position={[P.x, 0, P.z]} userData={{ occluder: true }}>
      <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
        <boxGeometry args={[5.6, 0.9, 5.6]} />
        <meshStandardMaterial color={C.stone} />
      </mesh>
      {tiers.map((t, i) => (
        <group key={i}>
          <mesh position={[0, t.y + 0.4, 0]} castShadow>
            <boxGeometry args={[t.size, 0.8, t.size]} />
            <meshStandardMaterial color={C.wall} />
          </mesh>
          {/* cửa vòm nhỏ mỗi tầng */}
          <mesh position={[0, t.y + 0.4, t.size / 2 + 0.01]}>
            <planeGeometry args={[t.size * 0.25, 0.5]} />
            <meshStandardMaterial color={C.lacquerDark} />
          </mesh>
          <Roof w={t.size + 0.9} d={t.size + 0.9} h={0.45} y={t.y + 0.8} color={C.roof} />
        </group>
      ))}
      <mesh position={[0, 0.9 + 7 * 1.25 + 0.6, 0]}>
        <coneGeometry args={[0.28, 1.6, 8]} />
        <meshStandardMaterial color={C.gold} metalness={0.4} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.9 + 7 * 1.25 + 1.5, 0]}>
        <sphereGeometry args={[0.2, 12, 10]} />
        <meshStandardMaterial color="#f1c84b" emissive="#d99a2b" emissiveIntensity={0.5} />
      </mesh>
      <Plaque text="Bảo Tháp" position={[0, 0.9 + 0.4, 4.2 / 2 + 0.02]} width={1.6} />
    </group>
  );
}

export function EastGarden() {
  return (
    <group>
      {COURTYARD.eastBonsai.map(([x, z], i) => (
        <Bonsai key={i} position={[x, 0, z]} seed={i + 11} />
      ))}
      {COURTYARD.eastLanterns.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]} rotation={[0, x < COURTYARD.stupa.x ? 0 : Math.PI, 0]}>
          <LanternPost position={[0, 0, 0]} />
        </group>
      ))}
    </group>
  );
}
