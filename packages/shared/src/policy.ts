import type { PolicyConfig } from './calc';

/**
 * 계산기 기본 설정 (앱에 같이 들어가는 값). 운영 중에는 DB(policy_values, key='calculators')의 값을 우선 사용.
 *
 * ⚠️ 2026-11-27 작성. 개발 환경에서 법령 사이트에 접속할 수 없어 최신 법령과 대조하지 못했다 → verifiedAt: null
 *    값을 바꿀 때는 위택스·국가법령정보센터에서 확인하고 verifiedAt 에 날짜를 적는다.
 *    (주택 취득세 기본 1~3%, 다주택 중과 8·12%, 지방교육세·농특세 구조는 2020.8 개정 이후 체계 기준)
 */
export const DEFAULT_POLICY: PolicyConfig = {
  version: '2026-11-27',
  effectiveFrom: '2023-01-01',
  verifiedAt: null,
  sources: [
    { label: '위택스 취득세 안내', url: 'https://www.wetax.go.kr' },
    { label: '국가법령정보센터 지방세법', url: 'https://www.law.go.kr/법령/지방세법' },
    { label: '금융위원회 (DSR·LTV)', url: 'https://www.fsc.go.kr' },
  ],
  acquisitionTax: {
    lowLimit: 60000,
    highLimit: 90000,
    rateLow: 0.01,
    rateHigh: 0.03,
    heavy: {
      adjusted: [
        { minHouses: 2, rate: 0.08 },
        { minHouses: 3, rate: 0.12 },
      ],
      nonAdjusted: [
        { minHouses: 3, rate: 0.08 },
        { minHouses: 4, rate: 0.12 },
      ],
    },
    eduRatioOfRate: 0.1,
    eduHeavyRate: 0.004,
    ruralAreaM2: 85,
    ruralRate: 0.002,
    ruralHeavy: [
      { rate: 0.08, rural: 0.006 },
      { rate: 0.12, rural: 0.01 },
    ],
    firstHomeReliefMax: 200,
    firstHomePriceCap: 120000,
  },
  loan: { dsrLimitBank: 0.4, dsrLimitNonBank: 0.5, ltvFirstHome: 0.8, ltvGeneral: 0.7 },
};

/** DB 등에서 받은 값으로 기본값을 덮어쓴다 (빠진 칸은 기본값 유지) */
export function mergePolicy(base: PolicyConfig, override: Partial<PolicyConfig> | null | undefined): PolicyConfig {
  if (!override) return base;
  return {
    ...base,
    ...override,
    acquisitionTax: { ...base.acquisitionTax, ...(override.acquisitionTax ?? {}) },
    loan: { ...base.loan, ...(override.loan ?? {}) },
  };
}
