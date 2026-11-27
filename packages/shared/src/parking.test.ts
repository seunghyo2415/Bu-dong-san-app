import { describe, expect, it } from 'vitest';
import { compareParkingSources, parkingGrade, parkingPerHousehold } from './parking';

describe('세대당 주차', () => {
  it('소수점 둘째 자리', () => {
    expect(parkingPerHousehold(1320, 1000)).toBe(1.32);
    expect(parkingPerHousehold(1000, 3)).toBe(333.33);
    expect(parkingPerHousehold(10, 0)).toBeNaN();
  });
  it('등급 경계값', () => {
    expect(parkingGrade(1.5)).toBe('plenty');
    expect(parkingGrade(1.49)).toBe('normal');
    expect(parkingGrade(1.0)).toBe('normal');
    expect(parkingGrade(0.99)).toBe('short');
    expect(parkingGrade(NaN)).toBeNull();
  });
  it('출처 간 차이 10% 이상이면 경고', () => {
    expect(compareParkingSources(1000, 1090).significant).toBe(false);
    expect(compareParkingSources(1000, 1100).significant).toBe(true);
  });
});

import { rankAmong, summarizeParking } from './parking';

describe('주차 구성', () => {
  it('지하·기계식 비율', () => {
    const s = summarizeParking({ indoorSelf: 700, indoorMech: 100, outdoorSelf: 200, outdoorMech: 0 });
    expect(s.total).toBe(1000);
    expect(s.indoorRatio).toBeCloseTo(0.8);
    expect(s.mechanicalRatio).toBeCloseTo(0.1);
  });
  it('동네 순위', () => {
    expect(rankAmong(1.32, [1.5, 1.32, 0.9, 1.1])).toEqual({ position: 2, total: 4 });
  });
});
