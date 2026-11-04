// Bàn cờ tướng bằng đá dưới gốc cây cổ thụ: mặt bàn khắc bàn cờ, 2 ghế đá, quân cờ theo ván đang đánh.
import { useMemo } from 'react';
import * as THREE from 'three';
import { CHESS_SEATS, COURTYARD, PIECE_HAN, sideOf, xy } from '@chua/shared';
import { useGame } from '../../state/store';
import { C } from './props';

const CELL = 0.072; // khoảng cách ô trên mặt bàn (m)
const TOP_Y = 0.62; // chiều cao mặt bàn
const BOARD_D = 1.2; // đường kính phần khắc bàn cờ
const T = COURTYARD.chess;

/** Mặt bàn: đá + bàn cờ khắc (canvas). */
function boardTexture() {
  const S = 512;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const c = cv.getContext('2d')!;
  c.fillStyle = '#b9ae9c';
  c.fillRect(0, 0, S, S);
  // vân đá
  for (let i = 0; i < 400; i++) {
    c.fillStyle = `rgba(${90 + Math.random() * 60},${85 + Math.random() * 50},${70 + Math.random() * 40},0.08)`;
    c.beginPath();
    c.arc(Math.random() * S, Math.random() * S, Math.random() * 18, 0, Math.PI * 2);
    c.fill();
  }
  const cell = S * (CELL / BOARD_D); // ảnh S px ↔ mặt khắc đường kính BOARD_D m
  const ox = S / 2 - 4 * cell;
  const oy = S / 2 - 4.5 * cell;
  c.strokeStyle = '#4a3a28';
  c.lineWidth = 2.2;
  for (let r = 0; r < 10; r++) {
    c.beginPath();
    c.moveTo(ox, oy + r * cell);
    c.lineTo(ox + 8 * cell, oy + r * cell);
    c.stroke();
  }
  for (let col = 0; col < 9; col++) {
    const edge = col === 0 || col === 8;
    c.beginPath();
    c.moveTo(ox + col * cell, oy);
    c.lineTo(ox + col * cell, oy + (edge ? 9 : 4) * cell);
    if (!edge) {
      c.moveTo(ox + col * cell, oy + 5 * cell);
      c.lineTo(ox + col * cell, oy + 9 * cell);
    }
    c.stroke();
  }
  // cung tướng
  for (const r0 of [0, 7]) {
    c.beginPath();
    c.moveTo(ox + 3 * cell, oy + r0 * cell);
    c.lineTo(ox + 5 * cell, oy + (r0 + 2) * cell);
    c.moveTo(ox + 5 * cell, oy + r0 * cell);
    c.lineTo(ox + 3 * cell, oy + (r0 + 2) * cell);
    c.stroke();
  }
  c.lineWidth = 4;
  c.strokeRect(ox - 8, oy - 8, 8 * cell + 16, 9 * cell + 16);
  c.fillStyle = '#4a3a28';
  c.font = `bold ${Math.round(cell * 0.42)}px "Noto Serif", Georgia, serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText('SỞ HÀ', ox + 2 * cell, oy + 4.5 * cell);
  c.fillText('HÁN GIỚI', ox + 6 * cell, oy + 4.5 * cell);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

const pieceTex = new Map<string, THREE.Texture>();
function pieceTexture(ch: string) {
  let t = pieceTex.get(ch);
  if (t) return t;
  const S = 128;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const c = cv.getContext('2d')!;
  const red = sideOf(ch) === 'r';
  c.fillStyle = '#f1dcae';
  c.beginPath();
  c.arc(S / 2, S / 2, S / 2 - 2, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = red ? '#b3261e' : '#1f1a16';
  c.lineWidth = 6;
  c.beginPath();
  c.arc(S / 2, S / 2, S / 2 - 12, 0, Math.PI * 2);
  c.stroke();
  c.fillStyle = red ? '#b3261e' : '#1f1a16';
  c.font = `bold 66px "Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", "SimSun", serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(PIECE_HAN[ch], S / 2, S / 2 + 3);
  t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  pieceTex.set(ch, t);
  return t;
}

const pieceGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.02, 20);
const sideMat = new THREE.MeshStandardMaterial({ color: '#d9bf8a', roughness: 0.6 });
const topMats = new Map<string, THREE.MeshStandardMaterial>();
const topMat = (ch: string) => {
  let m = topMats.get(ch);
  if (!m) topMats.set(ch, (m = new THREE.MeshStandardMaterial({ map: pieceTexture(ch), roughness: 0.5 })));
  return m;
};
/** Vị trí ô (x,y) trên mặt bàn (toạ độ local của bàn). Đỏ ở phía +z (ghế Đỏ). */
const cellPos = (i: number): [number, number] => {
  const [x, y] = xy(i);
  return [(x - 4) * CELL, (4.5 - y) * CELL];
};

function Pieces() {
  const chess = useGame((s) => s.chess);
  const board = chess?.board;
  const items = useMemo(() => {
    if (!board) return [];
    const out: { i: number; ch: string }[] = [];
    for (let i = 0; i < board.length; i++) if (board[i] !== '.') out.push({ i, ch: board[i] });
    return out;
  }, [board]);
  return (
    <group position={[0, TOP_Y + 0.011, 0]}>
      {items.map(({ i, ch }) => {
        const [px, pz] = cellPos(i);
        return (
          // mặt chữ quay về phía người cầm quân đó
          <mesh key={i} geometry={pieceGeo} material={[sideMat, topMat(ch), sideMat]} position={[px, 0, pz]} rotation={[0, sideOf(ch) === 'r' ? 0 : Math.PI, 0]} castShadow />
        );
      })}
      {chess?.last?.map((i, k) => {
        const [px, pz] = cellPos(i);
        return (
          <mesh key={k} position={[px, -0.009, pz]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.034, 0.042, 20]} />
            <meshBasicMaterial color={k ? '#e0402a' : '#e7b04a'} transparent opacity={0.85} />
          </mesh>
        );
      })}
    </group>
  );
}

export default function ChessTable() {
  const tex = useMemo(boardTexture, []);
  const open = (e: { delta: number; stopPropagation: () => void }) => {
    if (e.delta > 8) return;
    e.stopPropagation();
    useGame.setState({ chessOpen: true });
  };
  return (
    <group>
      <group position={[T.x, 0, T.z]} onClick={open}>
        {/* chân bàn */}
        <mesh position={[0, 0.28, 0]} castShadow>
          <cylinderGeometry args={[0.18, 0.3, 0.56, 10]} />
          <meshStandardMaterial color={C.stoneDark} flatShading />
        </mesh>
        {/* mặt bàn đá khắc bàn cờ */}
        <mesh position={[0, TOP_Y - 0.04, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.62, 0.6, 0.08, 32]} />
          <meshStandardMaterial color={C.stone} />
        </mesh>
        {/* mặt khắc: hình tròn phẳng – UV chuẩn: trục x ảnh = trục x, đỉnh ảnh = phía −z (bên Đen) */}
        <mesh position={[0, TOP_Y + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <circleGeometry args={[BOARD_D / 2, 48]} />
          <meshStandardMaterial map={tex} roughness={0.85} />
        </mesh>
        <Pieces />
      </group>
      {/* ghế đá (thấp, kiểu đôn) */}
      {(['r', 'b'] as const).map((s) => (
        <mesh key={s} position={[CHESS_SEATS[s].x, 0.14, CHESS_SEATS[s].z]} castShadow receiveShadow onClick={open}>
          <cylinderGeometry args={[0.24, 0.28, 0.28, 12]} />
          <meshStandardMaterial color={C.stone} flatShading />
        </mesh>
      ))}
    </group>
  );
}
