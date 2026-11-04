import type { ComponentType } from 'react';
import type { PanelId } from '../state/store';
import * as I from './icons';

export interface ActionDef {
  id: string;
  label: string;
  Icon: ComponentType<I.IconProps>;
  /** gradient nền icon */
  tone: string;
  /** giai đoạn triển khai */
  phase: number;
}

// Cột hành động bên phải (3 cột). 4 hành động đầu làm ở giai đoạn 3, còn lại "Sắp ra mắt".
export const ACTIONS: ActionDef[] = [
  { id: 'incense', label: 'Thắp hương', Icon: I.IncenseIcon, tone: 'from-[#f0a65c] to-[#c55a2a]', phase: 3 },
  { id: 'bow', label: 'Lạy Phật', Icon: I.BowIcon, tone: 'from-[#f2c76b] to-[#c48a2c]', phase: 3 },
  { id: 'bell', label: 'Thỉnh chuông', Icon: I.BellIcon, tone: 'from-[#d6b26e] to-[#8f6a2c]', phase: 3 },
  { id: 'release', label: 'Phóng sinh', Icon: I.FishIcon, tone: 'from-[#79c2c0] to-[#3d8a8a]', phase: 3 },
  { id: 'fortune', label: 'Xin xăm', Icon: I.FortuneIcon, tone: 'from-[#e5806a] to-[#a8432f]', phase: 7 },
  { id: 'horoscope', label: 'Tử vi', Icon: I.HoroscopeIcon, tone: 'from-[#8fa3d6] to-[#4f5f9a]', phase: 7 },
  { id: 'lantern', label: 'Hoa đăng', Icon: I.LotusLampIcon, tone: 'from-[#f3a7bd] to-[#c8607f]', phase: 7 },
  { id: 'ribbon', label: 'Dải đỏ', Icon: I.RibbonIcon, tone: 'from-[#e86a5a] to-[#a32d22]', phase: 7 },
  { id: 'wheel', label: 'Kinh luân', Icon: I.WheelIcon, tone: 'from-[#e3c06b] to-[#a5792b]', phase: 7 },
  { id: 'stupa', label: 'Nhiều tháp', Icon: I.StupaIcon, tone: 'from-[#9cc58f] to-[#557f4b]', phase: 7 },
  { id: 'memorial', label: 'Tưởng niệm', Icon: I.CandleIcon, tone: 'from-[#c9b8a4] to-[#7d6a58]', phase: 7 },
  { id: 'shrine', label: 'Điện thờ', Icon: I.ShrineIcon, tone: 'from-[#d98c6a] to-[#8c3f2a]', phase: 7 },
];

export interface NavDef { id: PanelId; label: string; Icon: ComponentType<I.IconProps> }
export const NAV: NavDef[] = [
  { id: 'quests', label: 'Nhiệm vụ', Icon: I.QuestIcon },
  { id: 'bag', label: 'Túi đồ', Icon: I.BagIcon },
  { id: 'shop', label: 'Cửa hàng', Icon: I.ShopIcon },
  { id: 'friends', label: 'Đạo hữu', Icon: I.FriendsIcon },
  { id: 'map', label: 'Bản đồ', Icon: I.MapIcon },
  { id: 'prayers', label: 'Văn khấn', Icon: I.BookIcon },
  { id: 'calendar', label: 'Lịch lễ', Icon: I.CalendarIcon },
  { id: 'settings', label: 'Cài đặt', Icon: I.GearIcon },
];
