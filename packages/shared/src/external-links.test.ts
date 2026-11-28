import { describe, expect, it } from 'vitest';

import { detectExternalLink, externalSearchUrl, nameFromSharedText } from './external-links';

describe('다른 부동산 앱 링크 알아보기', () => {
  it('네이버 부동산 주소들', () => {
    expect(detectExternalLink('https://new.land.naver.com/complexes/12345')?.app).toBe('naver');
    expect(detectExternalLink('삼산 현대 https://fin.land.naver.com/complexes/9')?.app).toBe('naver');
    expect(detectExternalLink('네이버페이 부동산 옥동 학마을 https://naver.me/abcd')?.app).toBe('naver');
  });
  it('naver.me 는 부동산 관련 글일 때만', () => {
    expect(detectExternalLink('뉴스 보세요 https://naver.me/abcd')).toBeNull();
  });
  it('호갱노노', () => {
    expect(detectExternalLink('호갱노노 - 옥동 학마을 https://hogangnono.com/apt/xYz1')).toEqual({ app: 'hogangnono', url: 'https://hogangnono.com/apt/xYz1' });
  });
  it('다른 링크는 아님', () => {
    expect(detectExternalLink('https://www.daangn.com/kr/realty/1')).toBeNull();
    expect(detectExternalLink('링크 없음')).toBeNull();
    expect(detectExternalLink('https://evil.com/hogangnono.com')).toBeNull();
  });
  it('이름 검색 주소·공유 글의 단지 이름', () => {
    expect(externalSearchUrl('naver', '옥동 학마을(1차)')).toBe('https://m.land.naver.com/search/result/%EC%98%A5%EB%8F%99%20%ED%95%99%EB%A7%88%EC%9D%84');
    expect(nameFromSharedText('[호갱노노] 옥동 학마을 아파트 https://hogangnono.com/apt/1')).toBe('옥동 학마을 아파트');
  });
});
