import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface UserState {
  id: string;
  nickname: string;
  avatar: string;
  token: string | null;
  isDark: boolean;
  accentColor: string;
  language: string;
  setUser: (user: { id: string; nickname: string; avatar: string; token?: string }) => void;
  toggleTheme: () => void;
  setAccentColor: (color: string) => void;
  setLanguage: (lang: string) => void;
}

const DEFAULT_AVATARS = [
  'https://api.dicebear.com/7.x/bottts/svg?seed=LuckyFox',
  'https://api.dicebear.com/7.x/bottts/svg?seed=StarCat',
  'https://api.dicebear.com/7.x/bottts/svg?seed=CosmicBear',
  'https://api.dicebear.com/7.x/bottts/svg?seed=SunnyRabbit',
  'https://api.dicebear.com/7.x/bottts/svg?seed=CyberPanda',
  'https://api.dicebear.com/7.x/bottts/svg?seed=MintDragon',
];

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      id: `usr_${Math.random().toString(36).slice(2, 8)}`,
      nickname: '涂鸦大师',
      avatar: DEFAULT_AVATARS[0],
      token: null,
      isDark: false,
      accentColor: '#5B5BF0',
      language: 'zh-CN',
      setUser: (user) =>
        set((state) => ({
          ...state,
          id: user.id,
          nickname: user.nickname,
          avatar: user.avatar,
          token: user.token || state.token,
        })),
      toggleTheme: () =>
        set((state) => {
          const nextDark = !state.isDark;
          if (nextDark) {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
          return { isDark: nextDark };
        }),
      setAccentColor: (color) => {
        document.documentElement.style.setProperty('--theme-primary', color);
        set({ accentColor: color });
      },
      setLanguage: (language) => set({ language }),
    }),
    {
      name: 'idavoll-user-storage',
    }
  )
);
