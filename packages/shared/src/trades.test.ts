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

import { compareToRecentTrades } from './trades';

describe('매물 vs 최근 실거래', () => {
  const tr = [
    { date: '2026-10-01', price: 30000, exclusiveM2: 84.9, dealType: 'sale' as const },
    { date: '2026-08-01', price: 31000, exclusiveM2: 84.97, dealType: 'sale' as const },
    { date: '2026-09-01', price: 50000, exclusiveM2: 114.7, dealType: 'sale' as const }, // 면적 다름
    { date: '2026-09-15', price: 21000, exclusiveM2: 84.97, dealType: 'jeonse' as const }, // 유형 다름
    { date: '2026-10-05', price: 99999, exclusiveM2: 84.97, dealType: 'sale' as const, canceled: true }, // 해제
  ];
  it('같은 유형·비슷한 면적 6개월 중간값과 비교', () => {
    const r = compareToRecentTrades({ price: 31620, dealType: 'sale', areaM2: 84.97 }, tr, '2026-11-27')!;
    expect(r.basis).toBe(30500);
    expect(r.count).toBe(2);
    expect(r.ratio).toBeCloseTo(0.0367, 3);
  });
  it('6개월에 없으면 12개월', () => {
    const old = [{ date: '2026-01-10', price: 30000, exclusiveM2: 84.97, dealType: 'sale' as const }];
    expect(compareToRecentTrades({ price: 30000, dealType: 'sale', areaM2: 85 }, old, '2026-11-27')?.months).toBe(12);
  });
  it('월세나 거래 없음은 비교 안 함', () => {
    expect(compareToRecentTrades({ price: 500, dealType: 'monthly', areaM2: 30 }, tr, '2026-11-27')).toBeNull();
    expect(compareToRecentTrades({ price: 30000, dealType: 'sale', areaM2: 200 }, tr, '2026-11-27')).toBeNull();
  });
});
