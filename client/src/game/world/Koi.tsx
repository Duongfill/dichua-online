// Cá chép koi low-poly (dùng khi phóng sinh: trên tay, bay ra hồ, bơi trong hồ).
import * as THREE from 'three';

export const KOI_COLORS = ['#f08a3c', '#e9542f', '#f5f0e6', '#f2c14e', '#d9472b'];

const body = new THREE.SphereGeometry(1, 10, 8);
const tail = new THREE.ConeGeometry(0.09, 0.18, 6);
const fin = new THREE.ConeGeometry(0.05, 0.1, 4);
const mats = new Map<string, THREE.MeshStandardMaterial>();
const mat = (c: string) => {
  let m = mats.get(c);
  if (!m) mats.set(c, (m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.45 })));
  return m;
};
const white = mat('#fbf6ec');
const eye = new THREE.MeshBasicMaterial({ color: '#1d140d' });
const eyeGeo = new THREE.SphereGeometry(0.015, 6, 4);

/** Đầu cá hướng +z. Kích thước ~0.5m × scale. */
export default function Koi({ color = KOI_COLORS[0], scale = 1, tailRef }: { color?: string; scale?: number; tailRef?: React.Ref<THREE.Mesh> }) {
  return (
    <group scale={scale}>
      <mesh geometry={body} material={mat(color)} scale={[0.09, 0.065, 0.22]} castShadow />
      <mesh geometry={body} material={white} scale={[0.07, 0.04, 0.09]} position={[0, 0.03, -0.04]} />
      <mesh ref={tailRef} geometry={tail} material={mat(color)} position={[0, 0, -0.27]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, 1, 0.35]} />
      <mesh geometry={fin} material={mat(color)} position={[0, 0.07, 0]} rotation={[-0.6, 0, 0]} scale={[0.4, 1, 1]} />
      <mesh geometry={eyeGeo} material={eye} position={[0.05, 0.02, 0.15]} />
      <mesh geometry={eyeGeo} material={eye} position={[-0.05, 0.02, 0.15]} />
    </group>
  );
}
