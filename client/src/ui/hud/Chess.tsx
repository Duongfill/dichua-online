// Bàn cờ tướng (2D) – chơi hoặc xem ván đang diễn ra ở bàn đá ngoài sân chùa.
import { useEffect, useState } from 'react';
import {
  PIECE_HAN, PIECE_VI_SHORT, SIDE_NAME, START_BOARD, legalMovesFrom, sideOf, xy,
  type ChessState, type Side,
} from '@chua/shared';
import { useGame } from '../../state/store';
import { unlockAudio } from '../../game/sfx';
import { CloseIcon } from '../icons';

const CELL = 10;
const M = 7; // lề
const W = 8 * CELL + M * 2;
const H = 9 * CELL + M * 2;
const INK: Record<Side, string> = { r: '#b3261e', b: '#1f1a16' };

const EMPTY: ChessState = {
  id: 'stone-1', board: START_BOARD, turn: 'r', red: null, black: null, status: 'waiting',
  winner: null, reason: '', last: null, check: false, moveNo: 0,
};

const loadVi = () => {
  try {
    return localStorage.getItem('c3.chessVi') === '1';
  } catch {
    return false;
  }
};

function BoardSvg({ st, mySide, sel, targets, vi, onCell }: {
  st: ChessState; mySide: Side | null; sel: number | null; targets: number[]; vi: boolean; onCell: (i: number) => void;
}) {
  const flip = mySide === 'b'; // cầm Đen → xoay bàn để quân mình ở dưới
  const pos = (i: number): [number, number] => {
    const [x, y] = xy(i);
    const dc = flip ? 8 - x : x;
    const dr = flip ? y : 9 - y;
    return [M + dc * CELL, M + dr * CELL];
  };
  const kingInCheck = st.check ? st.board.indexOf(st.turn === 'r' ? 'K' : 'k') : -1;
  const lines: JSX.Element[] = [];
  for (let r = 0; r < 10; r++) lines.push(<line key={`h${r}`} x1={M} y1={M + r * CELL} x2={M + 8 * CELL} y2={M + r * CELL} />);
  for (let c = 0; c < 9; c++) {
    const x = M + c * CELL;
    if (c === 0 || c === 8) lines.push(<line key={`v${c}`} x1={x} y1={M} x2={x} y2={M + 9 * CELL} />);
    else {
      lines.push(<line key={`v${c}a`} x1={x} y1={M} x2={x} y2={M + 4 * CELL} />);
      lines.push(<line key={`v${c}b`} x1={x} y1={M + 5 * CELL} x2={x} y2={M + 9 * CELL} />);
    }
  }
  for (const r0 of [0, 7]) {
    lines.push(<line key={`p${r0}a`} x1={M + 3 * CELL} y1={M + r0 * CELL} x2={M + 5 * CELL} y2={M + (r0 + 2) * CELL} />);
    lines.push(<line key={`p${r0}b`} x1={M + 5 * CELL} y1={M + r0 * CELL} x2={M + 3 * CELL} y2={M + (r0 + 2) * CELL} />);
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full touch-manipulation select-none" role="grid" aria-label="Bàn cờ tướng">
      <rect x={1} y={1} width={W - 2} height={H - 2} rx={2} fill="#e8cf98" stroke="#8f6629" strokeWidth={1} />
      <rect x={M - 2} y={M - 2} width={8 * CELL + 4} height={9 * CELL + 4} fill="none" stroke="#5a4020" strokeWidth={0.8} />
      <g stroke="#5a4020" strokeWidth={0.45}>{lines}</g>
      <text x={M + 2 * CELL} y={M + 4.5 * CELL} fontSize={3.6} fill="#5a4020" textAnchor="middle" dominantBaseline="central" fontWeight={700}>SỞ HÀ</text>
      <text x={M + 6 * CELL} y={M + 4.5 * CELL} fontSize={3.6} fill="#5a4020" textAnchor="middle" dominantBaseline="central" fontWeight={700}>HÁN GIỚI</text>

      {/* nước đi vừa rồi */}
      {st.last?.map((i, k) => {
        const [px, py] = pos(i);
        return <rect key={`l${k}`} x={px - 4.8} y={py - 4.8} width={9.6} height={9.6} rx={1.5} fill="none" stroke={k ? '#e0402a' : '#d79a2b'} strokeWidth={0.7} strokeDasharray={k ? undefined : '1.5 1'} />;
      })}

      {/* quân cờ */}
      {[...st.board].map((ch, i) => {
        if (ch === '.') return null;
        const s = sideOf(ch)!;
        const [px, py] = pos(i);
        const label = vi ? PIECE_VI_SHORT[ch.toUpperCase()] : PIECE_HAN[ch];
        return (
          <g key={i} onClick={() => onCell(i)} className="cursor-pointer" role="gridcell" aria-label={`${SIDE_NAME[s]} ${label}`}>
            {i === kingInCheck && <circle cx={px} cy={py} r={5.6} fill="#ff3b2a" opacity={0.45} />}
            <circle cx={px} cy={py} r={4.5} fill="#f6e4b8" stroke={sel === i ? '#2f8f4e' : INK[s]} strokeWidth={sel === i ? 1.1 : 0.6} />
            <circle cx={px} cy={py} r={3.7} fill="none" stroke={INK[s]} strokeWidth={0.25} />
            <text x={px} y={py + 0.2} fontSize={vi ? 3.2 : 4.8} fill={INK[s]} textAnchor="middle" dominantBaseline="central" fontWeight={700}
              fontFamily={vi ? '"Be Vietnam Pro", sans-serif' : '"Microsoft YaHei","PingFang SC","Noto Sans CJK SC",serif'}>
              {label}
            </text>
          </g>
        );
      })}

      {/* nước có thể đi */}
      {targets.map((t) => {
        const [px, py] = pos(t);
        const capture = st.board[t] !== '.';
        return (
          <g key={`t${t}`} onClick={() => onCell(t)} className="cursor-pointer">
            <circle cx={px} cy={py} r={4.6} fill="transparent" />
            {capture ? <circle cx={px} cy={py} r={4.9} fill="none" stroke="#2f8f4e" strokeWidth={0.9} /> : <circle cx={px} cy={py} r={1.4} fill="#2f8f4e" opacity={0.8} />}
          </g>
        );
      })}
    </svg>
  );
}

function SeatBar({ st, side, mySide, onSit }: { st: ChessState; side: Side; mySide: Side | null; onSit: (s: Side) => void }) {
  const seat = side === 'r' ? st.red : st.black;
  const turn = st.status === 'playing' && st.turn === side;
  return (
    <div className={`flex items-center gap-2 rounded-2xl px-3 py-1.5 ${turn ? 'bg-white/70 ring-2 ring-jade-400' : 'bg-white/40'}`}>
      <span className="h-3.5 w-3.5 shrink-0 rounded-full ring-2 ring-white" style={{ background: INK[side] }} />
      <span className="min-w-0 flex-1 truncate text-sm font-semibold">
        {seat ? seat.name : <span className="font-normal text-amberwood-800/70">Ghế trống</span>}
        {seat && side === mySide && <span className="ml-1 text-xs font-normal text-amberwood-800/70">(bạn)</span>}
        <span className="ml-1 text-xs font-normal text-amberwood-800/70">· quân {SIDE_NAME[side]}</span>
      </span>
      {turn && <span className="rounded-full bg-jade-500 px-2 py-0.5 text-[11px] font-semibold text-white">{st.check ? 'Bị chiếu!' : 'Đang đi'}</span>}
      {!seat && !mySide && (
        <button onClick={() => onSit(side)} className="btn-primary px-3 py-1 text-xs">
          Ngồi cầm quân {SIDE_NAME[side]}
        </button>
      )}
    </div>
  );
}

export default function ChessPanel() {
  const open = useGame((s) => s.chessOpen);
  const chess = useGame((s) => s.chess);
  const selfId = useGame((s) => s.self?.id);
  const scene = useGame((s) => s.scene);
  const { chessSit, chessLeave, chessMove, chessCmd } = useGame.getState();
  const [sel, setSel] = useState<number | null>(null);
  const [vi, setVi] = useState(loadVi);
  const [confirm, setConfirm] = useState<null | 'resign' | 'leave'>(null);
  const st = chess ?? EMPTY;
  const mySide: Side | null = st.red?.id === selfId ? 'r' : st.black?.id === selfId ? 'b' : null;
  const myTurn = st.status === 'playing' && mySide === st.turn;

  useEffect(() => setSel(null), [st.moveNo, st.status]);
  useEffect(() => setConfirm(null), [st.status]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && useGame.setState({ chessOpen: false });
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);
  if (!open || scene !== 'courtyard') return null;

  const targets = sel !== null && myTurn ? legalMovesFrom(st.board, sel) : [];
  const onCell = (i: number) => {
    unlockAudio();
    if (!myTurn) return;
    if (sel !== null && targets.includes(i)) {
      const from = sel;
      setSel(null);
      chessMove(from, i);
      return;
    }
    setSel(sideOf(st.board[i]) === mySide && sel !== i ? i : null);
  };

  const status =
    st.status === 'waiting'
      ? st.red || st.black ? 'Đang chờ người thứ hai ngồi vào bàn…' : 'Bàn cờ đang trống – mời ngồi vào một ghế.'
      : st.status === 'playing'
        ? myTurn ? (st.check ? 'Bạn đang bị chiếu! Hãy đỡ chiếu.' : 'Tới lượt bạn – chạm quân để chọn.') : `Lượt quân ${SIDE_NAME[st.turn]}${mySide ? ' – chờ đối thủ…' : ''}`
        : st.winner ? `Quân ${SIDE_NAME[st.winner]} thắng (${st.reason}).` : `Hòa (${st.reason}).`;
  const top: Side = mySide === 'b' ? 'r' : 'b';
  const bottom: Side = top === 'r' ? 'b' : 'r';

  return (
    <div className="pointer-events-auto fixed inset-0 z-40 flex items-end justify-center md:items-center" role="dialog" aria-modal="true" aria-label="Bàn cờ tướng">
      <div className="absolute inset-0 bg-amberwood-900/35" onClick={() => useGame.setState({ chessOpen: false })} />
      <div className="glass fade-enter relative max-h-[96dvh] w-full max-w-[460px] overflow-y-auto rounded-b-none bg-[#f7ecd6]/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:rounded-3xl md:p-4">
        <header className="mb-2 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-brick-700">♟ Cờ tướng</h2>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                const v = !vi;
                setVi(v);
                try {
                  localStorage.setItem('c3.chessVi', v ? '1' : '0');
                } catch {
                  /* bỏ qua */
                }
              }}
              className="btn-glass px-2.5 py-1 text-xs"
              title="Đổi cách hiện chữ trên quân cờ"
            >
              {vi ? 'Chữ Hán' : 'Chữ Việt'}
            </button>
            <button onClick={() => useGame.setState({ chessOpen: false })} className="grid h-8 w-8 place-items-center rounded-full bg-white/50 hover:bg-white/80" aria-label="Đóng">
              <CloseIcon size={18} />
            </button>
          </div>
        </header>

        <SeatBar st={st} side={top} mySide={mySide} onSit={chessSit} />
        <div className="my-1.5">
          <BoardSvg st={st} mySide={mySide} sel={sel} targets={targets} vi={vi} onCell={onCell} />
        </div>
        <SeatBar st={st} side={bottom} mySide={mySide} onSit={chessSit} />

        <p className={`mt-2 text-center text-sm font-semibold ${st.check && myTurn ? 'text-brick-600' : 'text-amberwood-900'}`} role="status">
          {status}
        </p>

        {mySide ? (
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            {confirm ? (
              <>
                <span className="w-full text-center text-xs text-brick-700">
                  {confirm === 'resign' ? 'Chắc chắn xin thua ván này?' : 'Rời bàn giữa ván sẽ bị xử thua. Vẫn rời?'}
                </span>
                <button className="btn-primary px-4 py-1.5 text-sm" onClick={() => (confirm === 'resign' ? chessCmd('chess:resign') : chessLeave(), setConfirm(null))}>
                  Đồng ý
                </button>
                <button className="btn-glass px-4 py-1.5" onClick={() => setConfirm(null)}>Thôi</button>
              </>
            ) : (
              <>
                {st.status === 'playing' && (
                  <button className="btn-glass px-4 py-1.5" onClick={() => setConfirm('resign')}>🏳 Xin thua</button>
                )}
                {st.status === 'ended' && (
                  <button className="btn-primary px-4 py-1.5 text-sm" onClick={() => chessCmd('chess:rematch')}>Ván mới</button>
                )}
                <button className="btn-glass px-4 py-1.5" onClick={() => (st.status === 'playing' ? setConfirm('leave') : chessLeave())}>Rời bàn</button>
              </>
            )}
          </div>
        ) : (
          <p className="mt-1 text-center text-xs text-amberwood-800/70">Đang xem ván cờ. Ngồi vào ghế trống để chơi – cần lại gần bàn đá.</p>
        )}
      </div>
    </div>
  );
}
