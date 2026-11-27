/**
 * 계산기 (취득세 · 대출 이자 · 전세가율/갭 · DSR).
 * ⚠️ 세율·한도는 코드에 고정하지 않고 PolicyConfig 로 받는다. 기본값은 policy.ts, 운영 중에는 DB policy_values 로 바꾼다.
 * 모든 결과는 "참고용" — 실제는 위택스·금융기관에서 확인.
 */

export type PolicyConfig = {
  version: string;
  effectiveFrom: string; // 이 설정이 기준으로 삼는 법령 시행일
  verifiedAt: string | null; // 사람이 최신 법령과 대조한 날 (null = 확인 필요)
  sources: { label: string; url: string }[];
  acquisitionTax: {
    /** 1주택(비조정 2주택 포함) 기본세율: 6억 이하 rateLow, 9억 초과 rateHigh, 그 사이 (가액×2/3억 − 3)% */
    lowLimit: number; // 만원 (60000)
    highLimit: number; // 만원 (90000)
    rateLow: number; // 0.01
    rateHigh: number; // 0.03
    /** 중과세율: [조정대상지역 여부][주택 수 이상] */
    heavy: { adjusted: { minHouses: number; rate: number }[]; nonAdjusted: { minHouses: number; rate: number }[] };
    /** 지방교육세 = 기본세율 구간: 취득세율 × eduRatioOfRate / 중과: eduHeavyRate */
    eduRatioOfRate: number; // 0.1
    eduHeavyRate: number; // 0.004
    /** 농어촌특별세 (전용 85㎡ 초과만): 기본 ruralRate, 중과 시 ruralHeavy[rate] */
    ruralAreaM2: number; // 85
    ruralRate: number; // 0.002
    ruralHeavy: { rate: number; rural: number }[];
    /** 생애최초 감면 한도 (만원), 적용 가액 상한 (만원). null 이면 미적용 */
    firstHomeReliefMax: number | null;
    firstHomePriceCap: number | null;
  };
  loan: { dsrLimitBank: number; dsrLimitNonBank: number; ltvFirstHome: number; ltvGeneral: number };
};

export type AcquisitionInput = {
  price: number; // 만원
  areaM2: number; // 전용
  houses: number; // 취득 후 보유 주택 수 (1 = 1주택)
  adjustedArea: boolean; // 조정대상지역 여부
  firstHome: boolean; // 생애최초
};

export type AcquisitionResult = {
  rate: number;
  acquisition: number; // 원
  education: number;
  rural: number;
  relief: number;
  total: number;
  heavy: boolean;
  notes: string[];
};

const won = (manwon: number) => manwon * 10000;
const round10 = (n: number) => Math.floor(n / 10) * 10; // 세금은 10원 미만 절사

export function baseRate(price: number, p: PolicyConfig['acquisitionTax']): number {
  if (price <= p.lowLimit) return p.rateLow;
  if (price > p.highLimit) return p.rateHigh;
  // (취득가액 × 2/3억 − 3) % , 소수점 다섯째 자리에서 반올림
  const pct = (price / 10000) * (2 / 3) - 3;
  return Math.round(pct * 10000) / 1000000;
}

export function acquisitionTax(i: AcquisitionInput, policy: PolicyConfig): AcquisitionResult {
  const p = policy.acquisitionTax;
  const notes: string[] = [];
  const table = i.adjustedArea ? p.heavy.adjusted : p.heavy.nonAdjusted;
  const heavyRule = [...table].sort((a, b) => b.minHouses - a.minHouses).find((h) => i.houses >= h.minHouses);
  const heavy = !!heavyRule;
  const rate = heavyRule ? heavyRule.rate : baseRate(i.price, p);
  const acquisition = round10(won(i.price) * rate);
  const education = round10(won(i.price) * (heavy ? p.eduHeavyRate : rate * p.eduRatioOfRate));
  let rural = 0;
  if (i.areaM2 > p.ruralAreaM2) {
    const r = heavy ? p.ruralHeavy.find((x) => x.rate === rate)?.rural ?? p.ruralRate : p.ruralRate;
    rural = round10(won(i.price) * r);
  } else notes.push(`전용 ${p.ruralAreaM2}㎡ 이하라 농어촌특별세 없음`);
  let relief = 0;
  if (i.firstHome && !heavy && p.firstHomeReliefMax != null && (p.firstHomePriceCap == null || i.price <= p.firstHomePriceCap)) {
    relief = Math.min(acquisition, won(p.firstHomeReliefMax));
    notes.push(`생애최초 감면 최대 ${p.firstHomeReliefMax.toLocaleString()}만원 반영 (요건 충족 시)`);
  }
  if (heavy) notes.push(`${i.adjustedArea ? '조정대상지역' : '비조정지역'} ${i.houses}주택 중과세율 적용`);
  return { rate, acquisition, education, rural, relief, total: acquisition + education + rural - relief, heavy, notes };
}

export type LoanMethod = 'equal_payment' | 'equal_principal' | 'bullet';

/** 대출 상환: 원리금균등 / 원금균등 / 만기일시. 금액은 원 단위 */
export function loanSchedule(principal: number, annualRate: number, years: number, method: LoanMethod) {
  const n = Math.round(years * 12);
  const r = annualRate / 12;
  const rows: { month: number; payment: number; principal: number; interest: number; balance: number }[] = [];
  let bal = principal;
  const fixed = r === 0 ? principal / n : (principal * r * (1 + r) ** n) / ((1 + r) ** n - 1);
  for (let m = 1; m <= n; m++) {
    const interest = bal * r;
    let prin: number;
    if (method === 'equal_payment') prin = fixed - interest;
    else if (method === 'equal_principal') prin = principal / n;
    else prin = m === n ? bal : 0;
    bal = Math.max(0, bal - prin);
    rows.push({ month: m, payment: Math.round(prin + interest), principal: Math.round(prin), interest: Math.round(interest), balance: Math.round(bal) });
  }
  const totalInterest = rows.reduce((a, b) => a + b.interest, 0);
  return { rows, firstPayment: rows[0]?.payment ?? 0, totalInterest, totalPayment: principal + totalInterest };
}

/** DSR = (연간 원리금 합) ÷ 연소득 */
export function dsr(annualIncome: number, annualDebtService: number) {
  return annualIncome > 0 ? annualDebtService / annualIncome : NaN;
}

/** 전세가율·갭(매매가 − 전세가) */
export function gapAnalysis(salePrice: number, jeonse: number) {
  return { ratio: salePrice > 0 ? jeonse / salePrice : NaN, gap: salePrice - jeonse };
}
