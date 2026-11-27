/** 주차 계산. 앱·서버가 같은 규칙을 쓰도록 공용 패키지에 둔다. */

export type ParkingGrade = 'plenty' | 'normal' | 'short';

export const PARKING_GRADE_LABEL: Record<ParkingGrade, string> = {
  plenty: '여유',
  normal: '보통',
  short: '부족',
};

/** 세대당 주차대수 (소수점 둘째 자리 반올림). 세대수가 없으면 NaN. */
export function parkingPerHousehold(totalSpaces: number, households: number): number {
  if (!households || households <= 0) return NaN;
  return Math.round((totalSpaces / households) * 100) / 100;
}

/** 1.5 이상 여유 / 1.0 이상 1.5 미만 보통 / 1.0 미만 부족 */
export function parkingGrade(perHousehold: number): ParkingGrade | null {
  if (!Number.isFinite(perHousehold)) return null;
  if (perHousehold >= 1.5) return 'plenty';
  if (perHousehold >= 1.0) return 'normal';
  return 'short';
}

/** 두 출처 값의 차이. 기준값(a) 대비 비율. 10% 이상이면 화면에 "출처 간 차이" 경고. */
export function compareParkingSources(a: number, b: number) {
  const diff = b - a;
  const ratio = a > 0 ? diff / a : NaN;
  return { diff, ratio, significant: Number.isFinite(ratio) && Math.abs(ratio) >= 0.1 };
}

export type ParkingBreakdown = {
  indoorSelf: number; // 옥내 자주식
  indoorMech: number; // 옥내 기계식
  outdoorSelf: number; // 옥외 자주식
  outdoorMech: number; // 옥외 기계식
};

/** 옥내=지하(지하주차장), 옥외=지상 으로 본다 (공동주택은 대부분 옥내 주차장이 지하) */
export function summarizeParking(b: ParkingBreakdown) {
  const indoor = b.indoorSelf + b.indoorMech;
  const outdoor = b.outdoorSelf + b.outdoorMech;
  const total = indoor + outdoor;
  const mech = b.indoorMech + b.outdoorMech;
  return {
    total,
    indoor,
    outdoor,
    indoorRatio: total ? indoor / total : NaN,
    mechanicalRatio: total ? mech / total : NaN,
  };
}

/** 같은 동네 순위 (값이 클수록 1위). 반환: { position, total } */
export function rankAmong(value: number, all: number[]) {
  const valid = all.filter((v) => Number.isFinite(v));
  return { position: valid.filter((v) => v > value).length + 1, total: valid.length };
}
