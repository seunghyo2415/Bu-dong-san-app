import { describe, expect, it } from 'vitest';

import { naverCoord, naverLocal } from '../../supabase/functions/_shared/naver.ts';

describe('네이버 지역 검색 정리 (응답 형식은 문서 기준 예시)', () => {
  it('좌표 변환 (×10^7 정수)', () => {
    expect(naverCoord('1293365000', '355405000')).toEqual({ lat: 35.5405, lng: 129.3365 });
    expect(naverCoord('0', '0')).toBeNull();
  });
  it('태그 제거·키 헤더', async () => {
    const r = await naverLocal('un모텔', 'id', 'sec', async (url, init) => {
      expect(url).toContain('/v1/search/local.json');
      expect((init?.headers as Record<string, string>)['X-Naver-Client-Id']).toBe('id');
      return Response.json({ items: [{ title: '<b>UN</b>모텔', roadAddress: '울산 북구 어딘가 1', category: '숙박>모텔', mapx: '1293400000', mapy: '356600000' }] });
    });
    expect(r).toEqual([{ name: 'UN모텔', address: '울산 북구 어딘가 1', category: '숙박>모텔', location: { lat: 35.66, lng: 129.34 } }]);
  });
});
