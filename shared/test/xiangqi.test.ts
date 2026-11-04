// Kiểm thử luật cờ tướng: npx tsx shared/test/xiangqi.test.ts
import {
  START_BOARD, allLegalMoves, applyMove, gameOver, inCheck, isLegal, legalMovesFrom, sq, xy,
} from '../src/xiangqi';

let pass = 0, fail = 0;
const check = (c: boolean, label: string) => {
  c ? pass++ : fail++;
  console.log(`${c ? 'PASS' : 'FAIL'}  ${label}`);
};
/** Dựng bàn từ danh sách quân: [ký hiệu, x, y] */
const board = (pieces: [string, number, number][]) => {
  const a = Array(90).fill('.');
  for (const [c, x, y] of pieces) a[sq(x, y)] = c;
  return a.join('');
};
const names = (ms: number[]) => ms.map((m) => xy(m).join(',')).sort().join(' ');

check(allLegalMoves(START_BOARD, 'r').length === 44, `thế khởi đầu: Đỏ có 44 nước (${allLegalMoves(START_BOARD, 'r').length})`);
check(allLegalMoves(START_BOARD, 'b').length === 44, 'thế khởi đầu: Đen có 44 nước');
check(names(legalMovesFrom(START_BOARD, sq(1, 0))) === '0,2 2,2', `mã đầu ván: bị cản chân sang ngang, còn 2 nước (${names(legalMovesFrom(START_BOARD, sq(1, 0)))})`);
const cannon = legalMovesFrom(START_BOARD, sq(1, 2));
check(cannon.length === 12 && cannon.includes(sq(1, 9)) && !cannon.includes(sq(1, 8)), `pháo đầu ván: 12 nước, ăn mã qua ngòi, không đứng sau ngòi (${cannon.length})`);
check(!isLegal(START_BOARD, 'r', sq(1, 2), sq(1, 7)), 'pháo không ăn được khi không có ngòi');

const e = board([['K', 4, 0], ['k', 3, 9], ['E', 2, 4]]);
check(names(legalMovesFrom(e, sq(2, 4))) === '0,2 4,2', `tượng không qua sông (${names(legalMovesFrom(e, sq(2, 4)))})`);
const eBlocked = board([['K', 4, 0], ['k', 3, 9], ['E', 2, 4], ['P', 1, 3]]);
check(names(legalMovesFrom(eBlocked, sq(2, 4))) === '4,2', 'tượng bị cản mắt');

const p = board([['K', 3, 0], ['k', 5, 9], ['P', 4, 5]]);
check(names(legalMovesFrom(p, sq(4, 5))) === '3,5 4,6 5,5', `tốt qua sông đi ngang được (${names(legalMovesFrom(p, sq(4, 5)))})`);
const p2 = board([['K', 3, 0], ['k', 5, 9], ['P', 4, 3]]);
check(names(legalMovesFrom(p2, sq(4, 3))) === '4,4', 'tốt chưa qua sông chỉ đi thẳng');

// Lộ mặt tướng: xe đang che giữa hai tướng không được rời cột
const fly = board([['K', 4, 0], ['k', 4, 9], ['R', 4, 5]]);
check(legalMovesFrom(fly, sq(4, 5)).every((t) => xy(t)[0] === 4), 'xe che mặt tướng không được rời cột (lộ mặt tướng)');
check(!isLegal(board([['K', 3, 0], ['k', 4, 9]]), 'r', sq(3, 0), sq(4, 0)), 'tướng không được bước ra đối mặt tướng địch');

const kingOut = board([['K', 4, 0], ['k', 3, 9]]);
check(!isLegal(kingOut, 'r', sq(4, 0), sq(4, 3)) && !isLegal(kingOut, 'r', sq(4, 0), sq(6, 0)), 'tướng không ra khỏi cung, không đi 2 ô');
check(names(legalMovesFrom(board([['K', 4, 0], ['k', 3, 9], ['A', 4, 1]]), sq(4, 1))) === '3,0 3,2 5,0 5,2', 'sĩ đi chéo trong cung');

// Chiếu bí: tướng Đen ở góc cung, 2 xe Đỏ khoá hàng 9 và hàng 8
const mate = board([['K', 5, 0], ['k', 3, 9], ['R', 0, 9], ['R', 0, 8]]);
check(inCheck(mate, 'b') && gameOver(mate, 'b') === 'checkmate', 'hai xe khoá hàng → Đen bị chiếu bí');
check(gameOver(START_BOARD, 'r') === null, 'đầu ván chưa kết thúc');
// Hết nước (không bị chiếu) cũng thua
const stale = board([['K', 4, 0], ['k', 3, 9], ['R', 5, 8], ['R', 2, 1], ['H', 1, 7]]);
const st = gameOver(stale, 'b');
check(st === 'stalemate' || st === 'checkmate', `bên hết nước đi bị xử thua (${st})`);

// Không được đi nước để tướng mình bị chiếu
const pin = board([['K', 4, 0], ['k', 3, 9], ['A', 4, 1], ['r', 4, 7]]);
check(!isLegal(pin, 'r', sq(4, 1), sq(3, 2)), 'sĩ đang che xe địch không được rời ra (tự để bị chiếu)');
// Mã ăn quân & đi nước thật
const after = applyMove(START_BOARD, sq(7, 2), sq(4, 2)); // pháo đầu
check(after[sq(4, 2)] === 'C' && after[sq(7, 2)] === '.', 'applyMove: pháo đầu (pháo 2 bình 5)');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
