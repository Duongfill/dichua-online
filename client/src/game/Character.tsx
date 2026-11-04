// Nhân vật chibi dựng từ khối cơ bản (placeholder).
// Thay bằng model .glb: dùng useGLTF('/models/chibi.glb') + AnimationMixer, giữ nguyên props.
import { useMemo, useRef, type MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { ACTION_DEFS, HAIR_COLORS, ROBE_COLORS, type ActionId, type Appearance } from '@chua/shared';
import Koi from './world/Koi';

export interface Motion {
  walking: boolean;
  sitting?: boolean;
  /** nghi thức đang làm + thời điểm bắt đầu (performance.now) */
  action?: ActionId | null;
  actionStart?: number;
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const bump = (t: number, c: number, w: number) => Math.exp(-(((t - c) / w) ** 2));

const SKIN = '#f3d2b3';
const mat = (color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...extra });

// Dùng chung hình học cho mọi nhân vật
const G = {
  head: new THREE.SphereGeometry(0.42, 24, 18),
  hairCap: new THREE.SphereGeometry(0.445, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.5),
  bun: new THREE.SphereGeometry(0.17, 16, 12),
  longHair: new THREE.BoxGeometry(0.72, 0.62, 0.18),
  eye: new THREE.SphereGeometry(0.045, 10, 8),
  blush: new THREE.CircleGeometry(0.06, 12),
  robe: new THREE.CylinderGeometry(0.26, 0.42, 0.72, 16),
  collar: new THREE.TorusGeometry(0.2, 0.05, 8, 20),
  belt: new THREE.CylinderGeometry(0.32, 0.32, 0.07, 16),
  arm: new THREE.CapsuleGeometry(0.075, 0.3, 4, 10),
  hand: new THREE.SphereGeometry(0.08, 10, 8),
  leg: new THREE.CylinderGeometry(0.085, 0.085, 0.24, 10),
  shoe: new THREE.BoxGeometry(0.15, 0.08, 0.24),
  shadow: new THREE.CircleGeometry(0.42, 20),
  stick: new THREE.CylinderGeometry(0.012, 0.012, 0.42, 4),
  ember: new THREE.SphereGeometry(0.02, 6, 4),
};
const M = {
  skin: mat(SKIN),
  eye: mat('#2a1c14', { roughness: 0.4 }),
  blush: new THREE.MeshBasicMaterial({ color: '#f2a08f', transparent: true, opacity: 0.6 }),
  shoe: mat('#3b2a1e'),
  shadow: new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.18, depthWrite: false }),
  belt: mat('#5a3a22'),
  stick: mat('#b8442c'),
  ember: new THREE.MeshBasicMaterial({ color: '#ff8a3a' }),
};
const robeMats = ROBE_COLORS.map((c) => mat(c.value));
const hairMats = HAIR_COLORS.map((c) => mat(c, { roughness: 0.6 }));

interface Props {
  appearance: Appearance;
  name?: string;
  level?: number;
  isSelf?: boolean;
  motion?: MutableRefObject<Motion>;
  showTag?: boolean;
  /** lời chat hiện trên đầu vài giây */
  bubble?: string;
  /** đang nói (voice) */
  speaking?: boolean;
  /** mình đã tắt tiếng người này */
  mutedByMe?: boolean;
}

export default function Character({ appearance, name, level = 1, isSelf, motion, showTag = true, bubble, speaking, mutedByMe }: Props) {
  const body = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Group>(null);
  const legR = useRef<THREE.Group>(null);
  const incenseProp = useRef<THREE.Group>(null);
  const fishProp = useRef<THREE.Group>(null);
  const anim = useRef<{ phase: number; w: number; sit?: number }>({ phase: Math.random() * 10, w: 0 });
  const robe = robeMats[appearance.robe] ?? robeMats[0];
  const hair = hairMats[appearance.hairColor] ?? hairMats[0];

  useFrame((_, dt) => {
    const a = anim.current;
    const m = motion?.current;
    const walking = m?.walking ?? false;
    a.w += ((walking ? 1 : 0) - a.w) * Math.min(1, dt * 10);
    a.phase += dt * (walking ? 9 : 2);
    const swing = Math.sin(a.phase) * 0.7 * a.w;

    // tư thế đi / đứng
    const p = {
      lx: swing, rx: -swing,
      alx: -swing * 0.8, arx: swing * 0.8, alz: 0.18, arz: -0.18,
      by: Math.abs(Math.cos(a.phase)) * 0.06 * a.w + Math.sin(a.phase) * 0.008 * (1 - a.w),
      brx: 0, brz: Math.cos(a.phase) * 0.04 * a.w,
    };

    // ngồi kiết già trên bồ đoàn: chân xếp trước, tay đặt trong lòng
    a.sit = (a.sit ?? 0) + (((m?.sitting ? 1 : 0) - (a.sit ?? 0)) * Math.min(1, dt * 6));
    if (a.sit > 0.001) {
      const k = a.sit;
      const seated = { lx: -1.45, rx: -1.45, alx: -0.55, arx: -0.55, alz: 0.75, arz: -0.75, by: 0.02, brx: 0.04 + Math.sin(a.phase) * 0.01, brz: 0 };
      (Object.keys(seated) as (keyof typeof seated)[]).forEach((key) => (p[key] = p[key] * (1 - k) + seated[key] * k));
    }

    // tư thế nghi thức, hoà trộn vào/ra trong 0,25s
    const kind = m?.action ?? null;
    let el = 0;
    if (kind && m?.actionStart) {
      el = (performance.now() - m.actionStart) / 1000;
      const dur = ACTION_DEFS[kind].durationMs / 1000;
      const w = clamp01(Math.min(el, dur - el) / 0.25);
      const t = { ...p, lx: 0, rx: 0, brz: 0, by: 0 };
      if (kind === 'incense') {
        // nâng hương ngang trán, vái 3 lần
        Object.assign(t, { alx: -1.25, arx: -1.25, alz: 0.85, arz: -0.85, brx: 0.22 * Math.max(0, Math.sin((el / dur) * Math.PI * 3)) });
      } else if (kind === 'bow') {
        // quỳ xuống, cúi lạy 3 lần (mỗi lần 1,4s)
        const bend = Math.sin(((el % 1.4) / 1.4) * Math.PI);
        Object.assign(t, { by: -0.32 * bend, brx: 0.95 * bend, lx: 0.9 * bend, rx: 0.9 * bend, alx: -1.0 - 0.7 * bend, arx: -1.0 - 0.7 * bend, alz: 0.75, arz: -0.75 });
      } else if (kind === 'bell') {
        // cầm dây chày, kéo lùi rồi đẩy mạnh vào chuông
        Object.assign(t, { alx: -1.45, arx: -1.45, alz: 0.6, arz: -0.6, brx: 0.22 * bump(el, 0.55, 0.12) - 0.12 * bump(el, 0.32, 0.12) });
      } else if (kind === 'release') {
        // hai tay ôm cá rồi tung lên
        const k = clamp01((el - 0.5) / 0.35);
        Object.assign(t, { alx: -0.5 - 1.9 * k, arx: -0.5 - 1.9 * k, alz: 0.7, arz: -0.7, brx: 0.15 - 0.3 * k });
      }
      (Object.keys(p) as (keyof typeof p)[]).forEach((key) => (p[key] = p[key] * (1 - w) + t[key] * w));
    }
    if (incenseProp.current) incenseProp.current.visible = kind === 'incense' && el > 0.25;
    if (fishProp.current) fishProp.current.visible = kind === 'release' && el < 0.75;

    if (legL.current) legL.current.rotation.x = p.lx;
    if (legR.current) legR.current.rotation.x = p.rx;
    if (armL.current) armL.current.rotation.set(p.alx, 0, p.alz);
    if (armR.current) armR.current.rotation.set(p.arx, 0, p.arz);
    if (body.current) {
      body.current.position.y = p.by;
      body.current.rotation.set(p.brx, 0, p.brz);
    }
  });

  const hairParts = useMemo(() => {
    switch (appearance.hair) {
      case 0: // trọc
        return null;
      case 2: // búi tó
        return (
          <>
            <mesh geometry={G.hairCap} material={hair} rotation={[-0.45, 0, 0]} castShadow />
            <mesh geometry={G.bun} material={hair} position={[0, 0.44, -0.08]} castShadow />
          </>
        );
      case 3: // tóc dài
        return (
          <>
            <mesh geometry={G.hairCap} material={hair} rotation={[-0.45, 0, 0]} castShadow />
            <mesh geometry={G.longHair} material={hair} position={[0, -0.18, -0.3]} castShadow />
          </>
        );
      default: // tóc ngắn
        return <mesh geometry={G.hairCap} material={hair} rotation={[-0.5, 0, 0]} castShadow />;
    }
  }, [appearance.hair, hair]);

  return (
    <group>
      <mesh geometry={G.shadow} material={M.shadow} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} />
      <group ref={body}>
        {/* chân */}
        <group ref={legL} position={[-0.13, 0.3, 0]}>
          <mesh geometry={G.leg} material={robe} position={[0, -0.12, 0]} castShadow />
          <mesh geometry={G.shoe} material={M.shoe} position={[0, -0.24, 0.04]} castShadow />
        </group>
        <group ref={legR} position={[0.13, 0.3, 0]}>
          <mesh geometry={G.leg} material={robe} position={[0, -0.12, 0]} castShadow />
          <mesh geometry={G.shoe} material={M.shoe} position={[0, -0.24, 0.04]} castShadow />
        </group>
        {/* áo */}
        <mesh geometry={G.robe} material={robe} position={[0, 0.62, 0]} castShadow />
        <mesh geometry={G.belt} material={M.belt} position={[0, 0.66, 0]} />
        <mesh geometry={G.collar} material={robe} position={[0, 0.97, 0]} rotation={[Math.PI / 2, 0, 0]} />
        {/* tay */}
        <group ref={armL} position={[-0.33, 0.9, 0]} rotation={[0, 0, 0.18]}>
          <mesh geometry={G.arm} material={robe} position={[0, -0.18, 0]} castShadow />
          <mesh geometry={G.hand} material={M.skin} position={[0, -0.37, 0]} />
        </group>
        <group ref={armR} position={[0.33, 0.9, 0]} rotation={[0, 0, -0.18]}>
          <mesh geometry={G.arm} material={robe} position={[0, -0.18, 0]} castShadow />
          <mesh geometry={G.hand} material={M.skin} position={[0, -0.37, 0]} />
        </group>
        {/* đạo cụ khi làm nghi thức */}
        <group ref={incenseProp} position={[0, 0.84, 0.3]} visible={false}>
          {[-0.035, 0, 0.035].map((x, i) => (
            <group key={i} position={[x, 0.12, 0]} rotation={[0.15, 0, x * 3]}>
              <mesh geometry={G.stick} material={M.stick} />
              <mesh geometry={G.ember} material={M.ember} position={[0, 0.21, 0]} />
            </group>
          ))}
        </group>
        <group ref={fishProp} position={[0, 0.62, 0.27]} rotation={[0, Math.PI / 2, 0]} visible={false}>
          <Koi scale={0.9} />
        </group>
        {/* đầu to kiểu chibi */}
        <group position={[0, 1.38, 0]}>
          <mesh geometry={G.head} material={M.skin} castShadow />
          {hairParts}
          <mesh geometry={G.eye} material={M.eye} position={[-0.14, -0.05, 0.38]} scale={[1, 1.35, 0.6]} />
          <mesh geometry={G.eye} material={M.eye} position={[0.14, -0.05, 0.38]} scale={[1, 1.35, 0.6]} />
          <mesh geometry={G.blush} material={M.blush} position={[-0.24, -0.15, 0.335]} rotation={[0, -0.55, 0]} />
          <mesh geometry={G.blush} material={M.blush} position={[0.24, -0.15, 0.335]} rotation={[0, 0.55, 0]} />
        </group>
      </group>
      {(showTag || bubble || speaking || mutedByMe) && name && (
        <Html position={[0, 2.15, 0]} center zIndexRange={[20, 0]} className="nametag">
          <div className="flex flex-col items-center">
            {bubble && (
              <div className="bubble relative mb-1.5 w-max max-w-[180px] whitespace-normal rounded-2xl bg-[#fffaee]/95 px-2.5 py-1 text-center text-[12px] font-medium leading-snug text-amberwood-900 shadow-md [overflow-wrap:anywhere]">
                {bubble}
              </div>
            )}
            {(showTag || speaking || mutedByMe) && (
              <div className="flex items-center gap-1 rounded-full bg-amberwood-900/55 py-0.5 pl-0.5 pr-2 text-[11px] font-semibold text-amber-50 shadow backdrop-blur-sm">
                <span className={`grid h-4 min-w-4 place-items-center rounded-full px-1 text-[9px] ${isSelf ? 'bg-amberwood-400 text-amberwood-900' : 'bg-jade-500 text-white'}`}>
                  {level}
                </span>
                <span className="max-w-[110px] truncate">{name}</span>
                {speaking && !mutedByMe && (
                  <span className="speaking-bars ml-0.5 flex h-3 items-end gap-[2px]" aria-label="đang nói">
                    <i /><i /><i />
                  </span>
                )}
                {mutedByMe && <span className="ml-0.5 text-[10px]" title="Bạn đã tắt tiếng người này">🔇</span>}
              </div>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}
