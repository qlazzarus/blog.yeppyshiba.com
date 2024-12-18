import { create } from 'zustand';

type ComponentState = {
    appBarHeight: number;
    setAppBarHeight: (height: number) => void;
};

export const useComponentStore = create<ComponentState>()((set) => ({
    appBarHeight: 0,
    setAppBarHeight: (height) => set({ appBarHeight: height }),
}));
