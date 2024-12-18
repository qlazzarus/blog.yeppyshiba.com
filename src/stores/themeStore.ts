import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ThemeState = {
    mode: 'light' | 'dark' | null;
    setMode: (mode: 'light' | 'dark') => void;
    toggleMode: () => void;
};

export const useThemeStore = create<ThemeState>()(
    persist(
        (set) => ({
            mode: null,
            setMode: (mode: 'light' | 'dark') => set({ mode }),
            toggleMode: () =>
                set((state: { mode: 'light' | 'dark' | null }) => ({
                    mode: state.mode === 'light' ? 'dark' : 'light',
                })),
        }),
        {
            name: 'theme-storage',
        },
    ),
);
