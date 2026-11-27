import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/** 내 매물함: 공유로 저장한 매물 (이 폰에만 저장) */
export type SavedListing = {
  id: string;
  complexId: string | null;
  complexName: string | null;
  source: 'daangn' | 'manual' | 'other';
  url: string | null;
  title: string | null;
  dealType: 'sale' | 'jeonse' | 'monthly' | null;
  price: number | null; // 매매가 또는 보증금 (만원)
  monthlyRent: number | null;
  areaM2: number | null;
  floor: number | null;
  memo: string;
  parseStatus: 'text' | 'preview' | 'manual';
  createdAt: string;
};

type State = {
  listings: SavedListing[];
  add: (l: Omit<SavedListing, 'id' | 'createdAt'>) => SavedListing;
  update: (id: string, patch: Partial<SavedListing>) => void;
  remove: (id: string) => void;
};

export const useListings = create<State>()(
  persist(
    (set) => ({
      listings: [],
      add: (l) => {
        const item: SavedListing = { ...l, id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, createdAt: new Date().toISOString() };
        set((s) => ({ listings: [item, ...s.listings] }));
        return item;
      },
      update: (id, patch) => set((s) => ({ listings: s.listings.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      remove: (id) => set((s) => ({ listings: s.listings.filter((x) => x.id !== id) })),
    }),
    { name: 'listings', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

export function sourceOf(url: string | null): SavedListing['source'] {
  if (!url) return 'manual';
  return /daangn|karrot/i.test(url) ? 'daangn' : 'other';
}
