import { useEffect } from 'react';
import GameCanvas from './game/GameCanvas';
import { bindKeyboard } from './game/local';
import { useGame } from './state/store';
import ErrorBoundary from './ui/ErrorBoundary';
import Hud from './ui/Hud';
import { pressE } from './ui/hud/Interact';
import './game/voice'; // tự vào/ra phòng voice theo khu vực
import { unlockAudio } from './game/sfx';
import Login from './ui/Login';

export default function App() {
  const phase = useGame((s) => s.phase);

  useEffect(
    () =>
      bindKeyboard((code) => {
        const { phase: p, panel, setChatOpen } = useGame.getState();
        if (p !== 'playing' || panel) return;
        if (code === 'KeyE') pressE();
        if (code === 'Enter' || code === 'NumpadEnter') {
          // Enter → gõ chat (điện thoại mở bảng chat trước)
          const input = document.querySelector<HTMLInputElement>('input[aria-label="Nội dung tin nhắn"]');
          if (input) input.focus();
          else setChatOpen(true);
        }
      }),
    [],
  );

  // trình duyệt chỉ cho phát âm thanh sau thao tác của người dùng
  useEffect(() => {
    const on = () => unlockAudio();
    window.addEventListener('pointerdown', on);
    window.addEventListener('keydown', on);
    return () => {
      window.removeEventListener('pointerdown', on);
      window.removeEventListener('keydown', on);
    };
  }, []);

  if (phase !== 'playing') return <Login />;
  return (
    <ErrorBoundary>
      <div className="relative h-full w-full">
        <GameCanvas />
        <Hud />
      </div>
    </ErrorBoundary>
  );
}
