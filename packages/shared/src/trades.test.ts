import { describe, expect, it } from 'vitest';
import { highestTrade, jeonseRatio, latestTrade, median, monthlyMedians, priceDiffRatio, ratioToPeak, withinYears } from './trades';

const T = [
  { date: '2026-01-05', price: 30000 },
  { date: '2026-01-20', price: 32000 },
  { date: '2026-01-25', price: 99999, canceled: true },
  { date: '2025-06-01', price: 35000 },
  { date: '2022-03-01', price: 40000 },
];

describe('실거래 통계', () => {
  it('중간값', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(3); // 2.5 반올림
    expect(median([])).toBeNull();
  });
  it('해제 거래는 빼고 월별 중간값', () => {
    expect(monthlyMedians(T)).toEqual([
      { ym: '2022-03', median: 40000 },
      { ym: '2025-06', median: 35000 },
      { ym: '2026-01', median: 31000 },
    ]);
  });
  it('최근 거래·최고가 (해제 제외)', () => {
    expect(latestTrade(T)?.date).toBe('2026-01-20');
    expect(highestTrade(T)?.price).toBe(40000);
    expect(ratioToPeak(32000, 40000)).toBeCloseTo(0.8);
  });
  it('기간 필터', () => {
    expect(withinYears(T, 1, '2026-11-27').map((t) => t.date)).toEqual(['2026-01-05', '2026-01-20', '2026-01-25']);
    expect(withinYears(T, null, '2026-11-27')).toHaveLength(5);
  });
  it('전세가율·가격 차이', () => {
    expect(jeonseRatio(21000, 30000)).toBeCloseTo(0.7);
    expect(priceDiffRatio(30960, 30000)).toBeCloseTo(0.032);
  });
});
