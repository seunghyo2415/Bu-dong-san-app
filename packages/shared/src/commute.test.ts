import { describe, expect, it } from 'vitest';

import { CSV_TEMPLATE, haversineM, isWaypoint, nearest, parseRouteCsv, parseRouteTable, parseStopLocationCsv, splitPath, stopSearchQueries, uniqueStops, walkMinutes } from './commute';

// ⚠️ 지어낸 예시 표 (실제 회사 노선표 아님) — 받은 형식의 구조만 흉내
const TABLE: unknown[][] = [
  ['통근버스 운행 현황 (예시)', null, null, null, null],
  [null, null, null, null, null],
  ['지 역', '노선', '출근', null, null, '노선'],
  [null, null, '조별구분', null, '운행노선'],
  [null, null, '1조', '2조', null],
  ['가나', ' 가나초 입구', '05:25', '14:10', '가나초 입구-다라은행-마바 정류장(사아 아파트)-회사', '가 나'],
  [null, ' 가나초 입구', '05:30', null, null],
  [null, ' 자차 아파트', '05:40', '14:15(B조)', '자차 아파트-마바 정류장(사아 아파트)-회사'],
  ['카타', ' 카타 종점', '05:35', '14:20', '카타 종점-파하 마트-회사'],
  [null, null, null, null, null],
];

describe('통근버스 노선표', () => {
  it('경로 나누기 (괄호 안 - 는 유지)', () => {
    expect(splitPath('A-B(1-2동)- C -회사')).toEqual(['A', 'B(1-2동)', 'C', '회사']);
  });
  it('병합 칸 이어받기·노선 묶기', () => {
    const routes = parseRouteTable(TABLE);
    expect(routes).toHaveLength(3);
    expect(routes[0].region).toBe('가나');
    expect(routes[0].stops).toEqual(['가나초 입구', '다라은행', '마바 정류장(사아 아파트)', '회사']);
    expect(routes[0].departures).toEqual([
      { boardAt: '가나초 입구', shift1: '05:25', shift2: '14:10' },
      { boardAt: '가나초 입구', shift1: '05:30', shift2: null },
    ]);
    expect(routes[1].departures[0].shift2).toBe('14:15 (B조)');
    expect(routes[2].region).toBe('카타');
    expect(uniqueStops(routes)).toHaveLength(6);
  });
  it('머리글이 없으면 빈 결과', () => {
    expect(parseRouteTable([['아무 표']])).toEqual([]);
  });
  it('CSV 템플릿', () => {
    const r = parseRouteCsv(CSV_TEMPLATE);
    expect(r).toHaveLength(1);
    expect(r[0].stops).toEqual(['문수중학교 입구', '삼호교입구', '회사']);
    expect(r[0].departures[0].shift1).toBe('05:25');
  });
});

describe('거리', () => {
  it('직선거리·도보', () => {
    const d = haversineM({ lat: 35.5405, lng: 129.3365 }, { lat: 35.5495, lng: 129.3365 });
    expect(d).toBeGreaterThan(990);
    expect(d).toBeLessThan(1010);
    expect(walkMinutes(500)).toBe(10);
  });
  it('가장 가까운 곳', () => {
    const n = nearest({ lat: 35.5, lng: 129.3 }, [
      { name: 'a', location: { lat: 35.6, lng: 129.3 } },
      { name: 'b', location: { lat: 35.501, lng: 129.3 } },
      { name: 'c', location: null },
    ]);
    expect(n?.name).toBe('b');
  });
});

describe('정류장 검색어·보정 파일', () => {
  it('꼬리말 제거·오타 교정·괄호 안 이름', () => {
    const q = stopSearchQueries('남운프라자 버스정류장(무거 위브자이)');
    expect(q).toContain('남운프라자');
    expect(q).toContain('무거 위브자이');
    expect(stopSearchQueries('양산 롯데케슬')).toContain('양산 롯데캐슬');
    expect(stopSearchQueries('우리은헹')).toContain('우리은행');
    expect(stopSearchQueries('가나 아파트 맞은편')).toContain('가나 아파트');
  });
  it('경유 도로는 정류장 아님', () => {
    expect(isWaypoint('(7번국도)')).toBe(true);
    expect(isWaypoint('마바 정류장(사아 아파트)')).toBe(false);
  });
  it('보정 파일 읽기 (따옴표 속 쉼표)', () => {
    const r = parseStopLocationCsv('\uFEFF정류장명,위도,경도,찾은 장소,상태\n"효성 1,2차 사이",35.6,129.4,어느 아파트,확인\n간판,35.5,129.3,,추정(앞뒤 정류장 중간)\n잘못된줄,abc,1');
    expect(r).toEqual([
      { name: '효성 1,2차 사이', lat: 35.6, lng: 129.4, place: '어느 아파트', estimated: false },
      { name: '간판', lat: 35.5, lng: 129.3, place: '', estimated: true },
    ]);
    expect(parseStopLocationCsv('노선명,순번,정류장명\n')).toEqual([]);
  });
});
