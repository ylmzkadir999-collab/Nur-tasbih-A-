import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const API = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

// Premium temalar backend'de de tanimli — bu liste sadece UI için
export const PREMIUM_THEMES = ['gold', 'emerald', 'obsidian'];

async function apiFetch(path, opts = {}) {
  const token = useAuthStore.getState().token;
  let res;
  try {
    res = await fetch(`${API}${path}`, {
      ...opts,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(opts.headers || {}),
      },
    });
  } catch {
    throw new Error('Sunucuya ulaşılamıyor. Backend çalışıyor mu?');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Hata ${res.status}`);
  return data;
}

export { apiFetch };

// ─── AUTH ─────────────────────────────────────────────────────────────────
export const useAuthStore = create(
  persist(
    (set, get) => ({
      token: null,
      user: null,

      // isPremium her zaman backend'den gelen user objesine bakar.
      // localStorage'daki user.subscription_status degistirilse bile
      // refreshUser() cagrildiginda backend gercek degeri yazar.
      isPremium: () => {
        const user = get().user;
        if (!user) return false;
        if (user.subscription_status !== 'premium') return false;
        // Expire kontrolu client-side (kesin sonuc refreshUser'dan gelir)
        if (user.subscription_expiry && user.subscription_expiry < Math.floor(Date.now() / 1000)) return false;
        return true;
      },

      isLoggedIn: () => !!get().token,

      login: async (email, password) => {
        const d = await apiFetch('/auth/login', {
          method: 'POST', body: JSON.stringify({ email, password }),
        });
        set({ token: d.token, user: d.user });
        return d;
      },

      register: async (email, password) => {
        const d = await apiFetch('/auth/register', {
          method: 'POST', body: JSON.stringify({ email, password }),
        });
        set({ token: d.token, user: d.user });
        return d;
      },

      logout: () => {
        set({ token: null, user: null });
        // Tema'yi da sifirla — misafir sadece free gorur
        useTasbihStore.getState().resetTheme();
      },

      // Her sayfa yuklenisinde cagrilir — backend'den gercek durumu ceker
      refreshUser: async () => {
        if (!get().token) return;
        try {
          const d = await apiFetch('/auth/me');
          set({ user: d.user });
          // Backend'in soyledigi temayi uygula (manipule edilemez)
          if (d.user?.theme) {
            useTasbihStore.getState().applyTheme(d.user.theme);
          }
        } catch {
          // Token gecersiz — cikis yap
          set({ token: null, user: null });
          useTasbihStore.getState().resetTheme();
        }
      },

      // Tema secimi — backend'e kaydeder, backend reddederse calismaz
      setThemeSecure: async (theme) => {
        const { token } = get();
        if (!token && PREMIUM_THEMES.includes(theme)) {
          throw new Error('Premium tema için giriş yapmalısınız');
        }
        if (token) {
          // Backend dogrular: premium degil + premium tema → 403 firlatir
          await apiFetch('/auth/theme', {
            method: 'PUT',
            body: JSON.stringify({ theme }),
          });
          // Basarili → user objesini guncelle
          set((s) => ({ user: s.user ? { ...s.user, theme } : s.user }));
        }
        // Tema store'a uygula
        useTasbihStore.getState().applyTheme(theme);
      },

      setPremium: (status, expiry) =>
        set((s) => ({ user: { ...s.user, subscription_status: status, subscription_expiry: expiry } })),
    }),
    {
      name: 'nur-auth',
      // token persist edilir ama user her zaman refreshUser ile tazedir
      partialize: (s) => ({ token: s.token, user: s.user }),
    }
  )
);

// ─── TASBIH ───────────────────────────────────────────────────────────────
export const DHIKR_LIST = [
  { id: 'SubhanAllah',      arabic: 'سُبْحَانَ اللَّهِ',         transliteration: 'SubhanAllah',      translation: "Allah'ı tespih ederim",       target: 33  },
  { id: 'Alhamdulillah',   arabic: 'الْحَمْدُ لِلَّهِ',         transliteration: 'Alhamdulillah',    translation: "Allah'a hamdolsun",           target: 33  },
  { id: 'AllahuAkbar',     arabic: 'اللَّهُ أَكْبَرُ',           transliteration: 'Allahu Akbar',      translation: "Allah en büyüktür",           target: 34  },
  { id: 'LaIlaheIllallah', arabic: 'لَا إِلَهَ إِلَّا اللَّهُ', transliteration: 'La ilahe illallah', translation: "Allah'tan başka ilah yoktur", target: 100 },
];

export const useTasbihStore = create(
  persist(
    (set, get) => ({
      count: 0,
      sessionCount: 0,
      dailyCount: 0,
      totalCount: 0,
      streakDays: 0,
      lastDate: null,
      selectedDhikr: 'SubhanAllah',
      theme: 'black',       // sadece free temalar localStorage'da guvende
      soundEnabled: true,
      vibrationEnabled: true,

      increment: () => {
        const today = new Date().toISOString().split('T')[0];
        const { lastDate } = get();
        set((s) => ({
          count: s.count + 1,
          sessionCount: s.sessionCount + 1,
          totalCount: s.totalCount + 1,
          dailyCount: lastDate === today ? s.dailyCount + 1 : 1,
          lastDate: today,
        }));
        return get().count;
      },

      undo: () => {
        if (get().count <= 0) return;
        set((s) => ({
          count: Math.max(0, s.count - 1),
          sessionCount: Math.max(0, s.sessionCount - 1),
          totalCount: Math.max(0, s.totalCount - 1),
          dailyCount: Math.max(0, s.dailyCount - 1),
        }));
      },

      reset:    () => set({ count: 0, sessionCount: 0 }),
      setDhikr: (id) => set({ selectedDhikr: id, count: 0, sessionCount: 0 }),

      // applyTheme: backend onayladi, direkt uygula
      applyTheme: (t) => set({ theme: t }),

      // resetTheme: cikista veya token gecersizde free'ye don
      resetTheme: () => set({ theme: 'black' }),

      toggleSound:     () => set((s) => ({ soundEnabled: !s.soundEnabled })),
      toggleVibration: () => set((s) => ({ vibrationEnabled: !s.vibrationEnabled })),
      syncStats: (stats) => set({
        totalCount: stats.total_count || 0,
        streakDays: stats.streak_days || 0,
        dailyCount: stats.today_count || 0,
      }),
    }),
    {
      name: 'nur-tasbih-v1',
      partialize: (s) => ({
        totalCount: s.totalCount, dailyCount: s.dailyCount,
        streakDays: s.streakDays, lastDate: s.lastDate,
        selectedDhikr: s.selectedDhikr,
        // Theme localStorage'da saklanir ama refreshUser her zaman
        // backend'deki gercek degeri yazar — manipulasyon etkisiz
        theme: s.theme,
        soundEnabled: s.soundEnabled,
        vibrationEnabled: s.vibrationEnabled,
      }),
    }
  )
);
