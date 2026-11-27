/**
 * 카카오 로컬 API (서버에서만, REST API 키 사용).
 * 주소 검색 응답의 documents[].x(경도)·y(위도), address.b_code(법정동코드 10자리),
 * address.main_address_no / sub_address_no / mountain_yn 으로 좌표와 PNU를 만든다.
 * ⚠️ 응답 필드는 첫 실제 호출 때 확인 후 docs/DATA_SOURCES.md 에 기록.
 */
import type { FetchLike } from './publicdata.ts';

export type Geocoded = { lat: number; lng: number; pnu: string | null; bCode: string | null };

type KakaoAddressDoc = {
  x?: string;
  y?: string;
  address?: { b_code?: string; main_address_no?: string; sub_address_no?: string; mountain_yn?: string } | null;
};

export function pnuFromKakao(a: KakaoAddressDoc['address']): string | null {
  if (!a?.b_code || a.b_code.length !== 10 || !a.main_address_no) return null;
  const land = a.mountain_yn === 'Y' ? '2' : '1';
  return a.b_code + land + a.main_address_no.padStart(4, '0') + (a.sub_address_no || '0').padStart(4, '0');
}

export class KakaoClient {
  constructor(private readonly restKey: string, private readonly fetchImpl: FetchLike = fetch) {}

  private async get(path: string, params: Record<string, string>) {
    const res = await this.fetchImpl(`https://dapi.kakao.com${path}?${new URLSearchParams(params)}`, {
      headers: { Authorization: `KakaoAK ${this.restKey}` },
    });
    if (!res.ok) throw new Error(`카카오 API 오류 HTTP ${res.status}`);
    return res.json();
  }

  async geocode(address: string): Promise<Geocoded | null> {
    const j = (await this.get('/v2/local/search/address.json', { query: address, size: '1' })) as { documents?: KakaoAddressDoc[] };
    const d = j.documents?.[0];
    if (!d?.x || !d?.y) return null;
    return { lat: Number(d.y), lng: Number(d.x), pnu: pnuFromKakao(d.address), bCode: d.address?.b_code ?? null };
  }

  /** 키워드 검색 (앱의 주소·장소 검색, 공유 매물 후보 찾기에 사용) */
  async keyword(query: string, opts: { x?: number; y?: number; radius?: number; size?: number } = {}) {
    const params: Record<string, string> = { query, size: String(opts.size ?? 10) };
    if (opts.x != null && opts.y != null) Object.assign(params, { x: String(opts.x), y: String(opts.y), radius: String(opts.radius ?? 20000) });
    return this.get('/v2/local/search/keyword.json', params);
  }

  /** 좌표 → 주소 (지도에서 빈 곳을 눌렀을 때) */
  async coord2address(lat: number, lng: number) {
    return this.get('/v2/local/geo/coord2address.json', { x: String(lng), y: String(lat) });
  }
}
