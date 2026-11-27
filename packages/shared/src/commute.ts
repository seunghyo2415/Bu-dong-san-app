/**
 * 통근버스 노선표 해석 (사용자가 앱에서 불러온 파일, 폰 안에서만 처리).
 *
 * 지원 형식
 *  A) 노선도 표 형식: 머리글에 "지역 · 노선 · 출근(1조/2조) · 운행노선" 이 있고,
 *     운행노선 칸에 "정류장1-정류장2-…-회사" 처럼 '-' 로 이어진 경로가 적힌 표.
 *     병합된 칸(빈 칸)은 위 행의 값을 이어받는다.
 *  B) 간단 CSV: 노선명,순번,정류장명,1조시간,2조시간 (첫 줄 머리글)
 */

export type CommuteDeparture = { boardAt: string; shift1: string | null; shift2: string | null };
export type CommuteRoute = {
  id: string;
  region: string;
  stops: string[]; // 순서대로, 마지막은 보통 '회사'
  departures: CommuteDeparture[];
};

const clean = (v: unknown) => {
  if (v == null) return '';
  return String(v).replace(/\s+/g, ' ').trim();
};
const timeOf = (v: unknown): string | null => {
  // 엑셀이 시간을 하루의 비율(0.2257… = 05:25)로 저장한 경우
  if (typeof v === 'number' && v > 0 && v < 1) {
    const mins = Math.round(v * 24 * 60);
    return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
  }
  const t = clean(v);
  if (!t) return null;
  const m = t.match(/(\d{1,2}):(\d{2})/);
  return m ? `${m[1].padStart(2, '0')}:${m[2]}${t.replace(m[0], '').trim() ? ` (${t.replace(m[0], '').replace(/[()]/g, '').trim()})` : ''}` : t;
};

/** "A-B - C-회사 " → ['A','B','C','회사'] (괄호 안의 '-' 는 나누지 않음) */
export function splitPath(path: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = '';
  for (const ch of path) {
    if (ch === '(') depth++;
    if (ch === ')') depth = Math.max(0, depth - 1);
    if (ch === '-' && depth === 0) {
      if (cur.trim()) out.push(cur.trim());
      cur = '';
    } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out.map((s) => s.replace(/\s+/g, ' '));
}

function findHeader(rows: unknown[][]) {
  for (let r = 0; r < Math.min(rows.length, 15); r++) {
    const cells = rows[r].map(clean);
    const pathCol = cells.findIndex((c) => c.replace(/\s/g, '').includes('운행노선'));
    if (pathCol >= 0) return { row: r, pathCol };
  }
  return null;
}

/** 형식 A: 2차원 셀 배열(엑셀 시트) → 노선 목록 */
export function parseRouteTable(rows: unknown[][]): CommuteRoute[] {
  const h = findHeader(rows);
  if (!h) return [];
  const routes = new Map<string, CommuteRoute>();
  let region = '';
  let path = '';
  let boardAt = '';
  for (let r = h.row + 1; r < rows.length; r++) {
    const row = rows[r] ?? [];
    const [a, b, c, d] = [row[0], row[1], row[2], row[3]].map(clean);
    const e = clean(row[h.pathCol]);
    if (!a && !b && !c && !d && !e) continue;
    if (/^(조별구분|1조|2조)$/.test(c) && !b) continue; // 두 번째 머리글 줄
    if (a) region = a.replace(/\s/g, '');
    if (b) boardAt = b;
    if (e) path = e;
    if (!path || !(c || d)) continue;
    const key = `${region}|${path}`;
    let route = routes.get(key);
    if (!route) {
      route = { id: `r${routes.size + 1}`, region, stops: splitPath(path), departures: [] };
      routes.set(key, route);
    }
    route.departures.push({ boardAt: boardAt || route.stops[0], shift1: timeOf(row[2]), shift2: timeOf(row[3]) });
  }
  return [...routes.values()].filter((x) => x.stops.length >= 2);
}

/** 형식 B: CSV 문자열 (노선명,순번,정류장명,1조,2조) */
export function parseRouteCsv(csv: string): CommuteRoute[] {
  const lines = csv.replace(/^﻿/, '').split(/\r?\n/).map((l) => l.split(',').map((x) => x.trim()));
  const body = lines.slice(1).filter((l) => l.length >= 3 && l[0] && l[2]);
  const byRoute = new Map<string, { seq: number; stop: string; t1: string; t2: string }[]>();
  for (const [name, seq, stop, t1 = '', t2 = ''] of body) {
    const arr = byRoute.get(name) ?? [];
    arr.push({ seq: Number(seq) || arr.length + 1, stop, t1, t2 });
    byRoute.set(name, arr);
  }
  return [...byRoute.entries()].map(([name, arr], i) => {
    arr.sort((a, b) => a.seq - b.seq);
    return {
      id: `c${i + 1}`,
      region: name,
      stops: arr.map((x) => x.stop),
      departures: [{ boardAt: arr[0].stop, shift1: timeOf(arr[0].t1), shift2: timeOf(arr[0].t2) }],
    };
  });
}

export const CSV_TEMPLATE = '노선명,순번,정류장명,1조 출발시간,2조 출발시간\n무거,1,문수중학교 입구,05:25,14:10\n무거,2,삼호교입구,,\n무거,3,회사,,\n';

/** 모든 정류장 이름 (중복 제거, '회사' 제외) */
export function uniqueStops(routes: CommuteRoute[], companyWord = '회사'): string[] {
  return [...new Set(routes.flatMap((r) => r.stops).filter((s) => s !== companyWord))];
}

// ---------- 거리 ----------
export type LatLngLike = { lat: number; lng: number };

/** 두 좌표 사이 직선거리 (m) */
export function haversineM(a: LatLngLike, b: LatLngLike): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** 도보 시간(분): 직선거리 × 1.3(길 굽음 보정) ÷ 분당 67m. 참고용 */
export function walkMinutes(meters: number): number {
  return Math.max(1, Math.round((meters * 1.3) / 67));
}

/** 자동차 시간 추정(분): 직선거리 × 1.4 ÷ 시속 30km. 실제 경로 조회가 없을 때만 */
export function driveMinutesEstimate(meters: number): number {
  return Math.max(1, Math.round((meters * 1.4) / (30000 / 60)));
}

export function formatDistance(m: number): string {
  return m < 1000 ? `${Math.round(m / 10) * 10}m` : `${(m / 1000).toFixed(1)}km`;
}

/** 가장 가까운 지점 */
export function nearest<T extends { location: LatLngLike | null }>(from: LatLngLike, items: T[]): (T & { distanceM: number }) | null {
  let best: (T & { distanceM: number }) | null = null;
  for (const it of items) {
    if (!it.location) continue;
    const d = haversineM(from, it.location);
    if (!best || d < best.distanceM) best = { ...it, distanceM: d };
  }
  return best;
}
