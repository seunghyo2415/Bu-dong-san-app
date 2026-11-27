import { describe, expect, it } from 'vitest';

import { acquisitionTax, baseRate, dsr, gapAnalysis, loanSchedule } from './calc';
import { DEFAULT_POLICY, mergePolicy } from './policy';

const P = DEFAULT_POLICY;

describe('취득세 (설정값 기준 계산 로직)', () => {
  it('구간별 기본세율', () => {
    expect(baseRate(50000, P.acquisitionTax)).toBe(0.01);
    expect(baseRate(60000, P.acquisitionTax)).toBe(0.01);
    expect(baseRate(75000, P.acquisitionTax)).toBe(0.02); // 7.5억 × 2/3 − 3 = 2%
    expect(baseRate(80000, P.acquisitionTax)).toBeCloseTo(0.02333, 5);
    expect(baseRate(95000, P.acquisitionTax)).toBe(0.03);
  });
  it('1주택 3억, 84㎡: 취득세 1% + 지방교육세 0.1%, 농특세 없음', () => {
    const r = acquisitionTax({ price: 30000, areaM2: 84.97, houses: 1, adjustedArea: false, firstHome: false }, P);
    expect(r.acquisition).toBe(3_000_000);
    expect(r.education).toBe(300_000);
    expect(r.rural).toBe(0);
    expect(r.total).toBe(3_300_000);
  });
  it('85㎡ 초과면 농특세 0.2%', () => {
    expect(acquisitionTax({ price: 30000, areaM2: 101.88, houses: 1, adjustedArea: false, firstHome: false }, P).rural).toBe(600_000);
  });
  it('비조정 3주택 중과 8%', () => {
    const r = acquisitionTax({ price: 30000, areaM2: 101.88, houses: 3, adjustedArea: false, firstHome: false }, P);
    expect(r.heavy).toBe(true);
    expect(r.rate).toBe(0.08);
    expect(r.education).toBe(1_200_000); // 0.4%
    expect(r.rural).toBe(1_800_000); // 0.6%
  });
  it('생애최초 감면 (한도까지)', () => {
    const r = acquisitionTax({ price: 30000, areaM2: 59, houses: 1, adjustedArea: false, firstHome: true }, P);
    expect(r.relief).toBe(2_000_000);
    expect(r.total).toBe(3_300_000 - 2_000_000);
  });
  it('설정값을 바꾸면 계산도 바뀜 (하드코딩 아님)', () => {
    const custom = mergePolicy(P, { acquisitionTax: { ...P.acquisitionTax, rateLow: 0.015 } });
    expect(acquisitionTax({ price: 30000, areaM2: 59, houses: 1, adjustedArea: false, firstHome: false }, custom).acquisition).toBe(4_500_000);
  });
});

describe('대출', () => {
  it('원리금균등: 1억, 연 4%, 30년 → 월 약 477,415원', () => {
    const s = loanSchedule(100_000_000, 0.04, 30, 'equal_payment');
    expect(s.firstPayment).toBeGreaterThan(477_000);
    expect(s.firstPayment).toBeLessThan(477_800);
    expect(s.rows).toHaveLength(360);
    expect(s.rows[359].balance).toBe(0);
  });
  it('원금균등: 첫 달이 가장 큼', () => {
    const s = loanSchedule(120_000_000, 0.05, 10, 'equal_principal');
    expect(s.rows[0].principal).toBe(1_000_000);
    expect(s.rows[0].payment).toBeGreaterThan(s.rows[119].payment);
  });
  it('만기일시: 마지막 달 원금 전부', () => {
    const s = loanSchedule(10_000_000, 0.06, 1, 'bullet');
    expect(s.rows[0].payment).toBe(50_000);
    expect(s.rows[11].principal).toBe(10_000_000);
  });
  it('DSR·전세가율', () => {
    expect(dsr(60_000_000, 24_000_000)).toBeCloseTo(0.4);
    expect(gapAnalysis(30000, 21000)).toEqual({ ratio: 0.7, gap: 9000 });
  });
});
