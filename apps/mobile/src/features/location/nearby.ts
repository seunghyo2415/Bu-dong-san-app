import { formatDistance, haversineM, walkMinutes } from '@ulsan/shared';
import { useQuery } from '@tanstack/react-query';

import type { LatLng } from '@/data';
import { usePlaces, type Place } from '@/features/places/KakaoServices';

/** 카카오 장소 카테고리 코드 (카카오 로컬 API 문서 기준) */
const CATEGORY = { school: 'SC4', academy: 'AC5', mart: 'MT1', hospital: 'HP8', bank: 'BK9', subway: 'SW8' } as const;

export type NearbyItem = { key: string; label: string; place: Place | null; distanceM: number | null; walk: number | null; extra?: string };

function item(key: string, label: string, place: Place | null, from: LatLng, extra?: string): NearbyItem {
  const d = place ? place.distance ?? haversineM(from, { lat: place.lat, lng: place.lng }) : null;
  return { key, label, place, distanceM: d, walk: d != null ? walkMinutes(d) : null, extra };
}

/** 주변시설: 초·중·고, 학원 수, 대형마트, 병원, 은행, 공원, 버스정류장 */
export function useNearby(location: LatLng | null) {
  const { available, search } = usePlaces();
  return useQuery({
    queryKey: ['nearby', location?.lat, location?.lng],
    enabled: available && !!location,
    staleTime: 24 * 60 * 60 * 1000,
    queryFn: async () => {
      const at = location!;
      const near = { near: at };
      const [schools, academies, mart, hospital, bank, park, bus] = await Promise.all([
        search({ kind: 'category', code: CATEGORY.school }, { ...near, radius: 3000, size: 15 }),
        search({ kind: 'category', code: CATEGORY.academy }, { ...near, radius: 500, size: 1 }),
        search({ kind: 'category', code: CATEGORY.mart }, { ...near, radius: 5000, size: 1 }),
        search({ kind: 'category', code: CATEGORY.hospital }, { ...near, radius: 3000, size: 1 }),
        search({ kind: 'category', code: CATEGORY.bank }, { ...near, radius: 3000, size: 1 }),
        search({ kind: 'keyword', query: '공원' }, { ...near, radius: 2000, size: 1 }),
        search({ kind: 'keyword', query: '버스정류장' }, { ...near, radius: 1000, size: 1 }),
      ]);
      const pick = (suffix: string) => schools.places.find((p) => p.name.includes(suffix) && /학교$/.test(p.name.replace(/\s/g, ''))) ?? null;
      return [
        item('elem', '초등학교', pick('초등학교'), at),
        item('mid', '중학교', pick('중학교'), at),
        item('high', '고등학교', pick('고등학교'), at),
        { key: 'academy', label: '반경 500m 학원', place: null, distanceM: null, walk: null, extra: `${academies.total}곳` },
        item('mart', '대형마트', mart.places[0] ?? null, at),
        item('hospital', '병원', hospital.places[0] ?? null, at),
        item('bank', '은행', bank.places[0] ?? null, at),
        item('park', '공원', park.places[0] ?? null, at),
        item('bus', '버스정류장', bus.places[0] ?? null, at),
      ] as NearbyItem[];
    },
  });
}

/** 이름으로 찾는 주요 지점 (역·산업단지). 검색 결과 첫 번째를 사용 */
export const LANDMARKS = {
  station: [
    { key: 'ktx', label: 'KTX 울산역', query: 'KTX울산역' },
    { key: 'taehwagang', label: '태화강역', query: '태화강역' },
  ],
  industrial: [
    { key: 'mipo', label: '울산미포국가산업단지', query: '울산미포국가산업단지' },
    { key: 'onsan', label: '온산국가산업단지', query: '온산국가산업단지' },
    { key: 'petro', label: '울산석유화학단지', query: '울산석유화학단지' },
    { key: 'hmc', label: '현대자동차 울산공장', query: '현대자동차 울산공장' },
    { key: 'hhi', label: 'HD현대중공업', query: 'HD현대중공업 울산' },
  ],
} as const;

export function useLandmarks(location: LatLng | null) {
  const { available, search } = usePlaces();
  return useQuery({
    queryKey: ['landmarks', location?.lat, location?.lng],
    enabled: available && !!location,
    staleTime: 24 * 60 * 60 * 1000,
    queryFn: async () => {
      const resolve = async (l: { key: string; label: string; query: string }) => {
        const r = await search({ kind: 'keyword', query: l.query }, { size: 1 });
        const p = r.places[0] ?? null;
        const d = p ? haversineM(location!, { lat: p.lat, lng: p.lng }) : null;
        return { ...l, place: p, distanceM: d };
      };
      return {
        station: await Promise.all(LANDMARKS.station.map(resolve)),
        industrial: (await Promise.all(LANDMARKS.industrial.map(resolve))).sort((a, b) => (a.distanceM ?? 1e9) - (b.distanceM ?? 1e9)),
      };
    },
  });
}

export const dist = (m: number | null) => (m == null ? '-' : formatDistance(m));
