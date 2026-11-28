import { SUPABASE_ANON_KEY, SUPABASE_URL, supabase } from '@/data/supabase/client';

import type { Place } from './KakaoServices';

/**
 * 네이버 지역 검색 (서버 함수 geo 경유 — 네이버 키는 서버에만). 카카오에 없는 장소 보충용.
 * 서버 주소가 없거나 키가 아직 없으면 빈 결과.
 */
export const naverAvailable = !!SUPABASE_URL && !!SUPABASE_ANON_KEY;

export async function naverSearch(query: string): Promise<Place[]> {
  if (!naverAvailable || !query.trim()) return [];
  try {
    const { data, error } = await supabase().functions.invoke('geo', { body: { action: 'naver', query } });
    if (error || !data?.places) return [];
    return (data.places as { name: string; address: string; category: string; location: { lat: number; lng: number } }[]).map((p) => ({
      id: `naver:${p.name}:${p.location.lat.toFixed(5)}`,
      name: p.name,
      address: p.address,
      category: `네이버 · ${p.category}`,
      group: '',
      lat: p.location.lat,
      lng: p.location.lng,
      distance: null,
      url: '',
    }));
  } catch {
    return [];
  }
}
