import { haversineM, isWaypoint, stopSearchQueries, ULSAN_CENTER, type CommuteRoute } from '@ulsan/shared';

import type { LatLng } from '@/data';
import type { Place, PlacesResult } from '@/features/places/KakaoServices';
import { COMPANY_WORD, type StopGeo } from '@/stores/commute';

type Search = (req: { kind: 'keyword'; query: string }, opts?: { near?: LatLng; radius?: number; size?: number; sort?: 'distance' | 'accuracy' }) => Promise<PlacesResult>;

/** 울산 밖에서 출발하는 노선 (지역 이름을 붙여 검색) */
const OUTSIDE = ['부산', '경주', '양산', '정관', '해운대', '동래', '기장', '포항', '웅상'];

export { stopSearchQueries as stopQueries };

/** 후보 중 기준점에서 너무 멀지 않은 첫 번째 */
function plausible(places: Place[], ref: LatLng | null, limitM: number) {
  return places.find((p) => !ref || haversineM(ref, { lat: p.lat, lng: p.lng }) <= limitM) ?? null;
}

/**
 * 노선 순서대로 정류장 위치 찾기
 *  1) 노선 첫 정류장: 노선 지역 이름(예: "울산 매곡동")으로 기준점을 먼저 잡고 그 근처(9km)에서
 *  2) 다음 정류장: 앞 정류장 7km 안에서
 *  3) 못 찾으면 "울산/지역 + 이름"으로 넓게 (기준점에서 너무 먼 결과는 버림)
 *  검색어는 오타 교정·꼬리말(앞·입구·정류장…) 제거·괄호 안 이름까지 차례로 시도
 */
export async function geocodeStops(
  routes: CommuteRoute[],
  existing: Record<string, StopGeo>,
  search: Search,
  onStop: (name: string, geo: StopGeo, done: number, total: number) => void,
  /** 카카오에서 못 찾을 때 추가로 쓰는 검색 (네이버 지역 검색) */
  fallback?: (query: string) => Promise<Place[]>,
) {
  const names = new Set(routes.flatMap((r) => r.stops).filter((s) => s !== COMPANY_WORD && !isWaypoint(s)));
  const total = names.size;
  const known: Record<string, StopGeo> = { ...existing };
  let done = Object.values(known).filter((g) => g.location).length;
  const anchors = new Map<string, LatLng | null>();

  const anchorOf = async (region: string) => {
    if (anchors.has(region)) return anchors.get(region)!;
    const outside = OUTSIDE.find((o) => region.includes(o));
    let a: LatLng | null = null;
    for (const q of outside ? [region] : [`울산 ${region}동`, `울산 ${region}`, `울산 ${region}읍`]) {
      try {
        const p = (await search({ kind: 'keyword', query: q }, { size: 1 })).places[0];
        if (p && (outside || haversineM(ULSAN_CENTER, p) < 30000)) {
          a = { lat: p.lat, lng: p.lng };
          break;
        }
      } catch {
        /* 다음 */
      }
    }
    anchors.set(region, a);
    return a;
  };

  const find = async (stop: string, region: string, prev: LatLng | null): Promise<Place | null> => {
    const outside = OUTSIDE.find((o) => region.includes(o));
    const near = prev ?? (await anchorOf(region)) ?? (outside ? null : ULSAN_CENTER);
    const limit = prev ? 7000 : outside ? 30000 : 9000;
    const qs = stopSearchQueries(stop);
    for (const q of qs) {
      if (!near) break;
      try {
        const p = plausible((await search({ kind: 'keyword', query: q }, { near, radius: 8000, size: 5, sort: 'accuracy' })).places, near, limit);
        if (p) return p;
      } catch {
        /* 다음 검색어 */
      }
    }
    for (const q of qs) {
      try {
        const p = plausible((await search({ kind: 'keyword', query: `${outside ?? '울산'} ${q}` }, { size: 5 })).places, near, near ? limit * 2 : Infinity);
        if (p) return p;
      } catch {
        /* 다음 */
      }
    }
    // 카카오에 없으면 네이버 지역 검색으로 한 번 더
    if (fallback) {
      for (const q of qs.slice(0, 3)) {
        const p = plausible(await fallback(`${outside ?? '울산'} ${q}`), near, near ? limit * 2 : Infinity);
        if (p) return p;
      }
    }
    return null;
  };

  for (const r of routes) {
    let prev: LatLng | null = null;
    for (const stop of r.stops) {
      if (stop === COMPANY_WORD || isWaypoint(stop)) continue;
      const k = known[stop];
      if (k?.location) {
        prev = k.location;
        continue;
      }
      const p = await find(stop, r.region, prev);
      const geo: StopGeo = p ? { location: { lat: p.lat, lng: p.lng }, status: 'ok', placeName: p.name, address: p.address } : { location: null, status: 'notfound' };
      known[stop] = geo;
      if (p) {
        prev = geo.location;
        done++;
      }
      onStop(stop, geo, done, total);
    }
  }
}
