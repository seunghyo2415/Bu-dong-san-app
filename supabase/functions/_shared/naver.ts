/**
 * 네이버 지역 검색 (공식 검색 API: openapi.naver.com/v1/search/local.json, 한 번에 최대 5개).
 * 응답 mapx/mapy 는 경도·위도에 10^7 을 곱한 정수(WGS84)로 알려져 있다.
 * ⚠️ 키 발급 후 첫 호출에서 좌표 형식을 확인 (울산 범위 밖이면 버림).
 */
import type { FetchLike } from './publicdata.ts';

export type NaverPlace = { name: string; address: string; category: string; location: { lat: number; lng: number } };

const strip = (s: string) => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').trim();

export function naverCoord(mapx: string | number, mapy: string | number): { lat: number; lng: number } | null {
  const x = Number(mapx);
  const y = Number(mapy);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  const lng = x > 1e6 ? x / 1e7 : x;
  const lat = y > 1e6 ? y / 1e7 : y;
  // 대한민국 범위 확인
  return lat > 33 && lat < 39 && lng > 124 && lng < 132 ? { lat, lng } : null;
}

export async function naverLocal(query: string, id: string, secret: string, fetchImpl: FetchLike = fetch): Promise<NaverPlace[]> {
  const res = await fetchImpl(`https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(query)}&display=5`, {
    headers: { 'X-Naver-Client-Id': id, 'X-Naver-Client-Secret': secret },
  });
  if (!res.ok) throw new Error(`네이버 지역 검색 HTTP ${res.status}`);
  const j = (await res.json()) as { items?: Record<string, string>[] };
  return (j.items ?? [])
    .map((it) => ({ name: strip(it.title ?? ''), address: it.roadAddress || it.address || '', category: it.category ?? '', location: naverCoord(it.mapx, it.mapy) }))
    .filter((p): p is NaverPlace => !!p.location && !!p.name);
}
