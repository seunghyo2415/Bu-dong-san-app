/**
 * 앱용 주소·장소 검색 (카카오 로컬 API 대행). 카카오 REST 키는 서버에만 있다.
 * body: { action: 'geocode', query } | { action: 'keyword', query, lat?, lng? } | { action: 'reverse', lat, lng } | { action: 'naver', query }
 * naver: 네이버 지역 검색(공식 검색 API) — 카카오에 없는 작은 가게·정류장 이름 보충. 키는 서버 비밀값 NAVER_CLIENT_ID/SECRET
 * 앱은 supabase.functions.invoke('geo', ...) 로 호출 (anon 키 필요)
 */
import { KakaoClient } from '../_shared/kakao.ts';
import { naverLocal } from '../_shared/naver.ts';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };

type Place = { place_name?: string; address_name?: string; road_address_name?: string; x?: string; y?: string; category_name?: string };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const b = await req.json();
    if (b.action === 'naver' && typeof b.query === 'string') {
      const id = Deno.env.get('NAVER_CLIENT_ID');
      const secret = Deno.env.get('NAVER_CLIENT_SECRET');
      if (!id || !secret) return Response.json({ error: '네이버 검색 키 미설정' }, { status: 500, headers: cors });
      return Response.json({ places: await naverLocal(b.query.slice(0, 100), id, secret) }, { headers: cors });
    }
    const key = Deno.env.get('KAKAO_REST_KEY');
    if (!key) return Response.json({ error: 'KAKAO_REST_KEY 미설정' }, { status: 500, headers: cors });
    const kakao = new KakaoClient(key);
    if (b.action === 'geocode' && typeof b.query === 'string') {
      return Response.json({ result: await kakao.geocode(b.query.slice(0, 100)) }, { headers: cors });
    }
    if (b.action === 'keyword' && typeof b.query === 'string') {
      const j = (await kakao.keyword(b.query.slice(0, 100), { x: b.lng, y: b.lat, size: 10 })) as { documents?: Place[] };
      const places = (j.documents ?? []).map((d) => ({
        name: d.place_name ?? '',
        address: d.road_address_name || d.address_name || '',
        category: d.category_name ?? '',
        location: { lat: Number(d.y), lng: Number(d.x) },
      }));
      return Response.json({ places }, { headers: cors });
    }
    if (b.action === 'reverse' && Number.isFinite(b.lat) && Number.isFinite(b.lng)) {
      const j = (await kakao.coord2address(b.lat, b.lng)) as {
        documents?: { address?: { address_name?: string; b_code?: string; main_address_no?: string; sub_address_no?: string; mountain_yn?: string } | null; road_address?: { address_name?: string; building_name?: string } | null }[];
      };
      const d = j.documents?.[0];
      return Response.json({ result: d ? { address: d.address?.address_name ?? null, roadAddress: d.road_address?.address_name ?? null, buildingName: d.road_address?.building_name ?? null } : null }, { headers: cors });
    }
    return Response.json({ error: 'bad request' }, { status: 400, headers: cors });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 502, headers: cors });
  }
});
