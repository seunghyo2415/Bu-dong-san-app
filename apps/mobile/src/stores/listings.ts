import AsyncStorage from '@react-native-async-storage/async-storage';
import { File } from 'expo-file-system';
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
  /** 임장 체크리스트: 항목 → 좋음/나쁨 + 메모 */
  checklist?: Record<string, { state: 'good' | 'bad' | null; note: string }>;
  /** 임장 사진 (앱 문서 폴더에 복사한 파일 주소) */
  photos?: string[];
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
      remove: (id) =>
        set((s) => {
          // 매물을 지우면 임장 사진 파일도 같이 정리
          s.listings.find((x) => x.id === id)?.photos?.forEach((uri) => {
            try {
              new File(uri).delete();
            } catch {
              /* 이미 없음 */
            }
          });
          return { listings: s.listings.filter((x) => x.id !== id) };
        }),
    }),
    { name: 'listings', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

export function sourceOf(url: string | null): SavedListing['source'] {
  if (!url) return 'manual';
  return /daangn|karrot/i.test(url) ? 'daangn' : 'other';
}
