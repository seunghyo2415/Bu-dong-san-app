import { describe, expect, it } from 'vitest';

import { communityQuery, isAdLikely, keywordStats, maskBannedWords, maskPersonalInfo, plainText, toDate } from './community';

describe('개인정보 가리기', () => {
  it.each([
    ['연락주세요 010-1234-5678', '연락주세요 010-****-****'],
    ['01012345678 로 문자', '010-****-**** 로 문자'],
    ['관리실 052-123-4567', '관리실 052-****-****'],
    ['메일 hong.gildong@example.com', '메일 h***@example.com'],
    ['900101-1234567', '900101-1******'],
  ])('%s', (a, b) => expect(maskPersonalInfo(a)).toBe(b));
  it('일반 숫자는 그대로', () => {
    expect(maskPersonalInfo('84㎡ 3억 2000만, 101동 1502호')).toBe('84㎡ 3억 2000만, 101동 1502호');
  });
});

describe('금칙어', () => {
  it('*** 로 바꿈', () => expect(maskBannedWords('이런 병신 같은', ['병신'])).toBe('이런 ** 같은'));
});

describe('광고 거르기', () => {
  it('체험단·분양상담', () => {
    expect(isAdLikely('삼산 신축 아파트 체험단 후기')).toBe(true);
    expect(isAdLikely('잔여세대 선착순 분양 상담')).toBe(true);
    expect(isAdLikely('옥동 학마을 3년 살아본 후기', '주차가 조금 불편해요')).toBe(false);
  });
});

describe('외부 글 정리', () => {
  it('태그 제거·길이 제한', () => {
    expect(plainText('<b>옥동</b> 학마을 &amp; 후기')).toBe('옥동 학마을 & 후기');
    expect(plainText('가'.repeat(200), 10)).toHaveLength(10);
  });
  it('날짜', () => {
    expect(toDate('20261105')).toBe('2026-11-05');
    expect(toDate('2026-11-05T12:00:00.000+09:00')).toBe('2026-11-05');
    expect(toDate(null)).toBeNull();
  });
  it('검색어', () => expect(communityQuery('삼산 푸르지오(1차)', '남구')).toBe('삼산 푸르지오 울산 남구'));
  it('장단점 단어', () => {
    const s = keywordStats(['초품아에 학원가 가까움', '이중주차 심함 주차난', '학군 좋고 조용', '주차 전쟁']);
    expect(s.pros[0]).toEqual({ word: '학군', count: 2 });
    expect(s.cons[0]).toEqual({ word: '주차부족', count: 2 });
  });
});
