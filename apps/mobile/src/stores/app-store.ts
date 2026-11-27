import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { ComplexFilters, LatLng } from '@/data';

type PriceLabel = 'price' | 'pyeong' | 'none';

/** 출퇴근 거리 계산용 직장 (이 폰에만 저장) */
export type Workplace = { id: string; name: string; address: string; location: LatLng };

type AppState = {
  filters: ComplexFilters;
  setFilters: (f: ComplexFilters) => void;
  resetFilters: () => void;

  priceLabel: PriceLabel;
  cyclePriceLabel: () => void;

  viewMode: 'map' | 'list';
  setViewMode: (m: 'map' | 'list') => void;

  recentSearches: string[];
  addRecentSearch: (q: string) => void;
  removeRecentSearch: (q: string) => void;
  clearRecentSearches: () => void;

  workplaces: Workplace[];
  addWorkplace: (w: Omit<Workplace, 'id'>) => void;
  removeWorkplace: (id: string) => void;

  compareIds: string[]; // 비교함 (최대 3)
  toggleCompare: (id: string) => 'added' | 'removed' | 'full';
  /** 관심 단지별 마지막으로 확인한 실거래 날짜 (홈의 '새 실거래' 표시용) */
  lastSeenTrade: Record<string, string>;
  markSeen: (id: string, date: string) => void;

  favorites: string[]; // 단지 id
  toggleFavorite: (id: string) => void;
  recentViews: string[]; // 최근 본 단지 id (최신순 20개)
  addRecentView: (id: string) => void;
  memos: Record<string, string>; // 단지 id → 메모
  setMemo: (id: string, memo: string) => void;

  /** 검색 결과 등으로 지도를 옮겨 달라는 요청 (지도 화면이 읽고 비움) */
  pendingFocus: { location: LatLng; level: number } | null;
  focusMap: (location: LatLng, level: number) => void;
  consumeFocus: () => void;
};

const NEXT_LABEL: Record<PriceLabel, PriceLabel> = { price: 'pyeong', pyeong: 'none', none: 'price' };

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      filters: {},
      setFilters: (filters) => set({ filters }),
      resetFilters: () => set({ filters: {} }),

      priceLabel: 'price',
      cyclePriceLabel: () => set((s) => ({ priceLabel: NEXT_LABEL[s.priceLabel] })),

      viewMode: 'map',
      setViewMode: (viewMode) => set({ viewMode }),

      recentSearches: [],
      addRecentSearch: (q) =>
        set((s) => ({
          recentSearches: [q, ...s.recentSearches.filter((x) => x !== q)].slice(0, 10),
        })),
      removeRecentSearch: (q) => set((s) => ({ recentSearches: s.recentSearches.filter((x) => x !== q) })),
      clearRecentSearches: () => set({ recentSearches: [] }),

      workplaces: [],
      addWorkplace: (w) => set((s) => ({ workplaces: [...s.workplaces, { ...w, id: Date.now().toString(36) }] })),
      removeWorkplace: (id) => set((s) => ({ workplaces: s.workplaces.filter((x) => x.id !== id) })),

      compareIds: [],
      toggleCompare: (id) => {
        const cur = get().compareIds;
        if (cur.includes(id)) {
          set({ compareIds: cur.filter((x) => x !== id) });
          return 'removed';
        }
        if (cur.length >= 3) return 'full';
        set({ compareIds: [...cur, id] });
        return 'added';
      },
      lastSeenTrade: {},
      markSeen: (id, date) => set((s) => ({ lastSeenTrade: { ...s.lastSeenTrade, [id]: date } })),

      favorites: [],
      toggleFavorite: (id) =>
        set((s) => ({ favorites: s.favorites.includes(id) ? s.favorites.filter((x) => x !== id) : [id, ...s.favorites] })),
      recentViews: [],
      addRecentView: (id) => set((s) => ({ recentViews: [id, ...s.recentViews.filter((x) => x !== id)].slice(0, 20) })),
      memos: {},
      setMemo: (id, memo) =>
        set((s) => {
          const memos = { ...s.memos };
          if (memo.trim()) memos[id] = memo;
          else delete memos[id];
          return { memos };
        }),

      pendingFocus: null,
      focusMap: (location, level) => set({ pendingFocus: { location, level }, viewMode: 'map' }),
      consumeFocus: () => set({ pendingFocus: null }),
    }),
    {
      name: 'app-store',
      storage: createJSONStorage(() => AsyncStorage),
      // 지도 이동 요청은 저장하지 않음
      partialize: ({ filters, priceLabel, viewMode, recentSearches, favorites, recentViews, memos, workplaces, compareIds, lastSeenTrade }) => ({
        workplaces,
        compareIds,
        lastSeenTrade,
        filters,
        priceLabel,
        viewMode,
        recentSearches,
        favorites,
        recentViews,
        memos,
      }),
    },
  ),
);

export type { PriceLabel };
