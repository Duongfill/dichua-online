import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { MOVE_SPEED, SEAT_RY, collide, interactionsAt, seatAt, zoneAt, type PlayerInfo } from '@chua/shared';
import { currentAction } from './fx';
import { samplePose, type Pose } from '../net/interp';
import { useGame } from '../state/store';
import Character, { type Motion } from './Character';
import { cam, input, local } from './local';

/** Tên, bong bóng chat, đang nói, bị mình tắt tiếng – theo cài đặt & Tịnh tâm. */
function useTag(id: string | undefined) {
  const showTag = useGame((s) => s.settings.showNames);
  const bubble = useGame((s) => (id && s.settings.bubbles && !s.zen ? s.bubbles[id]?.text : undefined));
  const speaking = useGame((s) => !!id && !!s.speaking[id] && !s.zen);
  const mutedByMe = useGame((s) => !!id && !!s.muted[id]);
  return { showTag, bubble, speaking, mutedByMe };
}

const lerpAngle = (a: number, b: number, f: number) => {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * f;
};

/** Nhân vật của mình: đọc input, tự di chuyển (client-side prediction), va chạm theo shared/world. */
export function LocalPlayer() {
  const self = useGame((s) => s.self)!;
  const scene = useGame((s) => s.scene);
  const group = useRef<THREE.Group>(null);
  const marker = useRef<THREE.Mesh>(null);
  const motion = useRef<Motion>({ walking: false });
  const tag = useTag(self.id);

  const floaters = useGame((s) => s.floaters);

  useFrame(({ clock }, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const busy = performance.now() < local.busyUntil;
    let ix = busy ? 0 : input.right - input.left + input.joyX;
    let iy = busy ? 0 : input.fwd - input.back + input.joyY;
    if (local.seat !== null && !busy) {
      // đang ngồi: điều khiển → đứng dậy rồi đi; không thì ngồi yên quay về bàn thờ
      if (Math.hypot(ix, iy) > 0.08) useGame.getState().stand();
      else {
        ix = iy = 0;
        local.ry = lerpAngle(local.ry, SEAT_RY, Math.min(1, dt * 8));
      }
    }
    let mx = 0;
    let mz = 0;
    let mag = Math.hypot(ix, iy);
    if (busy) {
      // đang làm nghi thức: đứng yên, quay mặt về tượng / đỉnh hương / chuông / hồ
      local.target = null;
      mag = 0;
      const ry = lerpAngle(local.ry, local.faceRy, Math.min(1, dt * 10));
      if (Math.abs(ry - local.ry) > 1e-3) local.dirty = true;
      local.ry = ry;
    } else if (mag > 0.08) {
      local.target = null; // có điều khiển tay → huỷ đi tới điểm đã bấm
      local.pending = null; // và huỷ hành động đang chờ
      const n = Math.min(1, mag) / mag;
      // tiến = hướng camera nhìn, chiếu xuống mặt đất
      const fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw);
      const rx = Math.cos(cam.yaw), rz = -Math.sin(cam.yaw);
      mx = (rx * ix + fx * iy) * n;
      mz = (rz * ix + fz * iy) * n;
      mag = Math.min(1, mag);
    } else if (local.target) {
      const dx = local.target.x - local.x, dz = local.target.z - local.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.15) {
        local.target = null;
        mag = 0;
      } else {
        mx = dx / d;
        mz = dz / d;
        mag = 1;
      }
    } else mag = 0;

    let walking = false;
    if (mag > 0) {
      const step = MOVE_SPEED * dt;
      let c = collide(scene, local.x + mx * step, local.z + mz * step);
      let moved = Math.hypot(c.x - local.x, c.z - local.z);
      if (local.target && moved < step * 0.5) {
        // tự đi mà vướng vật cản (cột đèn, cây…) → thử lách chéo sang hai bên
        for (const turn of [0.7, -0.7, 1.3, -1.3]) {
          const cs = Math.cos(turn), sn = Math.sin(turn);
          const tx = mx * cs - mz * sn, tz = mx * sn + mz * cs;
          const c2 = collide(scene, local.x + tx * step, local.z + tz * step);
          const m2 = Math.hypot(c2.x - local.x, c2.z - local.z);
          if (m2 > step * 0.5) {
            c = c2;
            moved = m2;
            mx = tx;
            mz = tz;
            break;
          }
        }
      }
      // vẫn kẹt hẳn → dừng
      if (local.target && moved < step * 0.2) local.target = null;
      walking = moved > 0.002;
      local.x = c.x;
      local.z = c.z;
      local.ry = lerpAngle(local.ry, Math.atan2(mx, mz), Math.min(1, dt * 12));
      local.dirty = true;
    }
    if (walking !== local.walking) {
      local.walking = walking;
      local.dirty = true;
    }
    motion.current.walking = walking;
    motion.current.sitting = local.seat !== null;
    const act = currentAction(self.id);
    motion.current.action = act?.action ?? null;
    motion.current.actionStart = act?.start;

    const st = useGame.getState();
    const spots = interactionsAt(scene, local.x, local.z);
    st.setSpots(spots);
    // bồ đoàn trống đang đứng cạnh (chỉ trong chánh điện, khi chưa ngồi)
    let seatSpot: number | null = null;
    if (scene === 'hall' && local.seat === null) {
      const i = seatAt(local.x, local.z);
      if (i >= 0 && (!st.seats[i] || st.seats[i] === self.id)) seatSpot = i;
    }
    st.setSeatSpot(seatSpot);
    // đã tự đi tới nơi → làm việc đang chờ (nghi thức hoặc ngồi)
    const pend = local.pending;
    if (pend && !busy) {
      if ('sit' in pend) {
        if (!local.target) {
          local.pending = null;
          if (seatAt(local.x, local.z, 1.2) === pend.sit) st.sit(pend.sit);
        }
      } else if (spots.some((s) => s.action === pend.action)) {
        local.pending = null;
        st.perform(pend.action);
      } else if (!local.target) local.pending = null; // bị kẹt / dừng giữa đường
    }

    if (group.current) {
      group.current.position.set(local.x, 0, local.z);
      group.current.rotation.y = local.ry;
    }
    if (marker.current) {
      marker.current.visible = !!local.target;
      if (local.target) {
        marker.current.position.set(local.target.x, 0.05, local.target.z);
        marker.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 6) * 0.12);
      }
    }
    useGame.getState().setZone(zoneAt(scene, local.x, local.z));
  });

  return (
    <>
      <group ref={group}>
        <Character appearance={self.appearance} name={self.name} level={self.level} isSelf motion={motion} {...tag} />
        {floaters.length > 0 && (
          <Html position={[0, 2.9, 0]} center zIndexRange={[21, 0]} className="nametag">
            {floaters.map((f) => (
              <div key={f.id} className="float-up whitespace-nowrap text-center text-sm font-bold text-amberwood-200 [text-shadow:0_1px_3px_rgba(60,30,5,0.9)]">
                {f.text}
              </div>
            ))}
          </Html>
        )}
      </group>
      <mesh ref={marker} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[0.28, 0.4, 24]} />
        <meshBasicMaterial color="#ffe08a" transparent opacity={0.85} depthWrite={false} />
      </mesh>
    </>
  );
}

function RemotePlayer({ info }: { info: PlayerInfo }) {
  const group = useRef<THREE.Group>(null);
  const motion = useRef<Motion>({ walking: false });
  const pose = useRef<Pose>({ x: 0, z: 0, ry: 0, walking: false });
  const seen = useRef(false);
  const tag = useTag(info.id);

  useFrame(() => {
    const ok = samplePose(info.id, pose.current);
    if (group.current) {
      group.current.visible = ok || seen.current;
      if (ok) {
        seen.current = true;
        group.current.position.set(pose.current.x, 0, pose.current.z);
        group.current.rotation.y = pose.current.ry;
      }
    }
    motion.current.walking = ok && pose.current.walking;
    motion.current.sitting = ok && !!pose.current.sitting;
    const act = currentAction(info.id);
    motion.current.action = act?.action ?? null;
    motion.current.actionStart = act?.start;
    if (act) motion.current.walking = false;
  });

  return (
    <group
      ref={group}
      visible={false}
      onClick={(e) => {
        // bấm vào người khác → mở thẻ (tắt tiếng…), không tính là bấm đất
        if (e.delta > 8) return;
        e.stopPropagation();
        useGame.setState({ selected: info.id });
      }}
    >
      <Character appearance={info.appearance} name={info.name} level={info.level} motion={motion} {...tag} />
    </group>
  );
}

export function RemotePlayers() {
  const players = useGame((s) => s.players);
  return (
    <>
      {Object.values(players).map((p) => (
        <RemotePlayer key={p.id} info={p} />
      ))}
    </>
  );
}
