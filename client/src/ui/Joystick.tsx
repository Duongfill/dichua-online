// Joystick ảo góc trái dưới (cảm ứng). Ghi trực tiếp vào input.joyX/joyY.
import { useRef, useState } from 'react';
import { input } from '../game/local';

const R = 52; // bán kính vùng kéo (px)

export default function Joystick() {
  const base = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0, active: false });
  const pid = useRef<number | null>(null);

  const update = (cx: number, cy: number) => {
    const r = base.current!.getBoundingClientRect();
    let dx = cx - (r.left + r.width / 2);
    let dy = cy - (r.top + r.height / 2);
    const d = Math.hypot(dx, dy);
    if (d > R) {
      dx = (dx / d) * R;
      dy = (dy / d) * R;
    }
    input.joyX = dx / R;
    input.joyY = -dy / R;
    setKnob({ x: dx, y: dy, active: true });
  };
  const end = () => {
    pid.current = null;
    input.joyX = input.joyY = 0;
    setKnob({ x: 0, y: 0, active: false });
  };

  return (
    <div
      ref={base}
      className="pointer-events-auto relative grid h-[124px] w-[124px] touch-none place-items-center rounded-full border border-white/40 bg-white/20 shadow-glass backdrop-blur-md"
      onPointerDown={(e) => {
        pid.current = e.pointerId;
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          /* pointer không còn hiệu lực */
        }
        update(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => e.pointerId === pid.current && update(e.clientX, e.clientY)}
      onPointerUp={end}
      onPointerCancel={end}
      aria-label="Cần điều khiển di chuyển"
    >
      <div className="absolute inset-3 rounded-full border border-white/25" />
      <div
        className={`h-12 w-12 rounded-full bg-gradient-to-b from-amberwood-200 to-amberwood-400 shadow-lg ring-2 ring-white/60 transition-transform ${knob.active ? 'duration-0' : 'duration-200'}`}
        style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }}
      />
    </div>
  );
}
