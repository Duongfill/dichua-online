// Hiệu ứng vật thể khi có người làm nghi thức (của mình hoặc người khác trong cùng khu vực).
import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { SceneId } from '@chua/shared';
import { at, seeded, useFx, volAt } from '../fx';
import { bigBell, incenseLight, smallBell, splash, woodBlock } from '../sfx';
import Koi, { KOI_COLORS } from './Koi';
import { Smoke } from './props';

const stickGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.6, 4);
const stickMat = new THREE.MeshStandardMaterial({ color: '#c0492f' });
const emberGeo = new THREE.SphereGeometry(0.03, 6, 4);
const emberMat = new THREE.MeshBasicMaterial({ color: '#ff8a3a' });

/** Nén hương mới cắm vào lư/đỉnh hương + khói bốc mạnh. Đặt tại miệng lư (toạ độ local). */
export function IncenseOfferings({ scene, at: [ox, oy, oz], world: [wx, wz], radius, max = 14 }: {
  scene: SceneId; at: [number, number, number]; world: [number, number]; radius: number; max?: number;
}) {
  const [sticks, setSticks] = useState<{ id: number; x: number; z: number; tilt: number }[]>([]);
  const [puffs, setPuffs] = useState<number[]>([]);

  useFx((e) => {
    if (e.action !== 'incense' || e.scene !== scene) return;
    const v = volAt(wx, wz);
    at(e, 300, () => incenseLight(v));
    at(e, 1600, () => {
      woodBlock(v * 0.8);
      const a = seeded(e.seed, 1) * Math.PI * 2;
      const r = Math.sqrt(seeded(e.seed, 2)) * radius;
      setSticks((s) => [...s.slice(-(max - 1)), { id: e.seed, x: Math.cos(a) * r, z: Math.sin(a) * r, tilt: (seeded(e.seed, 3) - 0.5) * 0.25 }]);
      setPuffs((p) => [...p, e.seed]);
      setTimeout(() => setPuffs((p) => p.filter((x) => x !== e.seed)), 4000);
    });
  });

  return (
    <group position={[ox, oy, oz]}>
      {sticks.map((s) => (
        <group key={s.id} position={[s.x, 0.3, s.z]} rotation={[s.tilt, 0, -s.tilt]}>
          <mesh geometry={stickGeo} material={stickMat} />
          <mesh geometry={emberGeo} material={emberMat} position={[0, 0.3, 0]} />
        </group>
      ))}
      {puffs.map((id) => (
        <Smoke key={id} position={[0, 0.5, 0]} count={6} spread={0.25} height={2.6} scale={1.4} />
      ))}
    </group>
  );
}

const bump = (t: number, c: number, w: number) => Math.exp(-(((t - c) / w) ** 2));

/** Chày đánh chuông, chuông lắc, sóng âm lan ra. Truyền ref của chuông & chày trong BellPavilion. */
export function useBellFx(world: [number, number], bell: React.RefObject<THREE.Object3D>, striker: React.RefObject<THREE.Object3D>, ripple: React.RefObject<THREE.Mesh>) {
  const start = useRef(-1e9);
  useFx((e) => {
    if (e.action !== 'bell' || e.scene !== 'courtyard') return;
    start.current = e.start;
    at(e, 550, () => bigBell(volAt(world[0], world[1])));
  });
  useFrame(() => {
    const el = (performance.now() - start.current) / 1000;
    if (striker.current) striker.current.position.x = 1.25 + 0.3 * bump(el, 0.3, 0.12) - 0.42 * bump(el, 0.55, 0.07);
    const t = el - 0.55;
    if (bell.current) bell.current.rotation.z = t > 0 ? 0.07 * Math.exp(-t * 0.9) * Math.sin(t * 5.5) : 0;
    if (ripple.current) {
      const on = t > 0 && t < 2.6;
      ripple.current.visible = on;
      if (on) {
        ripple.current.scale.setScalar(1 + t * 3.2);
        (ripple.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.55 - t * 0.21);
      }
    }
  });
}

interface Fish { id: number; color: string; ang: number; rad: number; speed: number; born: number }
interface Throw { id: number; from: THREE.Vector3; to: THREE.Vector3; start: number; color: string }

/** Cá bay từ tay người phóng sinh xuống hồ, nước bắn, rồi bơi quanh tượng. Đặt trong group của hồ (tâm = 0). */
export function PondLife({ center: [cx, cz], r }: { center: [number, number]; r: number }) {
  const [throws, setThrows] = useState<Throw[]>([]);
  const [splashes, setSplashes] = useState<{ id: number; x: number; z: number; start: number }[]>([]);
  const [fish, setFish] = useState<Fish[]>([]);

  useFx((e) => {
    if (e.action !== 'release' || e.scene !== 'courtyard') return;
    const rad = 1.7 + seeded(e.seed, 2) * (r - 2.7);
    // rơi ở phía gần người thả, lệch ngẫu nhiên
    const toward = Math.atan2(e.z - cz, e.x - cx);
    const la = toward + (seeded(e.seed, 3) - 0.5) * 1.2;
    const land = new THREE.Vector3(Math.cos(la) * Math.min(rad, r - 1.2), 0.15, Math.sin(la) * Math.min(rad, r - 1.2));
    const color = KOI_COLORS[Math.floor(seeded(e.seed, 4) * KOI_COLORS.length)];
    at(e, 750, () => {
      setThrows((t) => [...t, { id: e.seed, from: new THREE.Vector3(e.x - cx, 1.1, e.z - cz), to: land, start: performance.now(), color }]);
    });
    at(e, 1500, () => {
      splash(volAt(cx, cz));
      setThrows((t) => t.filter((x) => x.id !== e.seed));
      setSplashes((s) => [...s, { id: e.seed, x: land.x, z: land.z, start: performance.now() }]);
      setTimeout(() => setSplashes((s) => s.filter((x) => x.id !== e.seed)), 1400);
      setFish((f) => [
        ...f.slice(-13),
        { id: e.seed, color, ang: Math.atan2(land.z, land.x), rad: Math.max(1.6, Math.hypot(land.x, land.z)), speed: (seeded(e.seed, 5) > 0.5 ? 1 : -1) * (0.18 + seeded(e.seed, 6) * 0.2), born: performance.now() },
      ]);
    });
  });

  // cá sống 2 phút rồi lặn xuống
  useFrame(() => {
    const now = performance.now();
    if (fish.some((f) => now - f.born > 120_000)) setFish((fs) => fs.filter((f) => now - f.born <= 120_000));
  });

  return (
    <group>
      {throws.map((t) => (
        <ThrownFish key={t.id} t={t} />
      ))}
      {splashes.map((s) => (
        <SplashRing key={s.id} x={s.x} z={s.z} start={s.start} />
      ))}
      {fish.map((f) => (
        <SwimFish key={f.id} f={f} />
      ))}
    </group>
  );
}

function ThrownFish({ t }: { t: Throw }) {
  const g = useRef<THREE.Group>(null);
  const p = new THREE.Vector3();
  useFrame(() => {
    const k = Math.min(1, (performance.now() - t.start) / 750);
    p.lerpVectors(t.from, t.to, k);
    p.y += Math.sin(k * Math.PI) * 1.8;
    if (g.current) {
      g.current.position.copy(p);
      g.current.rotation.set(-0.8 + k * 1.9, Math.atan2(t.to.x - t.from.x, t.to.z - t.from.z), k * 6);
    }
  });
  return (
    <group ref={g}>
      <Koi color={t.color} scale={0.9} />
    </group>
  );
}

const ringGeo = new THREE.RingGeometry(0.2, 0.28, 24);
function SplashRing({ x, z, start }: { x: number; z: number; start: number }) {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const drops = useRef<THREE.Group>(null);
  useFrame(() => {
    const t = (performance.now() - start) / 1000;
    refs.current.forEach((m, i) => {
      if (!m) return;
      const k = Math.max(0, t - i * 0.18);
      m.scale.setScalar(1 + k * 4);
      (m.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.7 - k * 0.6);
    });
    if (drops.current) {
      drops.current.children.forEach((d, i) => {
        const a = (i / 6) * Math.PI * 2;
        d.position.set(Math.cos(a) * t * 0.9, 0.15 + t * 2.2 - t * t * 5, Math.sin(a) * t * 0.9);
        d.visible = d.position.y > 0.1;
      });
    }
  });
  return (
    <group position={[x, 0.17, z]}>
      {[0, 1, 2].map((i) => (
        <mesh key={i} ref={(m) => (refs.current[i] = m)} geometry={ringGeo} rotation={[-Math.PI / 2, 0, 0]}>
          <meshBasicMaterial color="#e8f6f4" transparent opacity={0.7} depthWrite={false} />
        </mesh>
      ))}
      <group ref={drops}>
        {Array.from({ length: 6 }).map((_, i) => (
          <mesh key={i}>
            <sphereGeometry args={[0.04, 6, 4]} />
            <meshBasicMaterial color="#dff3f1" />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function SwimFish({ f }: { f: Fish }) {
  const g = useRef<THREE.Group>(null);
  const tail = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const age = (performance.now() - f.born) / 1000;
    const ang = f.ang + age * f.speed;
    const rad = f.rad + Math.sin(age * 0.4 + f.id) * 0.3;
    if (g.current) {
      // 1 giây đầu: lặn từ chỗ rơi; 5 giây cuối đời: chìm dần
      const sink = Math.max(0, age - 115) * 0.06;
      g.current.position.set(Math.cos(ang) * rad, 0.06 - Math.max(0, 1 - age) * 0.1 - sink + Math.sin(age * 2 + f.id) * 0.015, Math.sin(ang) * rad);
      // hướng bơi theo tiếp tuyến
      g.current.rotation.y = Math.atan2(-Math.sin(ang) * f.speed, Math.cos(ang) * f.speed);
    }
    if (tail.current) tail.current.rotation.y = Math.sin(clock.elapsedTime * 8 + f.id) * 0.5;
  });
  return (
    <group ref={g}>
      <Koi color={f.color} scale={0.85} tailRef={tail} />
    </group>
  );
}

/** Lạy Phật trong chánh điện: chuông nhỏ mỗi lạy + hào quang tượng sáng lên. */
export function useBowFx(halo: React.RefObject<THREE.Mesh>) {
  const pulse = useRef(-1e9);
  useFx((e) => {
    if (e.scene !== 'hall') return;
    if (e.action === 'bow') {
      [700, 2100, 3500].forEach((ms) =>
        at(e, ms, () => {
          smallBell(volAt(e.x, e.z) * 0.8);
          pulse.current = performance.now();
        }),
      );
    }
    if (e.action === 'incense') at(e, 1600, () => (pulse.current = performance.now()));
  });
  useFrame(() => {
    const t = (performance.now() - pulse.current) / 1000;
    const m = halo.current?.material as THREE.MeshStandardMaterial | undefined;
    if (m) m.emissiveIntensity = 0.6 + 0.9 * Math.exp(-t * 1.6);
  });
}
