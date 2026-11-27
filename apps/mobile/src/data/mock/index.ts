import { ULSAN_SIGUNGU, sigunguName } from '@ulsan/shared';

import type {
  BBox,
  ComplexFilters,
  ComplexSummary,
  DataSource,
  MapMarker,
  RegionSummary,
  SearchResult,
} from '../types';
import { MOCK_AS_OF, MOCK_COMPLEXES, MOCK_DETAILS, MOCK_DONGS, MOCK_SOURCE, MOCK_TRADES } from './complexes';

/** 실제 서버처럼 약간 늦게 응답 → 스켈레톤 UI 확인용 */
const delay = (ms = 250) => new Promise((r) => setTimeout(r, ms));

export function inBBox(c: { location: { lat: number; lng: number } | null }, b: BBox) {
  if (!c.location) return false;
  const { lat, lng } = c.location;
  return lat >= b.sw.lat && lat <= b.ne.lat && lng >= b.sw.lng && lng <= b.ne.lng;
}

export function matchesFilters(c: ComplexSummary, f: ComplexFilters): boolean {
  const price = c.recentPrice?.value;
  if (f.priceMin != null && (price == null || price < f.priceMin)) return false;
  if (f.priceMax != null && (price == null || price > f.priceMax)) return false;
  if (f.areaMin != null && c.representativeM2 < f.areaMin) return false;
  if (f.areaMax != null && c.representativeM2 > f.areaMax) return false;
  if (f.builtAfter != null && Number(c.approvedDate.slice(0, 4)) < f.builtAfter) return false;
  if (f.householdsMin != null && c.households < f.householdsMin) return false;
  const p = c.parkingPerHousehold?.value;
  if (f.parkingMin != null && (p == null || p < f.parkingMin)) return false;
  return true;
}

function avg(nums: number[]): number | null {
  const v = nums.filter((n) => Number.isFinite(n));
  return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null;
}

/** 한글 검색: 공백·"아파트" 무시 */
const norm = (s: string) => s.replace(/\s+|아파트|apt/gi, '').toLowerCase();

/** 두 글자 묶음(bigram) 유사도 0~1 */
function dice(a: string, b: string) {
  if (!a || !b) return 0;
  const grams = (s: string) => new Set(Array.from({ length: Math.max(1, s.length - 1) }, (_, i) => s.slice(i, i + 2)));
  const A = grams(a);
  const B = grams(b);
  let hit = 0;
  A.forEach((g) => B.has(g) && hit++);
  return (2 * hit) / (A.size + B.size);
}

export const mockDataSource: DataSource = {
  mode: 'mock',

  async getMapMarkers(bbox, mode, filters) {
    await delay(120);
    const list = MOCK_COMPLEXES.filter((c) => matchesFilters(c, filters));
    if (mode === 'complex') {
      return list
        .filter((c) => inBBox(c, bbox))
        .map<MapMarker>((c) => ({
          kind: 'complex',
          id: c.id,
          name: c.name,
          location: c.location!,
          recentPrice: c.recentPrice?.value ?? null,
          pricePerPyeong: c.pricePerPyeong,
        }));
    }
    if (mode === 'dong') {
      return MOCK_DONGS.map<MapMarker>((d) => {
        const items = list.filter((c) => c.dongName === d.dongName);
        return {
          kind: 'region',
          id: `dong:${d.dongName}`,
          name: d.dongName,
          location: { lat: d.lat, lng: d.lng },
          count: items.length,
          avgPricePerPyeong: avg(items.map((c) => c.pricePerPyeong ?? NaN)),
        };
      }).filter((m) => m.kind === 'region' && m.count > 0 && inBBox(m, bbox));
    }
    return ULSAN_SIGUNGU.map<MapMarker>((s) => {
      const items = list.filter((c) => c.sigunguCode === s.code);
      return {
        kind: 'region',
        id: `sgg:${s.code}`,
        name: s.name,
        location: s.center,
        count: items.length,
        avgPricePerPyeong: avg(items.map((c) => c.pricePerPyeong ?? NaN)),
      };
    }).filter((m) => m.kind === 'region' && m.count > 0);
  },

  async listComplexes(bbox, filters) {
    await delay();
    return MOCK_COMPLEXES.filter((c) => matchesFilters(c, filters) && (!bbox || inBBox(c, bbox)));
  },

  async getComplexSummary(id) {
    await delay();
    return MOCK_COMPLEXES.find((c) => c.id === id) ?? null;
  },

  async getComplexDetail(id) {
    await delay();
    return MOCK_DETAILS.find((c) => c.id === id) ?? null;
  },

  async getTrades(id) {
    await delay(350);
    return MOCK_TRADES.get(id) ?? [];
  },

  async search(query) {
    await delay(80);
    const q = norm(query);
    if (!q) return [];
    const complexes: SearchResult[] = MOCK_COMPLEXES.filter((c) => c.location && norm(c.name).includes(q)).map((c) => ({
      kind: 'complex',
      id: c.id,
      title: c.name,
      subtitle: `${sigunguName(c.sigunguCode)} ${c.dongName} · ${c.households.toLocaleString()}세대`,
      location: c.location!,
    }));
    const dongs: SearchResult[] = MOCK_DONGS.filter((d) => norm(d.dongName).includes(q)).map((d) => ({
      kind: 'dong',
      id: d.dongName,
      title: d.dongName,
      subtitle: `울산 ${sigunguName(d.sigunguCode)}`,
      location: { lat: d.lat, lng: d.lng },
    }));
    return [...dongs, ...complexes].slice(0, 20);
  },

  async findCandidates({ name, address, dong }) {
    await delay(200);
    const n = norm(name ?? '');
    const d = dong ?? MOCK_DONGS.find((x) => (address ?? '').includes(x.dongName))?.dongName ?? null;
    return MOCK_COMPLEXES.map((c) => {
      const cn = norm(c.name);
      const nameScore = n ? dice(cn, n) + (cn.includes(n) || n.includes(cn) ? 0.3 : 0) : 0;
      const dongScore = d && c.dongName === d ? 0.3 : 0;
      return { c, score: nameScore + dongScore };
    })
      .filter((x) => x.score >= 0.25)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map(({ c, score }) => ({
        id: c.id,
        name: c.name,
        subtitle: `${c.dongName} · ${c.households.toLocaleString()}세대`,
        location: c.location,
        distanceM: null,
        score: Math.round(score * 100) / 100,
      }));
  },

  async getRegionSummaries() {
    await delay();
    return ULSAN_SIGUNGU.map<RegionSummary>((s, i) => {
      const items = MOCK_COMPLEXES.filter((c) => c.sigunguCode === s.code);
      return {
        sigunguCode: s.code,
        name: s.name,
        monthlyTrades: 40 + i * 37 + items.length * 9,
        avgPricePerPyeong: avg(items.map((c) => c.pricePerPyeong ?? NaN)) ?? 0,
        asOf: MOCK_AS_OF,
        source: MOCK_SOURCE,
      };
    });
  },
};
