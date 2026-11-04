// Khu "Chánh điện" (trong nhà): bàn thờ, tượng Phật cách điệu, 20 bồ đoàn.
// Tường chỉ hiển thị mặt trong (FrontSide hướng vào) → camera ra ngoài tường vẫn nhìn xuyên được.
import { useMemo, useRef } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { HALL, HALL_SEATS, SCENES } from '@chua/shared';
import { woodTexture } from './textures';
import { C, Candle, Column, Lantern, LotusFlower, Plaque, Smoke } from './props';
import { IncenseOfferings, useBowFx } from './Fx';
import { useGame } from '../../state/store';

const B = SCENES.hall.bounds;
const W = B.maxX - B.minX + 1.6; // ~20
const D = B.maxZ - B.minZ + 1.6; // ~21
const CZ = (B.maxZ + B.minZ) / 2;
const WALL_H = 6.5;

function Wall({ position, rotY, width, color = '#efe0c2' }: { position: [number, number, number]; rotY: number; width: number; color?: string }) {
  return (
    <group position={position} rotation={[0, rotY, 0]}>
      <mesh position={[0, WALL_H / 2, 0]} receiveShadow>
        <planeGeometry args={[width, WALL_H]} />
        <meshStandardMaterial color={color} side={THREE.FrontSide} />
      </mesh>
      <mesh position={[0, 0.6, 0.01]}>
        <planeGeometry args={[width, 1.2]} />
        <meshStandardMaterial color={C.lacquerDark} />
      </mesh>
      <mesh position={[0, WALL_H - 0.3, 0.01]}>
        <planeGeometry args={[width, 0.25]} />
        <meshStandardMaterial color={C.gold} />
      </mesh>
    </group>
  );
}

const profile = [
  [0, 0], [0.95, 0], [1.05, 0.2], [0.75, 0.4], [0.55, 0.9], [0.62, 1.3], [0.5, 1.6], [0.2, 1.75], [0, 1.78],
].map(([x, y]) => new THREE.Vector2(x, y));

/** Tượng Phật ngồi thiền (cách điệu, dát vàng). Thay .glb tại đây khi có model thật. */
function Buddha({ position }: { position: [number, number, number] }) {
  const gold = <meshStandardMaterial color="#e0b04f" metalness={0.55} roughness={0.32} />;
  const halo = useRef<THREE.Mesh>(null);
  useBowFx(halo); // hào quang sáng lên mỗi lần có người lạy / dâng hương
  return (
    <group position={position}>
      {/* đài sen */}
      <LotusFlower position={[0, -0.05, 0]} scale={7} />
      <mesh position={[0, 0.1, 0]} castShadow>
        <latheGeometry args={[profile, 20]} />
        {gold}
      </mesh>
      {/* chân xếp bằng */}
      <mesh position={[0, 0.25, 0.25]} scale={[1.5, 0.45, 0.85]} castShadow>
        <sphereGeometry args={[0.75, 18, 12]} />
        {gold}
      </mesh>
      {/* tay kết ấn thiền */}
      <mesh position={[0, 0.55, 0.62]} scale={[1, 0.45, 0.6]}>
        <sphereGeometry args={[0.32, 12, 10]} />
        {gold}
      </mesh>
      <mesh position={[0, 2.25, 0]} castShadow>
        <sphereGeometry args={[0.52, 20, 16]} />
        {gold}
      </mesh>
      <mesh position={[0, 2.8, -0.03]}>
        <sphereGeometry args={[0.2, 12, 10]} />
        {gold}
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.5, 2.15, 0]} scale={[0.35, 1, 0.5]}>
          <sphereGeometry args={[0.22, 10, 8]} />
          {gold}
        </mesh>
      ))}
      {/* hào quang */}
      <mesh ref={halo} position={[0, 2.3, -0.6]}>
        <circleGeometry args={[1.25, 40]} />
        <meshStandardMaterial color="#ffdf8a" emissive="#ffb94a" emissiveIntensity={0.6} transparent opacity={0.85} />
      </mesh>
      <mesh position={[0, 2.3, -0.58]}>
        <torusGeometry args={[1.28, 0.05, 8, 48]} />
        <meshStandardMaterial color={C.gold} emissive="#ffcf6a" emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}

function Altar() {
  const a = HALL.altar;
  return (
    <group position={[a.x, 0, a.z]}>
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[a.hw * 2, 1, a.hd * 2]} />
        <meshStandardMaterial color={C.lacquer} />
      </mesh>
      <mesh position={[0, 1.02, 0]}>
        <boxGeometry args={[a.hw * 2 + 0.2, 0.06, a.hd * 2 + 0.2]} />
        <meshStandardMaterial color={C.gold} metalness={0.3} roughness={0.4} />
      </mesh>
      <mesh position={[0, 1.4, -0.6]} castShadow>
        <boxGeometry args={[a.hw * 1.2, 0.7, 1.2]} />
        <meshStandardMaterial color={C.lacquerDark} />
      </mesh>
      <Buddha position={[0, 1.8, -0.6]} />
      {[-3.4, -2.6, 2.6, 3.4].map((x) => (
        <Candle key={x} position={[x, 1.05, 0.9]} h={0.55} />
      ))}
      {/* lư hương nhỏ */}
      <mesh position={[0, 1.2, 0.9]}>
        <cylinderGeometry args={[0.32, 0.24, 0.3, 12]} />
        <meshStandardMaterial color={C.bronze} metalness={0.5} roughness={0.4} />
      </mesh>
      <Smoke position={[0, 1.45, 0.9]} count={5} spread={0.06} height={2.2} scale={0.6} />
      <IncenseOfferings scene="hall" at={[0, 1.2, 0.9]} world={[a.x, a.z + 0.9]} radius={0.18} max={8} />
      {/* bình hoa sen */}
      {[-1.6, 1.6].map((x) => (
        <group key={x} position={[x, 1.05, 0.8]}>
          <mesh position={[0, 0.25, 0]}>
            <cylinderGeometry args={[0.12, 0.18, 0.5, 10]} />
            <meshStandardMaterial color="#e9e2d0" />
          </mesh>
          <LotusFlower position={[0, 0.6, 0]} scale={1.4} />
        </group>
      ))}
      <pointLight position={[0, 3.5, 2]} color="#ffbf73" intensity={22} distance={14} decay={2} />
    </group>
  );
}

export default function Hall({ onGround }: { onGround: (e: ThreeEvent<MouseEvent>) => void }) {
  const floor = useMemo(() => woodTexture([5, 5]), []);
  return (
    <group>
      <ambientLight intensity={0.45} color="#ffe3bf" />
      <hemisphereLight args={['#ffe7c4', '#5a3418', 0.5]} />
      <directionalLight position={[4, 12, 8]} intensity={0.7} color="#ffe2b8" castShadow shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-12} shadow-camera-right={12} shadow-camera-top={12} shadow-camera-bottom={-12} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, CZ]} receiveShadow onClick={onGround}>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial map={floor} roughness={0.7} />
      </mesh>
      {/* thảm đỏ giữa lối */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 2]} receiveShadow onClick={onGround}>
        <planeGeometry args={[11.5, 10]} />
        <meshStandardMaterial color="#8e2a1c" roughness={0.95} />
      </mesh>

      <Wall position={[0, 0, B.minZ - 0.8]} rotY={0} width={W} color="#7a1f16" />
      <Wall position={[0, 0, B.maxZ + 0.8]} rotY={Math.PI} width={W} />
      <Wall position={[B.minX - 0.8, 0, CZ]} rotY={Math.PI / 2} width={D} />
      <Wall position={[B.maxX + 0.8, 0, CZ]} rotY={-Math.PI / 2} width={D} />
      {/* khung cửa ra (phía sau) */}
      <mesh position={[0, 1.6, B.maxZ + 0.75]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[2.6, 3.2]} />
        <meshStandardMaterial color="#fff4dc" emissive="#ffe6b3" emissiveIntensity={0.9} />
      </mesh>

      {HALL.columns.map(([x, z]) => (
        <Column key={`${x},${z}`} position={[x, 0, z]} h={WALL_H} r={0.32} />
      ))}
      {/* xà ngang + đèn lồng treo */}
      {[-5, 0, 5].map((z) => (
        <group key={z}>
          <mesh position={[0, WALL_H - 0.2, z]}>
            <boxGeometry args={[W, 0.3, 0.3]} />
            <meshStandardMaterial color={C.wood} />
          </mesh>
          {[-3, 3].map((x) => (
            <group key={x} position={[x, WALL_H - 0.3, z]}>
              <Lantern scale={0.9} />
            </group>
          ))}
        </group>
      ))}

      <Altar />
      <Plaque text="Đại Hùng Bửu Điện" position={[0, 5.4, B.minZ - 0.75]} width={5} />

      {/* 20 bồ đoàn – bấm để ngồi */}
      {HALL_SEATS.map((s, i) => (
        <group
          key={i}
          position={[s.x, 0, s.z]}
          onClick={(e) => {
            // bấm vào bồ đoàn → tự đi tới và ngồi
            if (e.delta > 8) return;
            e.stopPropagation();
            useGame.getState().sit(i);
          }}
        >
          <mesh position={[0, 0.09, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.42, 0.45, 0.18, 18]} />
            <meshStandardMaterial color="#c9772e" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.185, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.3, 0.025, 6, 18]} />
            <meshStandardMaterial color="#e2a24f" />
          </mesh>
        </group>
      ))}
    </group>
  );
}
