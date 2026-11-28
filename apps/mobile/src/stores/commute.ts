import AsyncStorage from '@react-native-async-storage/async-storage';
import { isWaypoint, type CommuteRoute } from '@ulsan/shared';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { LatLng } from '@/data';

/**
 * 통근버스 노선 (사용자가 불러온 파일에서). 회사 내부 자료일 수 있어 이 폰에만 저장하고 서버로 보내지 않는다.
 */
export type StopGeo = { location: LatLng | null; status: 'ok' | 'notfound' | 'manual' | 'estimated'; placeName?: string; address?: string };

type State = {
  fileName: string | null;
  importedAt: string | null;
  routes: CommuteRoute[];
  stops: Record<string, StopGeo>;
  company: { name: string; location: LatLng | null };
  setImport: (routes: CommuteRoute[], fileName: string) => void;
  setStop: (name: string, geo: StopGeo) => void;
  setStops: (stops: Record<string, StopGeo>) => void;
  setCompany: (c: { name: string; location: LatLng | null }) => void;
  clear: () => void;
};

export const COMPANY_WORD = '회사';

export const useCommute = create<State>()(
  persist(
    (set) => ({
      fileName: null,
      importedAt: null,
      routes: [],
      stops: {},
      company: { name: '현대자동차 울산공장', location: null },
      setImport: (routes, fileName) => set({ routes, fileName, importedAt: new Date().toISOString(), stops: {} }),
      setStop: (name, geo) => set((s) => ({ stops: { ...s.stops, [name]: geo } })),
      setStops: (stops) => set((s) => ({ stops: { ...s.stops, ...stops } })),
      setCompany: (company) => set({ company }),
      clear: () => set({ routes: [], stops: {}, fileName: null, importedAt: null }),
    }),
    { name: 'commute', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

/** 노선의 좌표 경로 (회사로 끝나지 않는 노선은 회사까지 이어 줌) */
export function routePath(r: CommuteRoute, stops: Record<string, StopGeo>, company: State['company']): { name: string; location: LatLng }[] {
  const pts = r.stops
    .filter((name) => !isWaypoint(name))
    .map((name) => ({ name, location: name === COMPANY_WORD ? company.location : stops[name]?.location ?? null }))
    .filter((p): p is { name: string; location: LatLng } => !!p.location);
  if (r.stops[r.stops.length - 1] !== COMPANY_WORD && company.location) pts.push({ name: COMPANY_WORD, location: company.location });
  return pts;
}
