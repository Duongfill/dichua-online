// Luật cờ tướng – dùng chung: server kiểm tra nước đi, client gợi ý nước hợp lệ.
// Bàn 9 cột (x 0..8) × 10 hàng (y 0..9). Đỏ ở dưới (y 0..4), Đen ở trên (y 5..9). Sông giữa y 4 và 5.
// Bàn cờ = chuỗi 90 ký tự, chỉ số = y*9 + x. '.' = trống; chữ HOA = Đỏ, chữ thường = Đen.
// K tướng · A sĩ · E tượng · H mã · R xe · C pháo · P tốt

export type Side = 'r' | 'b';
export type Board = string;
export const COLS = 9;
export const ROWS = 10;

export const START_BOARD: Board = [
  'RHEAKAEHR', // y=0 hàng cuối của Đỏ
  '.........',
  '.C.....C.',
  'P.P.P.P.P',
  '.........',
  '.........', // sông
  'p.p.p.p.p',
  '.c.....c.',
  '.........',
  'rheakaehr', // y=9 hàng cuối của Đen
].join('');

export const sq = (x: number, y: number) => y * COLS + x;
export const xy = (i: number): [number, number] => [i % COLS, Math.floor(i / COLS)];
export const sideOf = (ch: string): Side | null => (ch === '.' || !ch ? null : ch === ch.toUpperCase() ? 'r' : 'b');
export const other = (s: Side): Side => (s === 'r' ? 'b' : 'r');
const inBoard = (x: number, y: number) => x >= 0 && x < COLS && y >= 0 && y < ROWS;
const inPalace = (s: Side, x: number, y: number) => x >= 3 && x <= 5 && (s === 'r' ? y <= 2 : y >= 7);
const ownHalf = (s: Side, y: number) => (s === 'r' ? y <= 4 : y >= 5);

/** Nước đi "thô" của quân tại from (chưa xét tự để tướng bị chiếu). */
export function pseudoMoves(b: Board, from: number): number[] {
  const ch = b[from];
  const s = sideOf(ch);
  if (!s) return [];
  const [x, y] = xy(from);
  const out: number[] = [];
  const add = (nx: number, ny: number) => {
    if (!inBoard(nx, ny)) return;
    const t = b[sq(nx, ny)];
    if (sideOf(t) !== s) out.push(sq(nx, ny));
  };
  const empty = (nx: number, ny: number) => inBoard(nx, ny) && b[sq(nx, ny)] === '.';
  const ORTHO = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const DIAG = [[1, 1], [1, -1], [-1, 1], [-1, -1]];

  switch (ch.toUpperCase()) {
    case 'K':
      for (const [dx, dy] of ORTHO) if (inPalace(s, x + dx, y + dy)) add(x + dx, y + dy);
      break;
    case 'A':
      for (const [dx, dy] of DIAG) if (inPalace(s, x + dx, y + dy)) add(x + dx, y + dy);
      break;
    case 'E':
      for (const [dx, dy] of DIAG) {
        const nx = x + 2 * dx, ny = y + 2 * dy;
        if (inBoard(nx, ny) && ownHalf(s, ny) && empty(x + dx, y + dy)) add(nx, ny); // cản mắt tượng
      }
      break;
    case 'H':
      for (const [dx, dy] of [[1, 2], [-1, 2], [1, -2], [-1, -2], [2, 1], [2, -1], [-2, 1], [-2, -1]]) {
        const lx = Math.abs(dx) === 2 ? x + dx / 2 : x;
        const ly = Math.abs(dy) === 2 ? y + dy / 2 : y;
        if (empty(lx, ly)) add(x + dx, y + dy); // cản chân mã
      }
      break;
    case 'R':
      for (const [dx, dy] of ORTHO) {
        let nx = x + dx, ny = y + dy;
        while (inBoard(nx, ny)) {
          const t = b[sq(nx, ny)];
          if (t === '.') out.push(sq(nx, ny));
          else {
            if (sideOf(t) !== s) out.push(sq(nx, ny));
            break;
          }
          nx += dx;
          ny += dy;
        }
      }
      break;
    case 'C':
      for (const [dx, dy] of ORTHO) {
        let nx = x + dx, ny = y + dy;
        let screen = false;
        while (inBoard(nx, ny)) {
          const t = b[sq(nx, ny)];
          if (!screen) {
            if (t === '.') out.push(sq(nx, ny));
            else screen = true; // gặp ngòi
          } else if (t !== '.') {
            if (sideOf(t) !== s) out.push(sq(nx, ny)); // ăn qua đúng 1 ngòi
            break;
          }
          nx += dx;
          ny += dy;
        }
      }
      break;
    case 'P': {
      const fwd = s === 'r' ? 1 : -1;
      add(x, y + fwd);
      if (!ownHalf(s, y)) {
        add(x + 1, y);
        add(x - 1, y);
      }
      break;
    }
  }
  return out;
}

export function applyMove(b: Board, from: number, to: number): Board {
  const arr = b.split('');
  arr[to] = arr[from];
  arr[from] = '.';
  return arr.join('');
}

const findKing = (b: Board, s: Side) => b.indexOf(s === 'r' ? 'K' : 'k');

/** Lộ mặt tướng: hai tướng cùng cột, giữa không có quân nào. */
export function kingsFacing(b: Board): boolean {
  const r = findKing(b, 'r');
  const k = findKing(b, 'b');
  if (r < 0 || k < 0) return false;
  const [rx, ry] = xy(r);
  const [kx, ky] = xy(k);
  if (rx !== kx) return false;
  for (let y = ry + 1; y < ky; y++) if (b[sq(rx, y)] !== '.') return false;
  return true;
}

export function inCheck(b: Board, s: Side): boolean {
  const k = findKing(b, s);
  if (k < 0) return true;
  if (kingsFacing(b)) return true;
  const o = other(s);
  for (let i = 0; i < b.length; i++) if (sideOf(b[i]) === o && pseudoMoves(b, i).includes(k)) return true;
  return false;
}

/** Nước hợp lệ của quân tại from (không được tự để tướng bị chiếu / lộ mặt tướng). */
export function legalMovesFrom(b: Board, from: number): number[] {
  const s = sideOf(b[from]);
  if (!s) return [];
  return pseudoMoves(b, from).filter((to) => !inCheck(applyMove(b, from, to), s));
}

export function allLegalMoves(b: Board, s: Side): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < b.length; i++) if (sideOf(b[i]) === s) for (const to of legalMovesFrom(b, i)) out.push([i, to]);
  return out;
}

export function isLegal(b: Board, s: Side, from: number, to: number): boolean {
  return sideOf(b[from]) === s && legalMovesFrom(b, from).includes(to);
}

/** Bên s đến lượt mà hết nước → thua (cờ tướng: bị chiếu bí hay hết nước đều thua). */
export function gameOver(b: Board, s: Side): null | 'checkmate' | 'stalemate' {
  if (allLegalMoves(b, s).length) return null;
  return inCheck(b, s) ? 'checkmate' : 'stalemate';
}

// ---------- Hiển thị ----------
export const PIECE_HAN: Record<string, string> = {
  K: '帥', A: '仕', E: '相', H: '傌', R: '俥', C: '炮', P: '兵',
  k: '將', a: '士', e: '象', h: '馬', r: '車', c: '砲', p: '卒',
};
export const PIECE_VI: Record<string, string> = { K: 'Tướng', A: 'Sĩ', E: 'Tượng', H: 'Mã', R: 'Xe', C: 'Pháo', P: 'Tốt' };
export const PIECE_VI_SHORT: Record<string, string> = { K: 'Tg', A: 'S', E: 'T', H: 'M', R: 'X', C: 'P', P: 'B' };
export const SIDE_NAME: Record<Side, string> = { r: 'Đỏ', b: 'Đen' };

// ---------- Trạng thái bàn cờ gửi qua mạng ----------
export interface ChessSeat { id: string; name: string }
export interface ChessState {
  id: string;
  board: Board;
  turn: Side;
  red: ChessSeat | null;
  black: ChessSeat | null;
  status: 'waiting' | 'playing' | 'ended';
  winner: Side | null;
  reason: string; // "chiếu bí", "hết nước", "xin thua", "rời bàn"
  last: [number, number] | null;
  check: boolean;
  moveNo: number;
}
