/**
 * 공공데이터 원본 항목(Item) → DB 수집 함수(ingest_*)가 받는 행 모양으로 정리.
 * 필드 이름은 docs/DATA_SOURCES.md(공식 명세)와 같다.
 */
import type { Item } from './response.ts';

const s = (v: string | undefined) => {
  const t = (v ?? '').trim();
  return t === '' ? null : t;
};
/** "45,000" → 45000, 빈 값 → null */
export const int = (v: string | undefined): number | null => {
  const t = s(v)?.replace(/[,\s]/g, '');
  if (!t || !/^-?\d+(\.\d+)?$/.test(t)) return null;
  return Math.round(Number(t));
};
export const num = (v: string | undefined): number | null => {
  const t = s(v)?.replace(/[,\s]/g, '');
  return t && /^-?\d+(\.\d+)?$/.test(t) ? Number(t) : null;
};
/** 'YYYYMMDD' | 'YYYY-MM-DD' | 'YY.MM.DD' → 'YYYY-MM-DD' */
export function date(v: string | undefined): string | null {
  const t = s(v);
  if (!t) return null;
  let m = t.match(/^(\d{4})[-.]?(\d{2})[-.]?(\d{2})$/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = t.match(/^(\d{2})\.(\d{1,2})\.(\d{1,2})$/);
  if (m) return `20${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  return null;
}
const ymd = (y?: string, m?: string, d?: string) =>
  y && m && d ? `${y.trim()}-${m.trim().padStart(2, '0')}-${d.trim().padStart(2, '0')}` : null;

/** 간단한 문자열 해시 (원본 행 식별용, 충돌 확률 낮음) */
export function hashKey(parts: (string | number | null | undefined)[]): string {
  const str = parts.map((p) => String(p ?? '')).join('|');
  let h1 = 0x811c9dc5, h2 = 0x01000193;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619);
    h2 = Math.imul(h2 ^ c, 2246822519);
  }
  return (h1 >>> 0).toString(36) + (h2 >>> 0).toString(36) + ':' + str.length;
}

// ---------- 아파트 매매 (getRTMSDataSvcAptTradeDev) ----------
export function tradeRow(it: Item) {
  const deal_date = ymd(it.dealYear, it.dealMonth, it.dealDay);
  const exclusive_m2 = num(it.excluUseAr);
  const price = int(it.dealAmount);
  if (!deal_date || exclusive_m2 == null || price == null || !s(it.sggCd)) return null;
  return {
    // 해제 여부(cdealType)는 나중에 바뀔 수 있어 키에서 제외
    source_key: 'T' + hashKey([it.sggCd, it.umdCd, it.jibun, it.aptNm, it.aptDong, exclusive_m2, it.floor, deal_date, price]),
    apt_seq: s(it.aptSeq),
    sgg_cd: s(it.sggCd),
    umd_cd: s(it.umdCd),
    umd_nm: s(it.umdNm),
    apt_nm: s(it.aptNm),
    jibun: s(it.jibun),
    apt_dong: s(it.aptDong),
    exclusive_m2,
    floor: int(it.floor),
    price,
    deal_date,
    build_year: int(it.buildYear),
    is_direct: (it.dealingGbn ?? '').includes('직거래'),
    canceled: (it.cdealType ?? '').trim().toUpperCase() === 'O',
    cancel_date: date(it.cdealDay),
  };
}

// ---------- 아파트 전월세 (getRTMSDataSvcAptRent) ----------
export function rentRow(it: Item) {
  const deal_date = ymd(it.dealYear, it.dealMonth, it.dealDay);
  const exclusive_m2 = num(it.excluUseAr);
  const deposit = int(it.deposit);
  if (!deal_date || exclusive_m2 == null || deposit == null || !s(it.sggCd)) return null;
  const monthly_rent = int(it.monthlyRent) ?? 0;
  const rr = s(it.useRRRight);
  return {
    source_key: 'R' + hashKey([it.sggCd, it.umdNm, it.jibun, it.aptNm, exclusive_m2, it.floor, deal_date, deposit, monthly_rent, it.contractTerm]),
    sgg_cd: s(it.sggCd),
    umd_nm: s(it.umdNm),
    apt_nm: s(it.aptNm),
    jibun: s(it.jibun),
    exclusive_m2,
    floor: int(it.floor),
    deposit,
    monthly_rent,
    deal_date,
    build_year: int(it.buildYear),
    contract_term: s(it.contractTerm),
    contract_type: s(it.contractType),
    renew_used: rr == null ? null : rr === '사용',
    pre_deposit: int(it.preDeposit),
    pre_monthly_rent: int(it.preMonthlyRent),
  };
}

// ---------- 단지 목록 (getSigunguAptList4) ----------
export function aptListRow(it: Item) {
  if (!s(it.kaptCode)) return null;
  return {
    kapt_code: s(it.kaptCode),
    name: s(it.kaptName),
    bjdong_code: s(it.bjdCode),
    sido: s(it.as1),
    sigungu: s(it.as2),
    dong: s(it.as3),
    ri: s(it.as4),
  };
}

/** "울산광역시 남구 삼산동 1234-5 삼산현대아파트" → "1234-5" (법정동 이름 뒤 첫 지번) */
export function jibunFromAddress(addr: string | null): string | null {
  if (!addr) return null;
  const tokens = addr.trim().split(/\s+/);
  const idx = tokens.findIndex((t) => /(동|가|리)$/.test(t) && !/^\d/.test(t));
  for (let i = Math.max(0, idx + 1); i < tokens.length; i++) {
    const t = tokens[i];
    if (/^산$/.test(t) && /^\d+(-\d+)?$/.test(tokens[i + 1] ?? '')) return `산 ${tokens[i + 1]}`;
    const m = t.match(/^(산)?(\d+(?:-\d+)?)(번지)?$/);
    if (m) return m[1] ? `산 ${m[2]}` : m[2];
  }
  return null;
}

// ---------- 공동주택 기본정보 (getAphusBassInfoV5) ----------
export function kaptBasisRow(it: Item) {
  if (!s(it.kaptCode)) return null;
  const addr = s(it.kaptAddr);
  return {
    kapt_code: s(it.kaptCode),
    name: s(it.kaptName),
    jibun_address: addr,
    jibun: jibunFromAddress(addr),
    road_address: s(it.doroJuso),
    bjdong_code: s(it.bjdCode),
    approved_date: date(it.kaptUsedate),
    households: int(it.kaptdaCnt),
    dong_count: int(it.kaptDongCnt),
    top_floor: int(it.kaptTopFloor) ?? int(it.ktownFlrNo),
    base_floor: int(it.kaptBaseFloor),
    builder: s(it.kaptBcompany),
    heating: s(it.codeHeatNm),
    hall_type: s(it.codeHallNm),
    mgmt_type: s(it.codeMgrNm),
    sale_type: s(it.codeSaleNm),
  };
}

// ---------- 공동주택 상세정보 (getAphusDtlInfoV5) ----------
export function kaptDetailRow(it: Item) {
  if (!s(it.kaptCode)) return null;
  return {
    kapt_code: s(it.kaptCode),
    parking_ground: int(it.kaptdPcnt), // 주차대수(지상)
    parking_under: int(it.kaptdPcntu), // 주차대수(지하)
    ev_ground: int(it.groundElChargerCnt),
    ev_under: int(it.undergroundElChargerCnt),
    bus_stop_distance: s(it.kaptdWtimebus),
  };
}

// ---------- 건축물대장 총괄표제부·표제부 (getBrRecapTitleInfo / getBrTitleInfo) ----------
export function buildingRow(it: Item, kind: 'recap' | 'title') {
  const pk = s(it.mgmBldrgstPk);
  const sgg = s(it.sigunguCd);
  const bjd = s(it.bjdongCd);
  if (!pk || !sgg || !bjd) return null;
  const land = String((int(it.platGbCd) ?? 0) + 1); // 건축물대장 0:대지 1:산 → PNU 1:일반 2:산
  const pnu = sgg + bjd + land + (s(it.bun) ?? '0').padStart(4, '0') + (s(it.ji) ?? '0').padStart(4, '0');
  return {
    mgm_bldrgst_pk: pk,
    kind,
    pnu,
    name: s(it.bldNm),
    dong_name: s(it.dongNm),
    main_purpose: s(it.mainPurpsCdNm),
    structure: s(it.strctCdNm),
    approved_date: date(it.useAprDay),
    ground_floors: int(it.grndFlrCnt),
    under_floors: int(it.ugrndFlrCnt),
    households: int(it.hhldCnt),
    far: num(it.vlRat),
    bcr: num(it.bcRat),
    indoor_self: int(it.indrAutoUtcnt),
    indoor_mech: int(it.indrMechUtcnt),
    outdoor_self: int(it.oudrAutoUtcnt),
    outdoor_mech: int(it.oudrMechUtcnt),
    raw: it,
  };
}

/** PNU 19자리 → 건축물대장 조회 파라미터 */
export function pnuToBuildingParams(pnu: string) {
  return {
    sigunguCd: pnu.slice(0, 5),
    bjdongCd: pnu.slice(5, 10),
    platGbCd: String(Number(pnu[10]) - 1),
    bun: pnu.slice(11, 15),
    ji: pnu.slice(15, 19),
  };
}

export const compact = <T>(arr: (T | null)[]) => arr.filter((x): x is T => x != null);
