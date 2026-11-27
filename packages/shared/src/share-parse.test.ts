import { describe, expect, it } from 'vitest';

import { extractOgTags, isOgAllowed, mergeParsed, parseKoreanPrice, parseSharedText } from './share-parse';

describe('한글 가격', () => {
  it.each([
    ['3억 2,000만원', 32000],
    ['3억2천', 32000],
    ['3억 2500', 32500],
    ['3.2억', 32000],
    ['32,000만원', 32000],
    ['8500만', 8500],
    ['5천만', 5000],
    ['12억', 120000],
  ])('%s → %d', (s, v) => expect(parseKoreanPrice(s)).toBe(v));
  it('가격 없음', () => expect(parseKoreanPrice('연락주세요')).toBeNull());
});

describe('공유 글 해석 (예시 문장은 지어낸 것)', () => {
  it('매매 + 단지명 + 면적 + 층 + 링크', () => {
    const p = parseSharedText('삼산 푸르지오 아파트 매매 3억 2,000만원 전용 84.97㎡ 10/25층 남향\nhttps://www.daangn.com/kr/realty/abc-123');
    expect(p.url).toBe('https://www.daangn.com/kr/realty/abc-123');
    expect(p.dealType).toBe('sale');
    expect(p.price).toBe(32000);
    expect(p.areaM2).toBe(84.97);
    expect(p.floor).toBe(10);
    expect(p.complexName).toContain('푸르지오');
  });
  it('전세 + 평 + 지번 주소', () => {
    const p = parseSharedText('[당근 부동산] 전세 2억 5천 · 울산 남구 삼산동 1234-5 · 32평');
    expect(p.dealType).toBe('jeonse');
    expect(p.price).toBe(25000);
    expect(p.areaFromPyeong).toBe(true);
    expect(p.areaM2).toBeCloseTo(105.79, 1);
    expect(p.address).toContain('삼산동 1234-5');
    expect(p.dongName).toBe('삼산동');
  });
  it('월세 보증금/월세', () => {
    const p = parseSharedText('원룸 월세 500/40 무거동');
    expect(p.dealType).toBe('monthly');
    expect(p.price).toBe(500);
    expect(p.monthlyRent).toBe(40);
    expect(p.dongName).toBe('무거동');
  });
  it('단지명 앞 동네 이름 포함, 거래 용어 제외', () => {
    expect(parseSharedText('옥동 학마을 아파트 매매 3억').complexName).toBe('옥동 학마을 아파트');
    expect(parseSharedText('급매 삼산 푸르지오 2차 3억').complexName).toBe('삼산 푸르지오 2차');
  });
  it('도로명 주소', () => {
    const p = parseSharedText('울산 남구 삼산로 123 매매 4억');
    expect(p.address).toBe('울산 남구 삼산로 123');
  });
  it('링크만 있으면 나머지는 비어 있음 (예외 없음)', () => {
    const p = parseSharedText('https://daangn.com/kr/realty/x');
    expect(p.url).toBe('https://daangn.com/kr/realty/x');
    expect(p.price).toBeNull();
    expect(p.complexName).toBeNull();
    expect(p.address).toBeNull();
  });
  it('빈 문자열도 안전', () => {
    expect(parseSharedText('').url).toBeNull();
  });
  it('"101동"은 동네 이름으로 보지 않음', () => {
    expect(parseSharedText('101동 1502호 매매 3억').dongName).toBeNull();
  });
});

describe('링크 미리보기', () => {
  it('OG 태그 추출', () => {
    const html = `<html><head><title>무시</title><meta property="og:title" content="옥동 학마을 아파트 매매 4억 &amp; 급매">
      <meta property="og:description" content="전용 59㎡ 3층"><meta property="og:image" content="https://img/x.jpg"></head><body>본문</body></html>`;
    expect(extractOgTags(html)).toEqual({ title: '옥동 학마을 아파트 매매 4억 & 급매', description: '전용 59㎡ 3층', image: 'https://img/x.jpg' });
  });
  it('허용 사이트만', () => {
    expect(isOgAllowed('https://www.daangn.com/kr/realty/1')).toBe(true);
    expect(isOgAllowed('https://evil.com/daangn.com')).toBe(false);
    expect(isOgAllowed('not a url')).toBe(false);
  });
  it('합치기: 없는 값만 채움', () => {
    const a = parseSharedText('https://daangn.com/x');
    const b = parseSharedText('옥동 학마을 아파트 매매 4억 전용 59㎡');
    const m = mergeParsed(a, b);
    expect(m.url).toBe('https://daangn.com/x');
    expect(m.price).toBe(40000);
    expect(m.areaM2).toBe(59);
  });
});
