// Các vật thể low-poly dựng từ khối cơ bản – toàn bộ tự thiết kế.
// Muốn thay model thật: tạo /public/models/<ten>.glb rồi đổi nội dung component tương ứng
// thành <primitive object={useGLTF('/models/<ten>.glb').scene.clone()} />, giữ nguyên vị trí/props.
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { plaqueTexture } from './textures';
import { IncenseOfferings, PondLife, useBellFx } from './Fx';

export const C = {
  lacquer: '#a8321f', // đỏ son
  lacquerDark: '#7a2418',
  gold: '#d9a441',
  bronze: '#8a6a3a',
  roof: '#6e3626',
  roofTeal: '#4f7a68',
  wall: '#efe3c8',
  stone: '#bfae94',
  stoneDark: '#8f8270',
  wood: '#6b4528',
  leaf: '#5f8f4e',
  leafDark: '#476f3b',
  water: '#5c9a95',
  lotus: '#f0a3b5',
};

/** Mái chồng diêm kiểu chibi: chóp 4 mặt + đầu đao cong vàng ở 4 góc. */
export function Roof({ w, d, h, y, color = C.roof }: { w: number; d: number; h: number; y: number; color?: string }) {
  const r = w / Math.SQRT2;
  return (
    <group position={[0, y, 0]}>
      <mesh rotation={[0, Math.PI / 4, 0]} scale={[1, 1, d / w]} position={[0, h / 2, 0]} castShadow receiveShadow>
        <coneGeometry args={[r, h, 4, 1]} />
        <meshStandardMaterial color={color} roughness={0.8} flatShading />
      </mesh>
      {/* diềm mái */}
      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[w * 0.98, 0.14, d * 0.98]} />
        <meshStandardMaterial color={C.gold} roughness={0.5} />
      </mesh>
      {/* đầu đao */}
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], i) => (
        <mesh key={i} position={[(sx * w) / 2, 0.35, (sz * d) / 2]} rotation={[sz * -0.5, 0, sx * 0.5]} castShadow>
          <coneGeometry args={[0.16, 0.9, 6]} />
          <meshStandardMaterial color={C.gold} roughness={0.4} metalness={0.3} />
        </mesh>
      ))}
    </group>
  );
}

export function Plaque({ text, position, width = 3.2 }: { text: string; position: [number, number, number]; width?: number }) {
  const map = useMemo(() => plaqueTexture(text), [text]);
  return (
    <mesh position={position}>
      <planeGeometry args={[width, width / 4]} />
      <meshStandardMaterial map={map} roughness={0.6} />
    </mesh>
  );
}

export function Column({ position, h = 4, r = 0.28, color = C.lacquer }: { position: [number, number, number]; h?: number; r?: number; color?: string }) {
  return (
    <group position={position}>
      <mesh position={[0, h / 2, 0]} castShadow>
        <cylinderGeometry args={[r, r * 1.05, h, 12]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[r * 1.5, r * 1.6, 0.24, 12]} />
        <meshStandardMaterial color={C.stone} />
      </mesh>
    </group>
  );
}

/** Đèn lồng đỏ treo trên trụ gỗ. */
export function LanternPost({ position, light = false }: { position: [number, number, number]; light?: boolean }) {
  const lamp = useRef<THREE.Group>(null);
  const seed = useMemo(() => Math.random() * 10, []);
  useFrame(({ clock }) => {
    if (lamp.current) lamp.current.rotation.z = Math.sin(clock.elapsedTime * 1.3 + seed) * 0.06;
  });
  return (
    <group position={position}>
      <mesh position={[0, 1.6, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.09, 3.2, 8]} />
        <meshStandardMaterial color={C.wood} />
      </mesh>
      <mesh position={[0.35, 3.15, 0]}>
        <boxGeometry args={[0.8, 0.08, 0.08]} />
        <meshStandardMaterial color={C.wood} />
      </mesh>
      <group ref={lamp} position={[0.68, 3.1, 0]}>
        <Lantern />
        {light && <pointLight position={[0, -0.6, 0]} color="#ffb06a" intensity={6} distance={7} decay={2} />}
      </group>
    </group>
  );
}

export function Lantern({ scale = 1 }: { scale?: number }) {
  return (
    <group scale={scale}>
      <mesh position={[0, -0.12, 0]}>
        <cylinderGeometry args={[0.01, 0.01, 0.25, 4]} />
        <meshStandardMaterial color="#3a2a1a" />
      </mesh>
      <mesh position={[0, -0.6, 0]} scale={[1, 1.25, 1]}>
        <sphereGeometry args={[0.32, 16, 12]} />
        <meshStandardMaterial color="#e2412a" emissive="#ff5a2a" emissiveIntensity={0.55} roughness={0.5} />
      </mesh>
      {[-0.22, -0.98].map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <cylinderGeometry args={[0.16, 0.16, 0.08, 12]} />
          <meshStandardMaterial color={C.gold} metalness={0.3} roughness={0.4} />
        </mesh>
      ))}
      <mesh position={[0, -1.18, 0]}>
        <coneGeometry args={[0.06, 0.3, 6]} />
        <meshStandardMaterial color="#d33a24" />
      </mesh>
    </group>
  );
}

/** Cây bonsai trong chậu sứ. */
export function Bonsai({ position, seed = 1 }: { position: [number, number, number]; seed?: number }) {
  const lean = Math.sin(seed * 3.1) * 0.35;
  return (
    <group position={position} rotation={[0, seed * 1.7, 0]}>
      <mesh position={[0, 0.3, 0]} castShadow>
        <cylinderGeometry args={[0.6, 0.45, 0.6, 8]} />
        <meshStandardMaterial color="#4f6f8a" roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.62, 0]}>
        <cylinderGeometry args={[0.55, 0.55, 0.06, 8]} />
        <meshStandardMaterial color="#5a3e24" />
      </mesh>
      <mesh position={[0.15, 1.05, 0]} rotation={[0, 0, lean]} castShadow>
        <cylinderGeometry args={[0.07, 0.13, 0.9, 6]} />
        <meshStandardMaterial color="#6b4a2f" />
      </mesh>
      {[
        [0.45, 1.55, 0.05, 0.55],
        [-0.25, 1.35, 0.15, 0.45],
        [0.05, 1.85, -0.15, 0.4],
      ].map(([x, y, z, r], i) => (
        <mesh key={i} position={[x, y, z]} scale={[1, 0.55, 1]} castShadow>
          <icosahedronGeometry args={[r, 0]} />
          <meshStandardMaterial color={i === 1 ? C.leafDark : C.leaf} flatShading />
        </mesh>
      ))}
    </group>
  );
}

/** Cây cổ thụ (bồ đề) low-poly. */
export function BigTree({ position, seed = 1 }: { position: [number, number, number]; seed?: number }) {
  return (
    <group position={position} rotation={[0, seed, 0]} userData={{ occluder: true }}>
      <mesh position={[0, 1.4, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.55, 2.8, 7]} />
        <meshStandardMaterial color="#6e4d33" flatShading />
      </mesh>
      {[
        [0, 3.6, 0, 2.2],
        [1.2, 3.1, 0.4, 1.4],
        [-1.1, 3.2, -0.3, 1.5],
        [0.2, 4.6, -0.2, 1.4],
      ].map(([x, y, z, r], i) => (
        <mesh key={i} position={[x, y, z]} castShadow>
          <icosahedronGeometry args={[r, 0]} />
          <meshStandardMaterial color={i % 2 ? C.leafDark : C.leaf} flatShading />
        </mesh>
      ))}
    </group>
  );
}

/** Khói hương bay lên – vài quả cầu mờ chuyển động vòng. */
export function Smoke({ position, count = 6, spread = 0.15, height = 2.6, scale = 1 }: { position: [number, number, number]; count?: number; spread?: number; height?: number; scale?: number }) {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const seeds = useMemo(() => Array.from({ length: count }, (_, i) => i / count), [count]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * 0.18;
    seeds.forEach((s, i) => {
      const m = refs.current[i];
      if (!m) return;
      const k = (t + s) % 1;
      m.position.set(Math.sin(k * 7 + i) * spread * (1 + k * 3), k * height, Math.cos(k * 5 + i) * spread * (1 + k * 2));
      m.scale.setScalar((0.15 + k * 0.5) * scale);
      (m.material as THREE.MeshBasicMaterial).opacity = Math.sin(k * Math.PI) * 0.35;
    });
  });
  return (
    <group position={position}>
      {seeds.map((_, i) => (
        <mesh key={i} ref={(m) => (refs.current[i] = m)}>
          <sphereGeometry args={[1, 10, 8]} />
          <meshBasicMaterial color="#f2ece2" transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

const bowlProfile = [
  [0.0, 0], [0.75, 0], [1.05, 0.25], [1.15, 0.65], [1.05, 0.95], [1.12, 1.0], [1.12, 1.08], [0.0, 1.08],
].map(([x, y]) => new THREE.Vector2(x, y));

/** Đỉnh hương lớn bằng đồng giữa sân. */
export function IncenseBurner({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.2, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[1.3, 1.4, 0.4, 8]} />
        <meshStandardMaterial color={C.stoneDark} flatShading />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[Math.cos((i * Math.PI * 2) / 3) * 0.7, 0.62, Math.sin((i * Math.PI * 2) / 3) * 0.7]} castShadow>
          <cylinderGeometry args={[0.1, 0.16, 0.5, 6]} />
          <meshStandardMaterial color={C.bronze} metalness={0.5} roughness={0.45} />
        </mesh>
      ))}
      <mesh position={[0, 0.85, 0]} castShadow>
        <latheGeometry args={[bowlProfile, 16]} />
        <meshStandardMaterial color={C.bronze} metalness={0.55} roughness={0.4} side={THREE.DoubleSide} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 1.15, 1.95, 0]} rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[0.22, 0.06, 8, 14]} />
          <meshStandardMaterial color={C.bronze} metalness={0.5} roughness={0.4} />
        </mesh>
      ))}
      {/* tro + bó nhang */}
      <mesh position={[0, 1.88, 0]}>
        <cylinderGeometry args={[1.0, 1.0, 0.04, 16]} />
        <meshStandardMaterial color="#9d9289" />
      </mesh>
      {Array.from({ length: 9 }).map((_, i) => {
        const a = i * 2.4, r = 0.15 + (i % 3) * 0.12;
        return (
          <group key={i} position={[Math.cos(a) * r, 2.2, Math.sin(a) * r]} rotation={[Math.sin(a) * 0.08, 0, Math.cos(a) * 0.08]}>
            <mesh>
              <cylinderGeometry args={[0.015, 0.015, 0.65, 4]} />
              <meshStandardMaterial color="#b8442c" />
            </mesh>
            <mesh position={[0, 0.33, 0]}>
              <sphereGeometry args={[0.025, 6, 6]} />
              <meshBasicMaterial color="#ff7a2a" />
            </mesh>
          </group>
        );
      })}
      <Smoke position={[0, 2.55, 0]} count={8} spread={0.18} height={3.2} />
      <IncenseOfferings scene="courtyard" at={[0, 1.9, 0]} world={[position[0], position[2]]} radius={0.85} />
    </group>
  );
}

/** Hoa sen: 8 cánh + nhụy vàng. */
export function LotusFlower({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      {Array.from({ length: 8 }).map((_, i) => (
        <group key={i} rotation={[0, (i * Math.PI) / 4, 0]}>
          <mesh position={[0, 0.12, 0.12]} rotation={[0.55 + (i % 2) * 0.25, 0, 0]} scale={[0.55, 1, 0.3]}>
            <sphereGeometry args={[0.16, 8, 6]} />
            <meshStandardMaterial color={i % 2 ? '#f7c3cf' : C.lotus} roughness={0.6} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.06, 0.05, 0.06, 8]} />
        <meshStandardMaterial color="#f1c84b" />
      </mesh>
    </group>
  );
}

/** Tượng Quan Âm (cách điệu, trắng ngọc) trên đài sen. */
export function GuanyinStatue({ position }: { position: [number, number, number] }) {
  const white = <meshStandardMaterial color="#f4f1ea" roughness={0.35} />;
  return (
    <group position={position}>
      <mesh position={[0, 0.5, 0]} castShadow>
        <cylinderGeometry args={[0.7, 0.9, 1.0, 8]} />
        <meshStandardMaterial color={C.stone} flatShading />
      </mesh>
      <LotusFlower position={[0, 0.92, 0]} scale={3.4} />
      <group position={[0, 1.4, 0]}>
        <mesh position={[0, 0.85, 0]} castShadow>
          <coneGeometry args={[0.5, 1.8, 12]} />
          {white}
        </mesh>
        <mesh position={[0, 1.9, 0]} castShadow>
          <sphereGeometry args={[0.32, 18, 14]} />
          {white}
        </mesh>
        <mesh position={[0, 2.12, -0.05]} scale={[1, 1.1, 1]}>
          <sphereGeometry args={[0.24, 12, 10]} />
          {white}
        </mesh>
        {/* khăn choàng */}
        <mesh position={[0, 1.62, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.3, 0.08, 8, 18]} />
          {white}
        </mesh>
        {/* tay cầm bình cam lộ */}
        <mesh position={[0.25, 1.2, 0.35]}>
          <cylinderGeometry args={[0.07, 0.1, 0.32, 10]} />
          <meshStandardMaterial color="#cfe6e0" roughness={0.2} />
        </mesh>
        {/* hào quang */}
        <mesh position={[0, 1.95, -0.3]}>
          <torusGeometry args={[0.55, 0.035, 8, 32]} />
          <meshStandardMaterial color={C.gold} emissive="#ffcf6a" emissiveIntensity={0.6} />
        </mesh>
      </group>
    </group>
  );
}

/** Hồ sen tròn, bờ đá, lá sen, hoa sen, tượng Quan Âm ở giữa. */
export function LotusPond({ position, r }: { position: [number, number, number]; r: number }) {
  const pads = useMemo(
    () =>
      Array.from({ length: 16 }).map((_, i) => {
        const a = i * 2.39996, d = 1.6 + ((i * 37) % 10) / 10 * (r - 2.2);
        return { x: Math.cos(a) * d, z: Math.sin(a) * d, s: 0.35 + ((i * 13) % 5) * 0.06, flower: i % 3 === 0 };
      }),
    [r],
  );
  const water = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    if (water.current) water.current.emissiveIntensity = 0.12 + Math.sin(clock.elapsedTime * 0.8) * 0.04;
  });
  return (
    <group position={position}>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.25, 0]} castShadow receiveShadow>
        <torusGeometry args={[r, 0.32, 6, 32]} />
        <meshStandardMaterial color={C.stone} flatShading />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.12, 0]} receiveShadow>
        <circleGeometry args={[r, 40]} />
        <meshStandardMaterial ref={water} color={C.water} emissive="#2f6f78" roughness={0.15} metalness={0.1} />
      </mesh>
      {pads.map((p, i) => (
        <group key={i} position={[p.x, 0.15, p.z]}>
          <mesh rotation={[-Math.PI / 2, 0, i]}>
            <circleGeometry args={[p.s, 12, 0.3, Math.PI * 2 - 0.4]} />
            <meshStandardMaterial color={i % 2 ? '#5e9a4f' : '#4f8a45'} side={THREE.DoubleSide} />
          </mesh>
          {p.flower && <LotusFlower position={[0, 0.05, 0]} scale={1.1} />}
        </group>
      ))}
      <GuanyinStatue position={[0, 0, 0]} />
      <PondLife center={[position[0], position[2]]} r={r} />
    </group>
  );
}

const bellProfile = [
  [0.0, 1.0], [0.25, 0.98], [0.38, 0.85], [0.44, 0.5], [0.52, 0.15], [0.62, 0.0], [0.58, -0.04],
].map(([x, y]) => new THREE.Vector2(x, y));

/** Lầu chuông: 4 cột, mái, chuông đồng. */
export function BellPavilion({ position }: { position: [number, number, number] }) {
  const bell = useRef<THREE.Group>(null);
  const striker = useRef<THREE.Mesh>(null);
  const ripple = useRef<THREE.Mesh>(null);
  useBellFx([position[0], position[2]], bell, striker, ripple);
  return (
    <group position={position}>
      <mesh position={[0, 0.2, 0]} receiveShadow castShadow>
        <boxGeometry args={[4.2, 0.4, 4.2]} />
        <meshStandardMaterial color={C.stone} />
      </mesh>
      {[[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]].map(([x, z], i) => (
        <Column key={i} position={[x, 0.4, z]} h={3.2} r={0.17} />
      ))}
      <Roof w={4.8} d={4.8} h={1.8} y={3.6} color={C.roofTeal} />
      <mesh position={[0, 3.45, 0]}>
        <boxGeometry args={[3.4, 0.16, 0.16]} />
        <meshStandardMaterial color={C.wood} />
      </mesh>
      {/* chuông treo, lắc nhẹ quanh điểm treo khi bị đánh */}
      <group ref={bell} position={[0, 3.35, 0]}>
        <mesh position={[0, -1.4, 0]} scale={[1.2, 1.4, 1.2]} castShadow>
          <latheGeometry args={[bellProfile, 20]} />
          <meshStandardMaterial color="#7a5a2c" metalness={0.65} roughness={0.35} side={THREE.DoubleSide} />
        </mesh>
      </group>
      {/* chày gỗ */}
      <mesh ref={striker} position={[1.25, 2.5, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.1, 0.1, 1.1, 8]} />
        <meshStandardMaterial color="#9c7246" />
      </mesh>
      {/* sóng âm lan ra */}
      <mesh ref={ripple} position={[0, 2.4, 0]} rotation={[Math.PI / 2, 0, 0]} visible={false}>
        <torusGeometry args={[0.9, 0.025, 6, 48]} />
        <meshBasicMaterial color="#ffe2a0" transparent opacity={0.5} depthWrite={false} />
      </mesh>
    </group>
  );
}

const FLAG_COLORS = ['#3d6fb6', '#f4f1ea', '#c93a2e', '#4f9a54', '#e8b830']; // ngũ sắc
const flagGeo = (() => {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([-0.18, 0, 0, 0.18, 0, 0, 0, -0.42, 0], 3));
  g.computeVertexNormals();
  return g;
})();

/** Dây cờ phướn ngũ sắc giữa hai điểm, võng xuống và phấp phới. */
export function FlagString({ a, b, sag = 0.6 }: { a: [number, number, number]; b: [number, number, number]; sag?: number }) {
  const n = Math.max(4, Math.round(Math.hypot(b[0] - a[0], b[2] - a[2]) / 0.55));
  const items = useMemo(
    () =>
      Array.from({ length: n }).map((_, i) => {
        const t = (i + 0.5) / n;
        return {
          p: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - Math.sin(t * Math.PI) * sag, a[2] + (b[2] - a[2]) * t] as [number, number, number],
          c: FLAG_COLORS[i % 5],
        };
      }),
    [a, b, n, sag],
  );
  const yaw = Math.atan2(b[0] - a[0], b[2] - a[2]) - Math.PI / 2;
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    refs.current.forEach((m, i) => m && (m.rotation.x = Math.sin(t * 2.2 + i * 0.7) * 0.35));
  });
  const line = useMemo(() => {
    const pts = Array.from({ length: 17 }).map((_, i) => {
      const t = i / 16;
      return new THREE.Vector3(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - Math.sin(t * Math.PI) * sag, a[2] + (b[2] - a[2]) * t);
    });
    return new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: '#5a4630' }));
  }, [a, b, sag]);
  return (
    <group>
      <primitive object={line} />
      {items.map((it, i) => (
        <group key={i} position={it.p} rotation={[0, yaw, 0]}>
          <mesh ref={(m) => (refs.current[i] = m)} geometry={flagGeo}>
            <meshStandardMaterial color={it.c} side={THREE.DoubleSide} roughness={0.8} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Ngọn nến có lửa lung linh. */
export function Candle({ position, h = 0.5 }: { position: [number, number, number]; h?: number }) {
  const flame = useRef<THREE.Mesh>(null);
  const seed = useMemo(() => Math.random() * 10, []);
  useFrame(({ clock }) => {
    if (flame.current) {
      const t = clock.elapsedTime * 6 + seed;
      flame.current.scale.set(1 + Math.sin(t) * 0.08, 1 + Math.sin(t * 1.7) * 0.15, 1);
    }
  });
  return (
    <group position={position}>
      <mesh position={[0, h / 2, 0]}>
        <cylinderGeometry args={[0.07, 0.07, h, 10]} />
        <meshStandardMaterial color="#f6eedb" />
      </mesh>
      <mesh ref={flame} position={[0, h + 0.08, 0]} scale={[1, 1, 1]}>
        <coneGeometry args={[0.045, 0.16, 8]} />
        <meshBasicMaterial color="#ffc86a" />
      </mesh>
    </group>
  );
}
