// Camera góc nhìn thứ ba: bám nhân vật, kéo để xoay, lăn chuột / chụm hai ngón để zoom.
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { SceneId } from '@chua/shared';
import { cam, local } from './local';

const LIMITS: Record<SceneId, { min: number; max: number }> = {
  courtyard: { min: 3.5, max: 18 },
  hall: { min: 3, max: 9 },
};
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

const ray = new THREE.Raycaster();
const tmpDir = new THREE.Vector3();
const tmpTarget = new THREE.Vector3();

export default function CameraRig({ scene }: { scene: SceneId }) {
  const { camera, gl, scene: root } = useThree();
  const target = useRef(new THREE.Vector3(local.x, 1.2, local.z));
  const desired = useRef(new THREE.Vector3());
  const snap = useRef(true);
  const occluders = useRef<THREE.Object3D[]>([]);
  const lim = LIMITS[scene];

  useEffect(() => {
    cam.dist = clamp(cam.dist, lim.min, lim.max);
    // khi đổi khu vực: camera nhảy ngay về sau lưng nhân vật
    target.current.set(local.x, 1.2, local.z);
    cam.yaw = local.ry + Math.PI;
    snap.current = true;
    // gom các công trình có userData.occluder để camera không bị che
    const t = setTimeout(() => {
      const list: THREE.Object3D[] = [];
      root.traverse((o) => o.userData.occluder && list.push(o));
      occluders.current = list;
    }, 0);
    return () => clearTimeout(t);
  }, [scene, lim.min, lim.max, root]);

  useEffect(() => {
    const el = gl.domElement;
    const pointers = new Map<number, { x: number; y: number }>();
    let pinch = 0;
    const pinchDist = () => {
      const [a, b] = [...pointers.values()];
      return Math.hypot(a.x - b.x, a.y - b.y);
    };
    const down = (e: PointerEvent) => {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) pinch = pinchDist();
    };
    const move = (e: PointerEvent) => {
      const p = pointers.get(e.pointerId);
      if (!p) return;
      if (pointers.size === 1) {
        cam.yaw -= (e.clientX - p.x) * 0.0065;
        cam.pitch = clamp(cam.pitch + (e.clientY - p.y) * 0.005, 0.1, 1.25);
      }
      p.x = e.clientX;
      p.y = e.clientY;
      if (pointers.size === 2) {
        const d = pinchDist();
        if (pinch > 0) cam.dist = clamp((cam.dist * pinch) / d, LIMITS[scene].min, LIMITS[scene].max);
        pinch = d;
      }
    };
    const up = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      pinch = 0;
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      cam.dist = clamp(cam.dist * (e.deltaY > 0 ? 1.1 : 0.9), LIMITS[scene].min, LIMITS[scene].max);
    };
    el.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    el.addEventListener('wheel', wheel, { passive: false });
    return () => {
      el.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      el.removeEventListener('wheel', wheel);
    };
  }, [gl, scene]);

  useFrame((_, dt) => {
    const k = 1 - Math.exp(-dt * 10);
    target.current.lerp(tmpTarget.set(local.x, 1.2, local.z), snap.current ? 1 : k);
    const cp = Math.cos(cam.pitch);
    tmpDir.set(Math.sin(cam.yaw) * cp, Math.sin(cam.pitch), Math.cos(cam.yaw) * cp); // đã chuẩn hoá
    let dist = cam.dist;
    if (occluders.current.length) {
      ray.set(target.current, tmpDir);
      ray.far = dist;
      const hit = ray.intersectObjects(occluders.current, true)[0];
      if (hit) dist = Math.max(1.2, hit.distance - 0.35);
    }
    // Chánh điện: tường chỉ vẽ mặt trong nên camera ra ngoài tường vẫn nhìn xuyên được.
    desired.current.copy(target.current).addScaledVector(tmpDir, dist);
    if (snap.current) {
      camera.position.copy(desired.current);
      snap.current = false;
    } else camera.position.lerp(desired.current, k);
    camera.lookAt(target.current);
  });

  return null;
}
