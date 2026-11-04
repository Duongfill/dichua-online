// Bộ icon tự vẽ (nét tròn 24×24), dùng currentColor.
import type { ReactNode } from 'react';

export type IconProps = { size?: number; className?: string };
const mk = (body: ReactNode) =>
  function Icon({ size = 22, className = '' }: IconProps) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
        strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
        {body}
      </svg>
    );
  };

// ---- hành động ----
export const IncenseIcon = mk(<><path d="M8 5v8M12 4v9M16 5v8" /><path d="M5 14h14l-2 6H7z" /><path d="M12 4c-1-1 1-2 0-3" /></>);
export const BowIcon = mk(<><path d="M12 3c-1.6 2-3 5-3 9v4l-3 3h12l-3-3v-4c0-4-1.4-7-3-9z" /><path d="M12 4v13" /></>);
export const BellIcon = mk(<><path d="M12 3v2M7 10a5 5 0 0 1 10 0v5l2 2H5l2-2z" /><path d="M10 20a2 2 0 0 0 4 0" /></>);
export const FishIcon = mk(<><path d="M3 12c3-4 8-5 12-3l4-3v12l-4-3c-4 2-9 1-12-3z" /><circle cx="8" cy="11.5" r=".9" fill="currentColor" /></>);
export const FortuneIcon = mk(<><path d="M7 10h10l-1 11H8z" /><path d="M9.5 10 8 3M12 10V3M14.5 10 16 3" /></>);
export const HoroscopeIcon = mk(<><path d="M15 4a7 7 0 1 0 5 11 6 6 0 0 1-5-11z" /><path d="M7 4l.7 1.6L9.3 6.3l-1.6.7L7 8.6l-.7-1.6-1.6-.7 1.6-.7z" /></>);
export const LotusLampIcon = mk(<><path d="M12 5c2 2 2 5 0 8-2-3-2-6 0-8z" /><path d="M5 10c2.5 0 5 1.2 7 3-3 1.3-6 .3-7-3zM19 10c-2.5 0-5 1.2-7 3 3 1.3 6 .3 7-3z" /><path d="M3 18c2 1.5 4 1.5 6 0s4-1.5 6 0 4 1.5 6 0" /></>);
export const RibbonIcon = mk(<><path d="M9 3h6l-1 6h-4z" /><path d="M10 9 7 21l3-2 2 2M14 9l3 12-3-2" /></>);
export const WheelIcon = mk(<><rect x="7" y="6" width="10" height="11" rx="2.5" /><path d="M12 2v4M12 17v5M7 10h10M7 13h10" /></>);
export const StupaIcon = mk(<><path d="M12 2l3 3H9zM8 8h8l-1.5 3h-5zM6 14h12l-2 3H8z" /><path d="M8 17v4h8v-4" /></>);
export const CandleIcon = mk(<><path d="M12 3c1.5 2 1.5 3.5 0 5-1.5-1.5-1.5-3 0-5z" /><rect x="9" y="9" width="6" height="11" rx="1" /><path d="M6 21h12" /></>);
export const ShrineIcon = mk(<><path d="M3 10l9-6 9 6" /><path d="M5 10v10h14V10" /><path d="M10 20v-5h4v5" /></>);
export const CameraIcon = mk(<><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></>);

// ---- thanh dưới ----
export const QuestIcon = mk(<><path d="M7 3h10v18H7z" /><path d="M10 8l1 1 2-2M10 13h4M10 17h3" /></>);
export const BagIcon = mk(<><path d="M6 8h12l-1 13H7z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></>);
export const ShopIcon = mk(<><path d="M4 9l2-5h12l2 5" /><path d="M4 9h16v1.5a2.7 2.7 0 0 1-5.3 0 2.7 2.7 0 0 1-5.4 0A2.7 2.7 0 0 1 4 10.5z" /><path d="M5.5 13v7h13v-7" /></>);
export const FriendsIcon = mk(<><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.4" /><path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6M15.5 14c3 0 5.5 2 5.5 5" /></>);
export const MapIcon = mk(<><path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z" /><path d="M9 4v14M15 6v14" /></>);
export const BookIcon = mk(<><path d="M4 5c3-1 6-1 8 1 2-2 5-2 8-1v14c-3-1-6-1-8 1-2-2-5-2-8-1z" /><path d="M12 6v14" /></>);
export const CalendarIcon = mk(<><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 10h16M9 3v4M15 3v4" /><path d="M13.5 13.2a2.3 2.3 0 1 0 1.3 3.3 2 2 0 0 1-1.3-3.3z" /></>);
export const GearIcon = mk(<><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" /></>);
export const MusicIcon = mk(<><path d="M9 18V5l11-2v13" /><circle cx="6.5" cy="18" r="2.5" /><circle cx="17.5" cy="16" r="2.5" /></>);

// ---- góc phải trên ----
export const MeritIcon = mk(<><circle cx="12" cy="12" r="9" /><path d="M12 7c1.3 1.4 1.3 3.4 0 5.2-1.3-1.8-1.3-3.8 0-5.2zM7.5 11c1.6 0 3.2.7 4.5 2-2 .9-3.8.3-4.5-2zM16.5 11c-1.6 0-3.2.7-4.5 2 2 .9 3.8.3 4.5-2z" /><path d="M8 16h8" /></>);
export const JadeIcon = mk(<><path d="M6 4h12l3 5-9 11L3 9z" /><path d="M3 9h18M9 4l3 16 3-16" /></>);
export const MailIcon = mk(<><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></>);
export const HeartIcon = mk(<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" />);
export const HelpIcon = mk(<><circle cx="12" cy="12" r="9" /><path d="M9.5 9.3a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7M12 17h.01" /></>);
export const FullscreenIcon = mk(<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />);

// ---- chung ----
export const MicIcon = mk(<><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></>);
export const MicOffIcon = mk(<><path d="M15 9.3V6a3 3 0 0 0-5.7-1.3M9 9v2a3 3 0 0 0 4.6 2.5M5 11a7 7 0 0 0 11.4 5.4M19 11c0 1-.2 1.9-.6 2.8M12 18v3M3 3l18 18" /></>);
export const SendIcon = mk(<path d="M4 12l16-8-6 16-3-7z" />);
export const ChatIcon = mk(<path d="M4 5h16v11H9l-5 4z" />);
export const CloseIcon = mk(<path d="M6 6l12 12M18 6 6 18" />);
export const ChevronRightIcon = mk(<path d="M9 6l6 6-6 6" />);
export const ChevronLeftIcon = mk(<path d="M15 6l-6 6 6 6" />);
export const GridIcon = mk(<><rect x="4" y="4" width="6" height="6" rx="1.5" /><rect x="14" y="4" width="6" height="6" rx="1.5" /><rect x="4" y="14" width="6" height="6" rx="1.5" /><rect x="14" y="14" width="6" height="6" rx="1.5" /></>);
