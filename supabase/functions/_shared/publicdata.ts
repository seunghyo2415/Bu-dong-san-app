/**
 * 공공데이터포털 API 호출 (주소·파라미터는 docs/DATA_SOURCES.md 공식 명세 그대로).
 * 인증키는 포털의 "Decoding" 키를 쓴다. (Encoding 키를 넣어도 자동으로 풀어서 사용)
 */
import { parseResponse, PublicDataError, type Item } from './response.ts';

export const ENDPOINTS = {
  aptTrade: 'https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev',
  aptRent: 'https://apis.data.go.kr/1613000/RTMSDataSvcAptRent/getRTMSDataSvcAptRent',
  aptListSigungu: 'https://apis.data.go.kr/1613000/AptListService4/getSigunguAptList4',
  kaptBasis: 'https://apis.data.go.kr/1613000/AptBasisInfoServiceV5/getAphusBassInfoV5',
  kaptDetail: 'https://apis.data.go.kr/1613000/AptBasisInfoServiceV5/getAphusDtlInfoV5',
  bldRecap: 'https://apis.data.go.kr/1613000/BldRgstHubService/getBrRecapTitleInfo',
  bldTitle: 'https://apis.data.go.kr/1613000/BldRgstHubService/getBrTitleInfo',
} as const;

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export function normalizeKey(key: string): string {
  const k = key.trim();
  return k.includes('%') ? decodeURIComponent(k) : k;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class PublicDataClient {
  private last = 0;
  constructor(
    private readonly key: string,
    private readonly fetchImpl: FetchLike = fetch,
    private readonly minIntervalMs = 120, // 초당 호출 제한 대비
  ) {}

  /** 한 페이지 호출. 네트워크 오류·호출 제한(22,23)은 몇 번 다시 시도 */
  async page(url: string, params: Record<string, string | number>) {
    const qs = new URLSearchParams({ serviceKey: normalizeKey(this.key), ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])) });
    let lastErr: unknown;
    for (let attempt = 0; attempt < 4; attempt++) {
      const wait = this.last + this.minIntervalMs - Date.now();
      if (wait > 0) await sleep(wait);
      this.last = Date.now();
      try {
        const res = await this.fetchImpl(`${url}?${qs}`);
        const text = await res.text();
        if (!res.ok && !text.trim().startsWith('<') && !text.trim().startsWith('{')) {
          throw new PublicDataError(`HTTP ${res.status}`, String(res.status));
        }
        return parseResponse(text);
      } catch (e) {
        lastErr = e;
        const retryable = !(e instanceof PublicDataError) || ['22', '23', '500', '502', '503', '504'].includes(e.code);
        if (!retryable) throw e;
        await sleep(800 * (attempt + 1));
      }
    }
    throw lastErr;
  }

  /** 모든 페이지 */
  async all(url: string, params: Record<string, string | number>, rows = 1000): Promise<Item[]> {
    const out: Item[] = [];
    for (let pageNo = 1; pageNo < 200; pageNo++) {
      const p = await this.page(url, { ...params, pageNo, numOfRows: rows });
      out.push(...p.items);
      if (p.items.length < rows || out.length >= p.totalCount) break;
    }
    return out;
  }

  trades(lawdCd: string, ym: string) {
    return this.all(ENDPOINTS.aptTrade, { LAWD_CD: lawdCd, DEAL_YMD: ym });
  }
  rents(lawdCd: string, ym: string) {
    return this.all(ENDPOINTS.aptRent, { LAWD_CD: lawdCd, DEAL_YMD: ym });
  }
  aptList(sigunguCode: string) {
    return this.all(ENDPOINTS.aptListSigungu, { sigunguCode });
  }
  async kaptBasis(kaptCode: string) {
    return (await this.page(ENDPOINTS.kaptBasis, { kaptCode })).items[0] ?? null;
  }
  async kaptDetail(kaptCode: string) {
    return (await this.page(ENDPOINTS.kaptDetail, { kaptCode })).items[0] ?? null;
  }
  buildings(kind: 'recap' | 'title', p: { sigunguCd: string; bjdongCd: string; platGbCd: string; bun: string; ji: string }) {
    return this.all(kind === 'recap' ? ENDPOINTS.bldRecap : ENDPOINTS.bldTitle, { ...p }, 100);
  }
}

/** 오늘 기준 최근 n개월 'YYYYMM' (이번 달 포함) */
export function recentMonths(n: number, today = new Date()): string[] {
  const out: string[] = [];
  const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  for (let i = 0; i < n; i++) {
    out.push(`${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
    d.setUTCMonth(d.getUTCMonth() - 1);
  }
  return out;
}
