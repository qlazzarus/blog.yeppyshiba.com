import { create } from 'zustand';

export interface FootnotesStoreState {
    footnotes: Record<string, string>;
    addFootnote: (id: string, text: string) => void;
}

const useFootnotesStore = create<FootnotesStoreState>((set) => ({
    footnotes: {},
    addFootnote: (id: string, text: string) =>
        set((state) => ({
            footnotes: {
                ...state.footnotes,
                [id]: text,
            },
        })),
}));

export default useFootnotesStore;
