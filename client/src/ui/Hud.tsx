// HUD – bố cục theo mô tả:
//  trái trên: thẻ người chơi · phải trên: tiền tệ + nút nhanh + minimap · giữa trên: banner
//  cột phải: lưới hành động · giữa dưới: thanh chức năng · trái dưới: chat (máy tính) / joystick (điện thoại)
import { useGame } from '../state/store';
import { useDesktop, useTouch } from './hooks';
import Joystick from './Joystick';
import ActionGrid from './hud/ActionGrid';
import Banner from './hud/Banner';
import BottomNav from './hud/BottomNav';
import { ChatButton, ChatPanel, ChatPreview, ChatSheet } from './hud/ChatBox';
import { PlayerCard, TopRight } from './hud/Corners';
import Panels from './hud/Panels';
import ChessPanel from './hud/Chess';
import { NowPlaying } from './hud/Stream';
import InteractPrompt from './hud/Interact';
import { AudioUnlock, MicButton, PlayerPopover, ZenButton } from './hud/Voice';

function Toasts() {
  const connected = useGame((s) => s.connected);
  const toasts = useGame((s) => s.toasts);
  return (
    <>
      {!connected && <div className="glass-dark rounded-full px-4 py-1.5 text-sm">Đang kết nối lại…</div>}
      {toasts.map((t) => (
        <div key={t.id} className={`fade-enter max-w-[86vw] rounded-2xl px-4 py-1.5 text-center text-sm shadow-lg ${t.kind === 'warn' ? 'bg-brick-600 text-amber-50' : 'glass'}`}>
          {t.text}
        </div>
      ))}
    </>
  );
}

export default function Hud() {
  const transitioning = useGame((s) => s.transitioning);
  const desktop = useDesktop();
  const touch = useTouch();

  return (
    // z-30: luôn nằm trên nhãn tên/bong bóng 3D (drei <Html> dùng z-index ≤ 20)
    <div className="pointer-events-none absolute inset-0 z-30 select-none">
      {/* lớp mờ khi chuyển khu vực */}
      <div className={`absolute inset-0 bg-amberwood-900 transition-opacity duration-300 ${transitioning ? 'opacity-90' : 'opacity-0'}`} />

      <div className="absolute left-2.5 top-[max(0.625rem,env(safe-area-inset-top))] md:left-3 md:top-3">
        <PlayerCard />
      </div>

      <div className="absolute right-2.5 top-[max(0.625rem,env(safe-area-inset-top))] flex flex-col items-end gap-2 md:right-3 md:top-3">
        <TopRight />
        <ActionGrid />
      </div>

      {/* giữa trên: banner + thông báo */}
      <div className="absolute inset-x-0 top-[138px] flex flex-col items-center gap-2 px-4 md:top-4 md:px-[300px]">
        <Banner />
        <NowPlaying />
        <Toasts />
        <AudioUnlock />
        <PlayerPopover />
      </div>

      {desktop ? (
        <>
          <div className="absolute bottom-3 left-3">
            <ChatPanel />
          </div>
          <div className="absolute bottom-3 left-[364px] right-3 flex justify-center">
            <BottomNav />
          </div>
          <div className="absolute bottom-20 left-[364px] right-3 flex justify-center">
            <InteractPrompt />
          </div>
          {touch && (
            <div className="absolute bottom-[280px] left-4">
              <Joystick />
            </div>
          )}
        </>
      ) : (
        <>
          <div className="absolute bottom-[calc(196px+env(safe-area-inset-bottom))] left-2.5">
            <ChatPreview />
          </div>
          <div className="absolute bottom-[calc(64px+env(safe-area-inset-bottom))] left-3">
            <Joystick />
          </div>
          <div className="absolute bottom-[calc(76px+env(safe-area-inset-bottom))] right-3 flex flex-col items-center gap-2.5">
            <ZenButton size="lg" />
            <MicButton size="lg" />
            <ChatButton />
          </div>
          {/* nút nổi: cột căn phải, ngay trên cột Tịnh tâm / Mic / Chat */}
          <div className="absolute bottom-[calc(262px+env(safe-area-inset-bottom))] right-3">
            <InteractPrompt vertical />
          </div>
          <div className="absolute inset-x-0 bottom-0">
            <BottomNav />
          </div>
          <ChatSheet />
        </>
      )}

      <Panels />
      <ChessPanel />
    </div>
  );
}
