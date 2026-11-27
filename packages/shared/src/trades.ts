/** 실거래 통계. 금액은 만원 단위. 해제(취소)된 거래는 통계에서 뺀다. */

export type TradePoint = {
  date: string; // YYYY-MM-DD 계약일
  price: number; // 만원 (전세는 보증금)
  canceled?: boolean;
};

export function validTrades<T extends TradePoint>(trades: T[]): T[] {
  return trades.filter((t) => !t.canceled);
}

export function median(nums: number[]): number | null {
  if (!nums.length) return null;
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

/** 월별 중간값: [{ ym: '2026-10', median }] (오래된 달부터) */
export function monthlyMedians(trades: TradePoint[]): { ym: string; median: number }[] {
  const byMonth = new Map<string, number[]>();
  for (const t of validTrades(trades)) {
    const ym = t.date.slice(0, 7);
    const arr = byMonth.get(ym) ?? [];
    arr.push(t.price);
    byMonth.set(ym, arr);
  }
  return [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([ym, prices]) => ({ ym, median: median(prices)! }));
}

export function latestTrade<T extends TradePoint>(trades: T[]): T | null {
  const v = validTrades(trades);
  if (!v.length) return null;
  return v.reduce((a, b) => (b.date > a.date ? b : a));
}

export function highestTrade<T extends TradePoint>(trades: T[]): T | null {
  const v = validTrades(trades);
  if (!v.length) return null;
  return v.reduce((a, b) => (b.price > a.price || (b.price === a.price && b.date > a.date) ? b : a));
}

/** 최고가 대비 현재 위치. 0.92 → 최고가의 92% */
export function ratioToPeak(current: number, peak: number): number {
  return peak > 0 ? current / peak : NaN;
}

/** 전세가율 = 전세 보증금 ÷ 매매가 */
export function jeonseRatio(jeonse: number, sale: number): number {
  return sale > 0 ? jeonse / sale : NaN;
}

/** 기준일로부터 n년 전 이후 거래만. years=null 이면 전체 */
export function withinYears<T extends TradePoint>(trades: T[], years: number | null, today: string): T[] {
  if (years == null) return trades;
  const d = new Date(today + 'T00:00:00Z');
  d.setUTCFullYear(d.getUTCFullYear() - years);
  const from = d.toISOString().slice(0, 10);
  return trades.filter((t) => t.date >= from);
}

/** 두 가격 비교: (a - b) / b. 공유 매물 "최근 실거래 대비 +3.2%" 에 사용 */
export function priceDiffRatio(a: number, b: number): number {
  return b > 0 ? (a - b) / b : NaN;
}

export type ComparableTrade = TradePoint & { exclusiveM2: number; dealType: 'sale' | 'jeonse' | 'monthly' };

/**
 * 매물 가격을 최근 실거래와 비교. 같은 거래유형·전용면적 ±3㎡·최근 6개월(없으면 12개월) 거래의 중간값 기준.
 * 반환 ratio 0.032 → "최근 실거래 대비 +3.2%"
 */
export function compareToRecentTrades(
  listing: { price: number; dealType: 'sale' | 'jeonse' | 'monthly'; areaM2: number | null },
  trades: ComparableTrade[],
  today: string,
): { ratio: number; basis: number; count: number; months: number } | null {
  if (listing.dealType === 'monthly' || !listing.price) return null;
  const pool = validTrades(trades).filter(
    (t) => t.dealType === listing.dealType && (listing.areaM2 == null || Math.abs(t.exclusiveM2 - listing.areaM2) <= 3),
  );
  for (const months of [6, 12]) {
    const d = new Date(today + 'T00:00:00Z');
    d.setUTCMonth(d.getUTCMonth() - months);
    const from = d.toISOString().slice(0, 10);
    const recent = pool.filter((t) => t.date >= from);
    const basis = median(recent.map((t) => t.price));
    if (basis) return { ratio: priceDiffRatio(listing.price, basis), basis, count: recent.length, months };
  }
  return null;
}
