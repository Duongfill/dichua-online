import { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { HAIR_COLORS, HAIR_STYLES, OUTFITS, ROBE_COLORS, type Appearance } from '@chua/shared';
import Character, { type Motion } from '../game/Character';
import { InstallButton } from './Pwa';
import { useGame } from '../state/store';

function Turntable({ appearance }: { appearance: Appearance }) {
  const g = useRef<THREE.Group>(null);
  const motion = useRef<Motion>({ walking: false });
  useFrame((_, dt) => {
    if (g.current) g.current.rotation.y += dt * 0.6;
  });
  return (
    <group ref={g} position={[0, -0.9, 0]}>
      <Character appearance={appearance} motion={motion} showTag={false} />
    </group>
  );
}

function Swatch({ color, active, onClick, label }: { color: string; active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={`h-8 w-8 rounded-full border-2 shadow transition active:scale-90 ${active ? 'scale-110 border-amberwood-900' : 'border-white/70'}`}
      style={{ background: color }}
    />
  );
}

export default function Login() {
  const { profile, setProfile, enter, phase, toasts } = useGame();
  const [name, setName] = useState(profile.name);
  const [ap, setAp] = useState<Appearance>(profile.appearance);
  const busy = phase === 'joining';

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setProfile({ name: name.trim(), appearance: ap });
    enter();
  };

  return (
    <div className="fade-enter flex h-full w-full items-center justify-center overflow-y-auto bg-[radial-gradient(ellipse_at_top,#fbefd6_0%,#e9d3a8_55%,#c99a64_100%)] p-4">
      <form onSubmit={submit} className="glass w-full max-w-3xl overflow-hidden p-0 md:grid md:grid-cols-[1fr_1.1fr]">
        <div className="relative h-56 bg-gradient-to-b from-[#f6e3bd]/70 to-[#d9b27a]/40 md:h-full">
          <Canvas camera={{ position: [0, 0.35, 4.8], fov: 34 }} dpr={[1, 1.75]}>
            <hemisphereLight args={['#fff4dc', '#b88a5a', 1.2]} />
            <directionalLight position={[2, 4, 3]} intensity={1.4} />
            <Turntable appearance={ap} />
          </Canvas>
          <p className="absolute bottom-3 left-0 right-0 text-center text-xs text-amberwood-800/70">Nhân vật của bạn</p>
        </div>

        <div className="space-y-4 p-5 sm:p-6">
          <div>
            <h1 className="font-display text-3xl font-bold text-brick-700">Chùa Online</h1>
            <p className="mt-1 text-sm text-amberwood-800">Cùng đi dạo, lễ Phật, nghe kinh và trò chuyện trong ngôi chùa an yên.</p>
          </div>

          <label className="block">
            <span className="text-sm font-semibold text-amberwood-900">Pháp danh / tên hiển thị</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={20}
              autoComplete="nickname"
              placeholder="Ví dụ: Tâm An"
              className="mt-1 w-full rounded-2xl border border-white/60 bg-white/70 px-4 py-3 text-base text-amberwood-900 placeholder:text-amberwood-500/60 focus:outline-none focus:ring-2 focus:ring-brick-400"
            />
          </label>

          <div>
            <span className="text-sm font-semibold text-amberwood-900">Trang phục</span>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {OUTFITS.map((o, i) => (
                <button
                  type="button"
                  key={o}
                  onClick={() => setAp({ ...ap, outfit: i })}
                  aria-pressed={ap.outfit === i}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${ap.outfit === i ? 'bg-brick-500 text-amber-50 shadow' : 'bg-white/55 text-amberwood-900 hover:bg-white/80'}`}
                >
                  {o}
                </button>
              ))}
            </div>
          </div>

          <div className={ap.outfit ? 'pointer-events-none opacity-40' : ''} title={ap.outfit ? 'Sư thầy cạo tóc · Sư cô đội mũ ni' : undefined}>
            <span className="text-sm font-semibold text-amberwood-900">Kiểu tóc</span>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {HAIR_STYLES.map((h, i) => (
                <button
                  type="button"
                  key={h}
                  onClick={() => setAp({ ...ap, hair: i })}
                  aria-pressed={ap.hair === i}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${ap.hair === i ? 'bg-brick-500 text-amber-50 shadow' : 'bg-white/55 text-amberwood-900 hover:bg-white/80'}`}
                >
                  {h}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-3">
            <div>
              <span className="text-sm font-semibold text-amberwood-900">Màu tóc</span>
              <div className="mt-1.5 flex gap-2">
                {HAIR_COLORS.map((c, i) => (
                  <Swatch key={c} color={c} label={`Màu tóc ${i + 1}`} active={ap.hairColor === i} onClick={() => setAp({ ...ap, hairColor: i })} />
                ))}
              </div>
            </div>
            <div>
              <span className="text-sm font-semibold text-amberwood-900">Màu áo</span>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {ROBE_COLORS.map((c, i) => (
                  <Swatch key={c.value} color={c.value} label={`Áo ${c.name}`} active={ap.robe === i} onClick={() => setAp({ ...ap, robe: i })} />
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-1 sm:flex-row">
            <button type="submit" disabled={!name.trim() || busy} className="btn-primary flex-1 py-3 text-base">
              {busy ? 'Đang vào chùa…' : 'Vào chùa'}
            </button>
            <button type="button" disabled className="btn-glass flex-1 py-3 opacity-60" title="Có ở giai đoạn 6">
              Đăng nhập Google (sắp có)
            </button>
          </div>
          {toasts.map((t) => (
            <p key={t.id} role="alert" className="rounded-2xl bg-brick-600 px-4 py-2 text-sm text-amber-50">
              {t.text}
            </p>
          ))}
          <InstallButton className="w-full py-2.5" />
          <p className="text-xs text-amberwood-800/70">Giữ lời nói ôn hòa, trang nghiêm. Không quảng cáo.</p>
        </div>
      </form>
    </div>
  );
}
