// Thư hệ thống (giai đoạn 2: thư chào mừng phía client; giai đoạn 6 chuyển lên server).
import { create } from 'zustand';
export interface Letter { id: string; title: string; body: string; from: string; date: string }

export const LETTERS: Letter[] = [
  {
    id: 'welcome-1',
    title: 'Chào mừng đến Chùa Online',
    from: 'Ban quản lý chùa',
    date: '2026-11-04',
    body:
      'Kính chào quý Phật tử! Chùa Online là nơi cùng nhau đi dạo, lễ Phật, nghe kinh và trò chuyện trong không khí an yên. ' +
      'Xin giữ lời nói ôn hòa, không quảng cáo. Quý vị được tặng 10 ngọc để làm quen. A Di Đà Phật.',
  },
  {
    id: 'roadmap-1',
    title: 'Những điều sắp có',
    from: 'Ban quản lý chùa',
    date: '2026-11-04',
    body:
      'Sắp tới chùa sẽ có: thắp hương, lạy Phật, thỉnh chuông, phóng sinh; ngồi bồ đoàn nghe kinh chung và trò chuyện bằng giọng nói; ' +
      'nhiệm vụ hằng ngày và lịch lễ mùng 1, rằm. Kính mời quý vị thường xuyên ghé thăm.',
  },
];

const KEY = 'c3.mailRead';
const initial = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
};

export const useMail = create<{ read: string[]; markRead: (id: string) => void }>((set, get) => ({
  read: initial(),
  markRead: (id) => {
    if (get().read.includes(id)) return;
    const read = [...get().read, id];
    set({ read });
    try {
      localStorage.setItem(KEY, JSON.stringify(read));
    } catch {
      /* bỏ qua */
    }
  },
}));
export const useUnreadMail = () => useMail((s) => LETTERS.filter((l) => !s.read.includes(l.id)).length);
