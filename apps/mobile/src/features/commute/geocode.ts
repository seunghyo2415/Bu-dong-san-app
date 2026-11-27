import type { CommuteRoute } from '@ulsan/shared';
import { ULSAN_CENTER } from '@ulsan/shared';

import type { LatLng } from '@/data';
import type { Place, PlacesResult } from '@/features/places/KakaoServices';
import { COMPANY_WORD, type StopGeo } from '@/stores/commute';

type Search = (req: { kind: 'keyword'; query: string }, opts?: { near?: LatLng; radius?: number; size?: number; sort?: 'distance' | 'accuracy' }) => Promise<PlacesResult>;

/** 울산 밖에서 출발하는 노선 (지역 이름을 붙여 검색) */
const OUTSIDE = ['부산', '경주', '양산', '정관', '해운대', '동래', '기장', '포항', '웅상'];

/** "남운프라자 버스정류장(무거 위브자이)" → ["남운프라자 버스정류장(무거 위브자이)", "남운프라자 버스정류장", "무거 위브자이"] */
export function stopQueries(stop: string): string[] {
  const noParen = stop.replace(/\([^)]*\)/g, '').trim();
  const inParen = [...stop.matchAll(/\(([^)]*)\)/g)].map((m) => m[1].trim()).filter((x) => x && !/^\d|부$|경유|출발/.test(x));
  return [...new Set([stop, noParen, ...inParen].filter((x) => x.length >= 2))];
}

async function find(search: Search, stop: string, region: string, prev: LatLng | null): Promise<Place | null> {
  const outside = OUTSIDE.find((o) => region.includes(o));
  for (const q of stopQueries(stop)) {
    try {
      if (prev) {
        const r = await search({ kind: 'keyword', query: q }, { near: prev, radius: 6000, size: 3, sort: 'accuracy' });
        if (r.places[0]) return r.places[0];
      } else if (outside) {
        const r = await search({ kind: 'keyword', query: `${outside} ${q}` }, { size: 3 });
        if (r.places[0]) return r.places[0];
      } else {
        const r = await search({ kind: 'keyword', query: q }, { near: ULSAN_CENTER, radius: 20000, size: 3, sort: 'accuracy' });
        if (r.places[0]) return r.places[0];
      }
    } catch {
      // 다음 검색어로
    }
  }
  return null;
}

/**
 * 노선 순서대로 정류장 위치 찾기: 첫 정류장은 울산(또는 출발 지역) 안에서, 다음 정류장은 앞 정류장 6km 안에서 찾는다.
 * 이미 찾았거나 직접 지정한 정류장은 건너뛴다.
 */
export async function geocodeStops(
  routes: CommuteRoute[],
  existing: Record<string, StopGeo>,
  search: Search,
  onStop: (name: string, geo: StopGeo, done: number, total: number) => void,
) {
  const names = new Set(routes.flatMap((r) => r.stops).filter((s) => s !== COMPANY_WORD));
  const total = names.size;
  const known: Record<string, StopGeo> = { ...existing };
  let done = Object.values(known).filter((g) => g.status !== 'notfound').length;
  for (const r of routes) {
    let prev: LatLng | null = null;
    for (const stop of r.stops) {
      if (stop === COMPANY_WORD) continue;
      const k = known[stop];
      if (k && k.status !== 'notfound') {
        prev = k.location ?? prev;
        continue;
      }
      const p = await find(search, stop, r.region, prev);
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
