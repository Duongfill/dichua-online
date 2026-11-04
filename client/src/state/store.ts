import { create } from 'zustand';
import {
  ACTION_DEFS, DEFAULT_APPEARANCE, HALL_SEATS, INTERACTIONS, TICK_HZ, collide, interactionsAt, sanitizeAppearance,
  type Ack, type ActionId, type Announce, type Appearance, type ChatMsg, type ChatReq, type Interaction, type MoveTuple,
  type PlayerInfo, type SceneId, type SeatsState, type Stats, type Wallet, type Zone,
} from '@chua/shared';
import { activeActions, emitFx } from '../game/fx';
import { chime } from '../game/sfx';
import { socket, resetClock } from '../net/socket';
import { clearBuffers, pushSnapshot, removeBuffer } from '../net/interp';
import { local } from '../game/local';

export interface Profile { name: string; appearance: Appearance }
interface Toast { id: number; text: string; kind: 'info' | 'warn' }
export interface Banner extends Announce { id: number }

export type PanelId =
  | 'quests' | 'bag' | 'shop' | 'friends' | 'map' | 'prayers' | 'calendar' | 'settings'
  | 'mail' | 'help' | 'stream';

export interface Settings {
  shadows: boolean;
  quality: 'low' | 'high';
  showNames: boolean;
  bubbles: boolean;
  volMusic: number; // giai đoạn 5
  volVoice: number; // giai đoạn 4
  volSfx: number; // giai đoạn 3
}
const DEFAULT_SETTINGS: Settings = {
  shadows: true, quality: 'high', showNames: true, bubbles: true, volMusic: 0.8, volVoice: 0.9, volSfx: 0.6,
};

interface GameState {
  phase: 'login' | 'joining' | 'playing';
  connected: boolean;
  profile: Profile;
  self: PlayerInfo | null;
  wallet: Wallet;
  scene: SceneId;
  channel: number;
  players: Record<string, PlayerInfo>; // người khác trong cùng khu vực
  stats: Stats | null;
  zone: Zone | null;
  transitioning: boolean;
  toasts: Toast[];

  // chat
  messages: ChatMsg[];
  unread: number; // tin chưa đọc khi khung chat (điện thoại) đang đóng
  bubbles: Record<string, { text: string; until: number }>;
  banners: Banner[];

  // giao diện
  panel: PanelId | null;
  chatOpen: boolean;
  actionsOpen: boolean;
  favorite: boolean;
  settings: Settings;

  // hành động (giai đoạn 3)
  spots: Interaction[]; // điểm tương tác đang đứng trong
  cooldowns: Partial<Record<ActionId, number>>; // Date.now() khi được làm lại
  floaters: { id: number; text: string }[]; // "+5 công đức" bay trên đầu

  // bồ đoàn & voice (giai đoạn 4)
  seats: SeatsState;
  seatSpot: number | null; // bồ đoàn trống đang đứng cạnh
  voice: { status: 'off' | 'connecting' | 'on' | 'disabled' | 'error'; micOn: boolean; needsGesture: boolean; error: string };
  speaking: Record<string, true>; // id người đang nói (kể cả mình)
  muted: Record<string, true>; // người mình đã tắt tiếng
  zen: boolean; // Tịnh tâm: ẩn chat, tắt voice
  selected: string | null; // người chơi đang xem thẻ

  setProfile: (p: Profile) => void;
  enter: () => Promise<void>;
  changeScene: (to: SceneId) => Promise<void>;
  setZone: (z: Zone | null) => void;
  toast: (text: string, kind?: Toast['kind']) => void;
  sendChat: (req: ChatReq) => Promise<Ack>;
  openPanel: (p: PanelId | null) => void;
  setChatOpen: (open: boolean) => void;
  setSettings: (s: Partial<Settings>) => void;
  toggleFavorite: () => void;
  banner: (a: Announce) => void;
  setSpots: (s: Interaction[]) => void;
  perform: (action: ActionId) => Promise<void>;
  sit: (index: number) => Promise<void>;
  stand: () => void;
  setSeatSpot: (i: number | null) => void;
  toggleMute: (id: string) => void;
  setZen: (on: boolean) => void;
}

const load = <T,>(key: string, fallback: T): T => {
  try {
    const v = JSON.parse(localStorage.getItem(key) || 'null');
    return v ?? fallback;
  } catch {
    return fallback;
  }
};
const save = (key: string, v: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* bỏ qua */
  }
};

const loadProfile = (): Profile => {
  const p = load<Partial<Profile> | null>('c3.profile', null);
  if (p && typeof p.name === 'string') return { name: p.name, appearance: sanitizeAppearance(p.appearance) };
  return { name: '', appearance: DEFAULT_APPEARANCE };
};

let seq = 0;
const BUBBLE_MS = 6000;
// mã trình duyệt để server giữ công đức/cấp khi tải lại trang
const TOKEN: string = (() => {
  let t = load<string | null>('c3.token', null);
  if (!t || !/^[A-Za-z0-9-]{16,64}$/.test(t)) {
    t = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : Array.from({ length: 4 }, () => Math.random().toString(36).slice(2, 10)).join('-');
    save('c3.token', t);
  }
  return t;
})();

const EMPTY_WALLET: Wallet = { merit: 0, jade: 0, exp: 0, expNext: 100, title: 'Phật tử mới' };

export const useGame = create<GameState>((set, get) => ({
  phase: 'login',
  connected: false,
  profile: loadProfile(),
  self: null,
  wallet: EMPTY_WALLET,
  scene: 'courtyard',
  channel: 1,
  players: {},
  stats: null,
  zone: null,
  transitioning: false,
  toasts: [],
  messages: [],
  unread: 0,
  bubbles: {},
  banners: [],
  panel: null,
  chatOpen: false,
  // mở sẵn cột hành động khi màn hình đủ rộng & cao; điện thoại mặc định thu gọn
  actionsOpen: typeof window !== 'undefined' ? window.innerWidth >= 768 && window.innerHeight >= 720 : true,
  favorite: load('c3.favorite', false),
  settings: { ...DEFAULT_SETTINGS, ...load<Partial<Settings>>('c3.settings', {}) },
  spots: [],
  cooldowns: {},
  floaters: [],
  seats: Array(HALL_SEATS.length).fill(null),
  seatSpot: null,
  voice: { status: 'off', micOn: false, needsGesture: false, error: '' },
  speaking: {},
  muted: {},
  zen: false,
  selected: null,

  setProfile: (profile) => {
    set({ profile });
    save('c3.profile', profile);
  },

  enter: async () => {
    set({ phase: 'joining' });
    if (!socket.connected) socket.connect();
    else await hello(false);
  },

  changeScene: async (to) => {
    const { scene, transitioning } = get();
    if (to === scene || transitioning) return;
    set({ transitioning: true });
    const res = await socket.timeout(5000).emitWithAck('scene:change', { scene: to }).catch(() => null);
    if (!res || !res.ok) {
      set({ transitioning: false });
      get().toast(res && !res.ok ? res.error : 'Mất kết nối, xin thử lại.', 'warn');
      return;
    }
    await new Promise((r) => setTimeout(r, 250)); // để lớp mờ kịp hiện
    clearBuffers();
    Object.assign(local, res.pose, { target: null, walking: false, dirty: true, seat: null, pending: null });
    set({ scene: res.scene, players: toMap(res.players, get().self?.id), zone: null, messages: res.history, bubbles: {} });
    setTimeout(() => set({ transitioning: false }), 120);
  },

  setZone: (zone) => {
    if (get().zone?.id !== zone?.id) set({ zone });
  },

  toast: (text, kind = 'info') => {
    const id = ++seq;
    set((s) => ({ toasts: [...s.toasts.slice(-2), { id, text, kind }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 3500);
  },

  sendChat: async (req) => {
    const res = await socket.timeout(5000).emitWithAck('chat:send', req).catch(() => null);
    return res ?? { ok: false, error: 'Mất kết nối, xin thử lại.' };
  },

  openPanel: (panel) => set({ panel }),
  setChatOpen: (chatOpen) => set(chatOpen ? { chatOpen, unread: 0 } : { chatOpen }),
  setSettings: (s) => {
    const settings = { ...get().settings, ...s };
    set({ settings });
    save('c3.settings', settings);
  },
  toggleFavorite: () => {
    const favorite = !get().favorite;
    set({ favorite });
    save('c3.favorite', favorite);
    get().toast(favorite ? 'Đã thêm Chùa Online vào mục yêu thích 💛' : 'Đã bỏ khỏi mục yêu thích');
  },
  setSpots: (spots) => {
    const cur = get().spots;
    if (cur.length !== spots.length || cur.some((c, i) => c !== spots[i])) set({ spots });
  },

  perform: async (action) => {
    const st = get();
    const def = ACTION_DEFS[action];
    if (st.phase !== 'playing' || st.transitioning) return;
    if (local.busyUntil > performance.now()) return st.toast('Bạn đang thực hiện một nghi thức, xin chờ giây lát.');
    const cd = (st.cooldowns[action] ?? 0) - Date.now();
    if (cd > 0) return st.toast(`Có thể ${def.label.toLowerCase()} lại sau ${Math.ceil(cd / 1000)} giây.`);

    // chưa đứng đúng chỗ → tự đi tới điểm gần nhất (cùng khu vực), tới nơi sẽ tự làm
    if (!interactionsAt(st.scene, local.x, local.z).some((i) => i.action === action)) {
      const spot = INTERACTIONS[st.scene]
        .filter((i) => i.action === action)
        .sort((a, b) => Math.hypot(local.x - a.x, local.z - a.z) - Math.hypot(local.x - b.x, local.z - b.z))[0];
      if (!spot) {
        const other = st.scene === 'courtyard' ? 'vào chánh điện' : 'ra sân chùa';
        return st.toast(`Hãy ${other} để ${def.label.toLowerCase()} (${def.where}).`);
      }
      const dx = local.x - spot.x, dz = local.z - spot.z, d = Math.hypot(dx, dz) || 1;
      local.target = collide(st.scene, spot.x + (dx / d) * spot.approach, spot.z + (dz / d) * spot.approach);
      local.pending = { action };
      return st.toast(`Đang đi tới ${def.goto} để ${def.label.toLowerCase()}…`);
    }

    local.pending = null;
    local.target = null;
    const res = await socket.timeout(5000).emitWithAck('act', { action }).catch(() => null);
    if (!res) return get().toast('Mất kết nối, xin thử lại.', 'warn');
    if (!res.ok) {
      if (res.retryMs) set((s) => ({ cooldowns: { ...s.cooldowns, [action]: Date.now() + res.retryMs! } }));
      return get().toast(res.error, 'warn');
    }
    const id = ++seq;
    set((s) => ({
      wallet: res.wallet,
      self: s.self ? { ...s.self, level: res.level } : s.self,
      cooldowns: { ...s.cooldowns, [action]: Date.now() + res.cooldownMs },
      floaters: [...s.floaters, { id, text: `+${res.gained.merit} công đức · +${res.gained.exp} KN` }],
    }));
    setTimeout(() => set((s) => ({ floaters: s.floaters.filter((f) => f.id !== id) })), 2200);
    if (res.levelUp) {
      setTimeout(() => {
        chime();
        get().banner({ kind: 'event', text: `✨ Bạn đã lên cấp ${res.level} – ${res.wallet.title}` });
      }, ACTION_DEFS[action].durationMs * 0.6);
    }
  },

  sit: async (index) => {
    const st = get();
    if (st.scene !== 'hall' || st.transitioning) return;
    const owner = st.seats[index];
    if (owner && owner !== st.self?.id) return st.toast('Bồ đoàn này đã có người ngồi.');
    if (local.busyUntil > performance.now()) return;
    const s = HALL_SEATS[index];
    if (Math.hypot(local.x - s.x, local.z - s.z) > 1.2) {
      // tự đi tới bồ đoàn rồi ngồi
      if (local.seat !== null) get().stand();
      local.target = { x: s.x, z: s.z };
      local.pending = { sit: index };
      return;
    }
    local.pending = null;
    local.target = null;
    const res = await socket.timeout(5000).emitWithAck('seat:sit', { index }).catch(() => null);
    if (!res || !res.ok) return get().toast(res && !res.ok ? res.error : 'Mất kết nối, xin thử lại.', 'warn');
    Object.assign(local, { x: res.pose.x, z: res.pose.z, ry: res.pose.ry, faceRy: res.pose.ry, seat: index, walking: false, dirty: true });
  },

  stand: () => {
    if (local.seat === null) return;
    local.seat = null;
    local.dirty = true;
    socket.emit('seat:stand', () => {});
  },

  setSeatSpot: (seatSpot) => {
    if (get().seatSpot !== seatSpot) set({ seatSpot });
  },

  toggleMute: (id) =>
    set((s) => {
      const muted = { ...s.muted };
      if (muted[id]) delete muted[id];
      else muted[id] = true;
      return { muted };
    }),

  setZen: (zen) => {
    set({ zen, ...(zen ? { chatOpen: false } : {}) });
    get().toast(zen ? 'Đang Tịnh tâm: đã ẩn trò chuyện và tắt giọng nói 🪷' : 'Đã thoát Tịnh tâm');
  },

  banner: (a) => {
    const id = ++seq;
    set((s) => ({ banners: [...s.banners.slice(-2), { ...a, id }] }));
    setTimeout(() => set((s) => ({ banners: s.banners.filter((b) => b.id !== id) })), 4500);
  },
}));

const toMap = (list: PlayerInfo[], selfId?: string) => {
  const m: Record<string, PlayerInfo> = {};
  for (const p of list) if (p.id !== selfId) m[p.id] = p;
  return m;
};

// ---------- Kết nối ----------
async function hello(resume: boolean) {
  const { profile, scene, channel } = useGame.getState();
  const res = await socket
    .timeout(6000)
    .emitWithAck('hello', {
      name: profile.name,
      appearance: profile.appearance,
      token: TOKEN,
      resume: resume ? { scene, channel, x: local.x, z: local.z, ry: local.ry } : undefined,
    })
    .catch(() => null);
  if (!res || !res.ok) {
    useGame.setState({ phase: 'login' });
    useGame.getState().toast(res && !res.ok ? res.error : 'Không kết nối được máy chủ.', 'warn');
    socket.disconnect();
    return;
  }
  clearBuffers();
  const { self } = res;
  Object.assign(local, { x: self.x, z: self.z, ry: self.ry, target: null, walking: false, dirty: true, seat: null, pending: null });
  useGame.setState({
    phase: 'playing',
    self: { id: self.id, name: self.name, level: self.level, appearance: self.appearance, scene: self.scene },
    wallet: res.wallet,
    scene: self.scene,
    channel: res.channel,
    players: toMap(res.players, self.id),
    messages: res.history,
    bubbles: {},
  });
  if (!resume && !load('c3.helpSeen', false)) {
    save('c3.helpSeen', true);
    useGame.setState({ panel: 'help' });
  }
}

socket.on('connect', () => {
  resetClock();
  useGame.setState({ connected: true });
  const { phase } = useGame.getState();
  if (phase === 'joining') hello(false);
  else if (phase === 'playing') hello(true); // tự vào lại sau khi rớt mạng
});
socket.on('disconnect', () => useGame.setState({ connected: false }));
socket.on('snapshot', (s) => pushSnapshot(s, useGame.getState().self?.id ?? null));
socket.on('player:join', (p) =>
  useGame.setState((st) => (p.id === st.self?.id ? st : { players: { ...st.players, [p.id]: p } })),
);
socket.on('player:leave', ({ id }) => {
  removeBuffer(id);
  useGame.setState((st) => {
    if (!st.players[id]) return st;
    const players = { ...st.players };
    delete players[id];
    return { players };
  });
});
socket.on('stats', (stats) => useGame.setState({ stats }));
socket.on('act', (e) => {
  const { scene, self } = useGame.getState();
  const mine = e.pid === self?.id;
  emitFx(e, scene, mine);
  if (mine) {
    local.busyUntil = activeActions.get(e.pid)?.end ?? performance.now() + ACTION_DEFS[e.action].durationMs;
    local.faceRy = e.ry;
    local.target = null;
  }
});
socket.on('seats', (seats) => {
  const selfId = useGame.getState().self?.id;
  // chỗ của mình không còn (vd. đổi khu vực) → không còn ngồi
  if (local.seat !== null && seats[local.seat] !== selfId) local.seat = null;
  useGame.setState({ seats });
});
socket.on('player:update', ({ id, level }) =>
  useGame.setState((st) =>
    st.self?.id === id
      ? { self: { ...st.self, level } }
      : st.players[id]
        ? { players: { ...st.players, [id]: { ...st.players[id], level } } }
        : st,
  ),
);
socket.on('announce', (a) => useGame.getState().banner(a));
socket.on('chat', (m) => {
  useGame.setState((st) => {
    const next: Partial<GameState> = { messages: [...st.messages.slice(-99), m] };
    if (m.kind !== 'system') {
      if (!st.chatOpen && !st.zen && m.pid !== st.self?.id) next.unread = st.unread + 1;
      if (m.pid) next.bubbles = { ...st.bubbles, [m.pid]: { text: m.text, until: Date.now() + BUBBLE_MS } };
    }
    return next;
  });
});
// dọn bong bóng chat hết hạn
setInterval(() => {
  const { bubbles } = useGame.getState();
  const now = Date.now();
  const alive = Object.entries(bubbles).filter(([, b]) => b.until > now);
  if (alive.length !== Object.keys(bubbles).length) useGame.setState({ bubbles: Object.fromEntries(alive) });
}, 1000);

// ---------- Gửi vị trí của mình (15 lần/giây khi di chuyển, 1 lần/giây khi đứng) ----------
let lastSent = 0;
setInterval(() => {
  if (!socket.connected || useGame.getState().phase !== 'playing') return;
  const now = performance.now();
  if (!local.dirty && now - lastSent < 1000) return;
  local.dirty = false;
  lastSent = now;
  const m: MoveTuple = [round(local.x), round(local.z), round(local.ry), local.walking ? 1 : 0];
  socket.volatile.emit('move', m);
}, 1000 / TICK_HZ);

const round = (v: number) => Math.round(v * 100) / 100;

if (import.meta.env.DEV) (window as unknown as { __game: typeof useGame }).__game = useGame; // chỉ để debug
