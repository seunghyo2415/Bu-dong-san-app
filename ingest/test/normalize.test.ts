import { describe, expect, it } from 'vitest';

import { pnuFromKakao } from '../../supabase/functions/_shared/kakao.ts';
import {
  buildingRow,
  date,
  int,
  jibunFromAddress,
  kaptBasisRow,
  kaptDetailRow,
  pnuToBuildingParams,
  rentRow,
  tradeRow,
} from '../../supabase/functions/_shared/normalize.ts';
import { PublicDataClient, normalizeKey, recentMonths } from '../../supabase/functions/_shared/publicdata.ts';
import { parseResponse, PublicDataError } from '../../supabase/functions/_shared/response.ts';
import { APT_LIST_JSON, BLD_RECAP_ITEMS, KAPT_BASIS_JSON, KAPT_DETAIL_JSON, RENT_ITEMS, TRADE_ITEMS, tradeXml } from './fixtures.ts';

describe('응답 해석', () => {
  it('XML items (빈 태그 포함)', () => {
    const p = parseResponse(tradeXml(TRADE_ITEMS, 2));
    expect(p.items).toHaveLength(2);
    expect(p.items[0].aptNm).toBe('테스트한빛');
    expect(p.items[0].cdealType).toBe('');
    expect(p.totalCount).toBe(2);
  });
  it('JSON 단건 item / 배열 items', () => {
    expect(parseResponse(KAPT_BASIS_JSON).items[0].kaptdaCnt).toBe('1000');
    expect(parseResponse(APT_LIST_JSON).items[0].kaptCode).toBe('A99990001');
  });
  it('인증키 오류는 예외', () => {
    const xml = '<OpenAPI_ServiceResponse><cmmMsgHeader><errMsg>SERVICE ERROR</errMsg><returnAuthMsg>SERVICE_KEY_IS_NOT_REGISTERED_ERROR</returnAuthMsg><returnReasonCode>30</returnReasonCode></cmmMsgHeader></OpenAPI_ServiceResponse>';
    expect(() => parseResponse(xml)).toThrow(PublicDataError);
    expect(() => parseResponse(xml)).toThrow(/SERVICE_KEY_IS_NOT_REGISTERED/);
  });
  it('resultCode 실패', () => {
    expect(() => parseResponse('<response><header><resultCode>03</resultCode><resultMsg>NO_DATA</resultMsg></header></response>')).toThrow();
  });
  it('엔티티 해제', () => {
    const p = parseResponse('<response><header><resultCode>00</resultCode></header><body><items><item><aptNm>A&amp;B</aptNm></item></items></body></response>');
    expect(p.items[0].aptNm).toBe('A&B');
  });
});

describe('정리(normalize)', () => {
  it('매매: 쉼표·공백 금액, 해제·직거래', () => {
    const a = tradeRow(TRADE_ITEMS[0])!;
    expect(a.price).toBe(45000);
    expect(a.deal_date).toBe('2026-10-03');
    expect(a.canceled).toBe(false);
    const b = tradeRow(TRADE_ITEMS[1])!;
    expect(b.canceled).toBe(true);
    expect(b.cancel_date).toBe('2026-10-20');
    expect(b.is_direct).toBe(true);
    expect(a.source_key).not.toBe(b.source_key);
    // 해제 여부만 바뀌어도 같은 거래로 인식
    expect(tradeRow({ ...TRADE_ITEMS[1], cdealType: '' })!.source_key).toBe(b.source_key);
  });
  it('전월세', () => {
    const r = rentRow(RENT_ITEMS[0])!;
    expect(r.deposit).toBe(30000);
    expect(r.monthly_rent).toBe(0);
    expect(r.renew_used).toBeNull();
  });
  it('필수값 없으면 버림', () => {
    expect(tradeRow({ ...TRADE_ITEMS[0], dealAmount: '' })).toBeNull();
  });
  it('기본정보: 주소에서 지번', () => {
    const b = kaptBasisRow(parseResponse(KAPT_BASIS_JSON).items[0])!;
    expect(b.jibun).toBe('1234-5');
    expect(b.approved_date).toBe('2015-03-02');
    expect(b.households).toBe(1000);
    expect(jibunFromAddress('울산광역시 울주군 범서읍 구영리 산 12 숲마을')).toBe('산 12');
    expect(jibunFromAddress('울산광역시 남구 삼산동 1234번지 ○○아파트')).toBe('1234');
    expect(jibunFromAddress(null)).toBeNull();
  });
  it('상세정보: 지상/지하 주차, 충전기', () => {
    const d = kaptDetailRow(parseResponse(KAPT_DETAIL_JSON).items[0])!;
    expect(d.parking_ground).toBe(120);
    expect(d.parking_under).toBe(1200);
    expect(d.ev_ground! + d.ev_under!).toBe(12);
  });
  it('건축물대장 → PNU, 주차 4구분', () => {
    const r = buildingRow(BLD_RECAP_ITEMS[0], 'recap')!;
    expect(r.pnu).toBe('3114010100112340005');
    expect(r.indoor_mech).toBe(50);
    expect(pnuToBuildingParams('3114010100212340005')).toEqual({ sigunguCd: '31140', bjdongCd: '10100', platGbCd: '1', bun: '1234', ji: '0005' });
  });
  it('카카오 주소 → PNU', () => {
    expect(pnuFromKakao({ b_code: '3114010100', main_address_no: '1234', sub_address_no: '5', mountain_yn: 'N' })).toBe('3114010100112340005');
    expect(pnuFromKakao({ b_code: '3114010100', main_address_no: '12', sub_address_no: '', mountain_yn: 'Y' })).toBe('3114010100200120000');
  });
  it('날짜·숫자', () => {
    expect(date('20150302')).toBe('2015-03-02');
    expect(date('26.1.5')).toBe('2026-01-05');
    expect(int('-1')).toBe(-1);
    expect(int('abc')).toBeNull();
  });
});

describe('호출 클라이언트', () => {
  it('인증키 Encoding 형태도 풀어서 사용', () => {
    expect(normalizeKey('abc%2Bdef%3D%3D')).toBe('abc+def==');
  });
  it('여러 페이지를 모두 가져옴', async () => {
    const calls: string[] = [];
    const fake = async (url: string) => {
      calls.push(url);
      const page = Number(new URL(url).searchParams.get('pageNo'));
      const items = page === 1 ? [TRADE_ITEMS[0], TRADE_ITEMS[1]] : [TRADE_ITEMS[0]];
      return new Response(tradeXml(items, 3));
    };
    const c = new PublicDataClient('KEY', fake, 0);
    const all = await c.all('https://x/y', { LAWD_CD: '31140' }, 2);
    expect(all).toHaveLength(3);
    expect(calls).toHaveLength(2);
    expect(new URL(calls[0]).searchParams.get('serviceKey')).toBe('KEY');
  });
  it('일시 오류는 다시 시도, 인증 오류는 바로 실패', async () => {
    let n = 0;
    const flaky = async () => {
      n++;
      if (n === 1) throw new TypeError('network');
      return new Response(tradeXml([TRADE_ITEMS[0]]));
    };
    expect(await new PublicDataClient('K', flaky, 0).page('https://x', {})).toBeTruthy();
    expect(n).toBe(2);
    let m = 0;
    const denied = async () => {
      m++;
      return new Response('<OpenAPI_ServiceResponse><cmmMsgHeader><returnAuthMsg>SERVICE_KEY_IS_NOT_REGISTERED_ERROR</returnAuthMsg><returnReasonCode>30</returnReasonCode></cmmMsgHeader></OpenAPI_ServiceResponse>');
    };
    await expect(new PublicDataClient('K', denied, 0).page('https://x', {})).rejects.toThrow();
    expect(m).toBe(1);
  });
  it('최근 n개월', () => {
    expect(recentMonths(3, new Date('2026-01-15T00:00:00Z'))).toEqual(['202601', '202512', '202511']);
  });
});
