import type { BBox, ComplexCandidate, ComplexDetail, ComplexSummary, DataSource, LatLng, MapMarker, RegionSummary, SearchResult, Trade } from '../types';
import { rpc, supabase } from './client';

/** 카카오 주소 검색 (서버 함수 geo 경유) */
export async function geocode(query: string): Promise<LatLng | null> {
  const { data, error } = await supabase().functions.invoke('geo', { body: { action: 'geocode', query } });
  if (error) return null;
  return data?.result ? { lat: data.result.lat, lng: data.result.lng } : null;
}

export async function searchPlaces(query: string, near?: LatLng) {
  const { data, error } = await supabase().functions.invoke('geo', { body: { action: 'keyword', query, ...near } });
  if (error) return [];
  return (data?.places ?? []) as { name: string; address: string; category: string; location: LatLng }[];
}

const box = (b: BBox) => ({ sw_lat: b.sw.lat, sw_lng: b.sw.lng, ne_lat: b.ne.lat, ne_lng: b.ne.lng });

/** 실제 데이터: Supabase DB 함수(supabase/migrations/*_app_read.sql)를 호출 */
export const supabaseDataSource: DataSource = {
  mode: 'supabase',
  getMapMarkers: (bbox, mode, filters) => rpc<MapMarker[]>('map_markers', { ...box(bbox), mode, filters }),
  listComplexes: (bbox, filters) => rpc<ComplexSummary[]>('list_complexes', { filters, ...(bbox ? box(bbox) : {}) }),
  getComplexSummary: (id) => rpc<ComplexSummary | null>('complex_summary', { p_id: id }),
  getComplexDetail: (id) => rpc<ComplexDetail | null>('complex_detail', { p_id: id }),
  getTrades: (id) => rpc<Trade[]>('complex_trades', { p_id: id }),
  search: (q) => rpc<SearchResult[]>('search_all', { q }),
  getRegionSummaries: () => rpc<RegionSummary[]>('region_summaries'),
  async findCandidates({ name, address, dong }) {
    let at: LatLng | null = null;
    if (address) at = await geocode(address);
    if (!at && name) at = (await searchPlaces(`울산 ${name}`))[0]?.location ?? null;
    return rpc<ComplexCandidate[]>('find_complex_candidates', { q: name ?? null, lat: at?.lat ?? null, lng: at?.lng ?? null, dong: dong ?? null });
  },
};
