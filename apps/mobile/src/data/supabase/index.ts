import type { BBox, ComplexDetail, ComplexSummary, DataSource, MapMarker, RegionSummary, SearchResult, Trade } from '../types';
import { rpc } from './client';

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
};
