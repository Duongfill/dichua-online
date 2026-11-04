// Bàn cờ tướng ở sân chùa (mỗi kênh 1 bàn). Server giữ ván cờ và kiểm tra từng nước bằng luật dùng chung.
import {
  START_BOARD, SIDE_NAME, applyMove, gameOver, inCheck, isLegal, other,
  type ChessState, type Side,
} from '@chua/shared';

export class ChessTable {
  state: ChessState = {
    id: 'stone-1',
    board: START_BOARD,
    turn: 'r',
    red: null,
    black: null,
    status: 'waiting',
    winner: null,
    reason: '',
    last: null,
    check: false,
    moveNo: 0,
  };

  seatOf(pid: string): Side | null {
    if (this.state.red?.id === pid) return 'r';
    if (this.state.black?.id === pid) return 'b';
    return null;
  }

  private newGame() {
    Object.assign(this.state, { board: START_BOARD, turn: 'r', status: 'playing', winner: null, reason: '', last: null, check: false, moveNo: 0 });
  }

  /** Ngồi vào ghế. Đủ 2 người & bàn đang chờ → bắt đầu ván. Trả lỗi (chuỗi) hoặc null. */
  sit(pid: string, name: string, side: Side): string | null {
    const key = side === 'r' ? 'red' : 'black';
    const cur = this.state[key];
    if (cur && cur.id !== pid) return `Ghế quân ${SIDE_NAME[side]} đã có người ngồi.`;
    if (this.seatOf(pid) && this.seatOf(pid) !== side) return 'Bạn đang ngồi ghế bên kia.';
    const already = this.seatOf(pid) === side;
    this.state[key] = { id: pid, name };
    // có người MỚI ngồi vào và đủ 2 người, không có ván nào đang đánh → ván mới
    // (kể cả khi bàn còn thế cờ của ván trước đã kết thúc)
    if (!already && this.state.status !== 'playing' && this.state.red && this.state.black) this.newGame();
    return null;
  }

  /** Rời ghế. Đang giữa ván → bên kia thắng. Trả về thông báo kết thúc (nếu có). */
  leave(pid: string): string | null {
    const s = this.seatOf(pid);
    if (!s) return null;
    let msg: string | null = null;
    if (this.state.status === 'playing') msg = this.end(other(s), 'rời bàn');
    if (s === 'r') this.state.red = null;
    else this.state.black = null;
    // cả hai ghế đều trống → xếp lại bàn, chờ người mới (còn 1 người thì giữ thế cờ cuối để xem lại)
    if (!this.state.red && !this.state.black) {
      Object.assign(this.state, { board: START_BOARD, turn: 'r', status: 'waiting', winner: null, reason: '', last: null, check: false, moveNo: 0 });
    }
    return msg;
  }

  move(pid: string, from: number, to: number): { error?: string; ended?: string } {
    const st = this.state;
    const s = this.seatOf(pid);
    if (!s) return { error: 'Bạn chưa ngồi vào bàn cờ.' };
    if (st.status !== 'playing') return { error: 'Ván cờ chưa bắt đầu.' };
    if (st.turn !== s) return { error: `Chưa tới lượt bạn (đang tới lượt ${SIDE_NAME[st.turn]}).` };
    if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to < 0 || from >= 90 || to >= 90) return { error: 'Nước đi không hợp lệ.' };
    if (!isLegal(st.board, s, from, to)) return { error: 'Nước đi không hợp lệ.' };
    st.board = applyMove(st.board, from, to);
    st.last = [from, to];
    st.moveNo++;
    st.turn = other(s);
    st.check = inCheck(st.board, st.turn);
    const over = gameOver(st.board, st.turn);
    if (over) return { ended: this.end(s, over === 'checkmate' ? 'chiếu bí' : 'hết nước đi') };
    if (st.moveNo >= 300) return { ended: this.end(null, 'quá 300 nước – hòa') };
    return {};
  }

  resign(pid: string): string | null {
    const s = this.seatOf(pid);
    if (!s || this.state.status !== 'playing') return null;
    return this.end(other(s), 'xin thua');
  }

  /** Ván mới (cả hai còn ngồi). */
  rematch(pid: string): string | null {
    if (!this.seatOf(pid)) return 'Bạn chưa ngồi vào bàn cờ.';
    if (this.state.status === 'playing') return 'Ván cờ đang diễn ra.';
    if (!this.state.red || !this.state.black) {
      Object.assign(this.state, { board: START_BOARD, turn: 'r', status: 'waiting', winner: null, reason: '', last: null, check: false, moveNo: 0 });
      return null;
    }
    this.newGame();
    return null;
  }

  private end(winner: Side | null, reason: string): string {
    const st = this.state;
    st.status = 'ended';
    st.winner = winner;
    st.reason = reason;
    if (!winner) return `Ván cờ tướng hòa (${reason})`;
    const w = winner === 'r' ? st.red : st.black;
    const l = winner === 'r' ? st.black : st.red;
    return `♟ ${w?.name ?? SIDE_NAME[winner]} (${SIDE_NAME[winner]}) thắng ${l?.name ?? SIDE_NAME[other(winner)]} – ${reason}`;
  }
}
