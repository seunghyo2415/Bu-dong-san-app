/**
 * ⚠️ 목업 데이터 — 단지명·가격·세대수·주차·거래 내역은 모두 지어낸 값입니다.
 * 동 이름과 대략적인 위치만 실제 울산 지명을 따랐습니다.
 */
import { latestTrade, parkingPerHousehold, pricePerPyeong, rankAmong, summarizeParking } from '@ulsan/shared';

import type { AreaType, ComplexDetail, ComplexSummary, ParkingFact, ParkingReview, Trade } from '../types';
import { seeded } from './seed';

type DongSeed = {
  sigunguCode: string;
  dongName: string;
  lat: number;
  lng: number;
  /** 평당가 기준값(만원) — 동네 시세 차이를 흉내 냄 */
  basePyeong: number;
  names: string[];
};

export const MOCK_DONGS: DongSeed[] = [
  { sigunguCode: '31140', dongName: '삼산동', lat: 35.5405, lng: 129.3365, basePyeong: 1250, names: ['삼산 한빛타운', '삼산 하늘채움', '삼산 중앙파크'] },
  { sigunguCode: '31140', dongName: '신정동', lat: 35.5352, lng: 129.3125, basePyeong: 1350, names: ['신정 문수뜰', '신정 푸른숲', '신정 해오름'] },
  { sigunguCode: '31140', dongName: '옥동', lat: 35.5332, lng: 129.2965, basePyeong: 1550, names: ['옥동 학마을', '옥동 숲속정원', '옥동 대공원뷰'] },
  { sigunguCode: '31140', dongName: '무거동', lat: 35.5478, lng: 129.2645, basePyeong: 1150, names: ['무거 강변마을', '무거 새터'] },
  { sigunguCode: '31140', dongName: '야음동', lat: 35.5225, lng: 129.3335, basePyeong: 1050, names: ['야음 장미마을', '야음 새솔'] },
  { sigunguCode: '31140', dongName: '달동', lat: 35.5312, lng: 129.3272, basePyeong: 1200, names: ['달동 보름달', '달동 중앙하이츠'] },
  { sigunguCode: '31110', dongName: '우정동', lat: 35.5555, lng: 129.3118, basePyeong: 1300, names: ['혁신 이음마을', '우정 동산'] },
  { sigunguCode: '31110', dongName: '태화동', lat: 35.5532, lng: 129.2998, basePyeong: 1400, names: ['태화 리버뜰', '태화 국가정원뷰'] },
  { sigunguCode: '31110', dongName: '성안동', lat: 35.5745, lng: 129.3165, basePyeong: 900, names: ['성안 솔바람'] },
  { sigunguCode: '31110', dongName: '복산동', lat: 35.5628, lng: 129.3262, basePyeong: 950, names: ['복산 새뜰', '복산 해마루'] },
  { sigunguCode: '31170', dongName: '전하동', lat: 35.5122, lng: 129.4248, basePyeong: 1000, names: ['전하 바다뜰', '전하 일산뷰'] },
  { sigunguCode: '31170', dongName: '화정동', lat: 35.4975, lng: 129.4175, basePyeong: 850, names: ['화정 대왕마을'] },
  { sigunguCode: '31170', dongName: '서부동', lat: 35.5268, lng: 129.4302, basePyeong: 800, names: ['서부 동백'] },
  { sigunguCode: '31200', dongName: '송정동', lat: 35.5968, lng: 129.3602, basePyeong: 1150, names: ['송정 새봄', '송정 박상진숲'] },
  { sigunguCode: '31200', dongName: '매곡동', lat: 35.6332, lng: 129.3538, basePyeong: 950, names: ['매곡 들꽃마을', '매곡 산업로뷰'] },
  { sigunguCode: '31200', dongName: '천곡동', lat: 35.6168, lng: 129.3492, basePyeong: 900, names: ['천곡 냇가마을', '천곡 달빛'] },
  { sigunguCode: '31200', dongName: '산하동', lat: 35.6185, lng: 129.4532, basePyeong: 1050, names: ['강동 파도소리', '강동 몽돌'] },
  { sigunguCode: '31710', dongName: '범서읍', lat: 35.5672, lng: 129.2482, basePyeong: 1000, names: ['구영 강마을', '천상 산들', '굴화 맑은샘'] },
  { sigunguCode: '31710', dongName: '언양읍', lat: 35.5652, lng: 129.1242, basePyeong: 750, names: ['언양 알프스', '언양 반구대'] },
  { sigunguCode: '31710', dongName: '온양읍', lat: 35.4205, lng: 129.2872, basePyeong: 700, names: ['남창 옹기마을'] },
];

const AREAS: { exclusive: number; supply: number }[] = [
  { exclusive: 59.98, supply: 80.12 },
  { exclusive: 74.95, supply: 99.3 },
  { exclusive: 84.97, supply: 112.4 },
  { exclusive: 101.88, supply: 132.5 },
  { exclusive: 114.7, supply: 148.8 },
];
const BUILDERS = ['한울건설(가상)', '새봄건설(가상)', '바다산업개발(가상)', '푸른종합건설(가상)', '태화주택(가상)'];
const REVIEW_TEXT: Record<number, string[]> = {
  1: ['퇴근하고 오면 이중주차가 기본이에요', '저녁 7시 넘으면 자리 찾기 힘듭니다'],
  2: ['지상은 꽉 차고 지하 끝까지 가야 해요', '방문 차량 많으면 이중주차'],
  3: ['늦게 오면 좀 돌아야 하지만 자리는 있어요', '평일 저녁은 무난한 편'],
  4: ['지하 연결이 잘 돼 있어 편해요', '밤 10시에도 자리 있음'],
  5: ['주차 걱정은 안 해봤어요', '세대당 2대도 여유 있어요'],
};

export const MOCK_AS_OF = '2026-11-20';
export const MOCK_SOURCE = '목업 데이터';
const START = { y: 2021, m: 11 };
const END = { y: 2026, m: 11 };

/** 가상의 울산 아파트 시세 흐름 */
function marketIndex(y: number, m: number): number {
  const t = (y - 2021) * 12 + (m - 1); // 2021-01 = 0
  const pts: [number, number][] = [
    [0, 0.85],
    [11, 1.0],
    [17, 1.03],
    [29, 0.86],
    [47, 0.9],
    [70, 0.98],
  ];
  for (let i = 1; i < pts.length; i++) {
    const [t0, v0] = pts[i - 1];
    const [t1, v1] = pts[i];
    if (t <= t1) return v0 + ((v1 - v0) * (t - t0)) / (t1 - t0);
  }
  return pts[pts.length - 1][1];
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

const round50 = (n: number) => Math.round(n / 50) * 50;
const pad = (n: number) => String(n).padStart(2, '0');

function genTrades(id: string, areas: AreaType[], perM2Now: number, jeonseBase: number, topFloor: number): Trade[] {
  const rand = seeded(hash(id + ':trades'));
  const nowIdx = marketIndex(END.y, END.m);
  const out: Trade[] = [];
  let n = 0;
  for (let y = START.y, m = START.m; y < END.y || (y === END.y && m <= END.m); ) {
    const idx = marketIndex(y, m) / nowIdx;
    const maxDay = y === END.y && m === END.m ? 20 : 28;
    for (const a of areas) {
      const weight = Math.min(1.6, a.households / 300);
      for (const dealType of ['sale', 'jeonse', 'monthly'] as const) {
        const p = dealType === 'sale' ? 0.45 : dealType === 'jeonse' ? 0.35 : 0.12;
        let count = 0;
        if (rand() < p * weight) count++;
        if (rand() < p * weight * 0.3) count++;
        for (let k = 0; k < count; k++) {
          const floor = 1 + Math.floor(rand() * topFloor);
          const floorFactor = floor <= 2 ? 0.93 : floor >= topFloor - 1 ? 0.97 : 1;
          const sale = perM2Now * a.exclusiveM2 * idx * floorFactor * (0.95 + rand() * 0.1);
          const ratio = jeonseBase + (rand() - 0.5) * 0.06;
          const base = {
            id: `${id}-${n++}`,
            date: `${y}-${pad(m)}-${pad(1 + Math.floor(rand() * maxDay))}`,
            floor,
            exclusiveM2: a.exclusiveM2,
            isDirect: rand() < 0.07,
            canceled: rand() < 0.03,
          };
          if (dealType === 'sale') out.push({ ...base, dealType, price: round50(sale) });
          else if (dealType === 'jeonse') out.push({ ...base, dealType, price: round50(sale * ratio) });
          else {
            const deposit = [1000, 2000, 3000, 5000][Math.floor(rand() * 4)];
            out.push({ ...base, dealType, price: deposit, monthlyRent: Math.max(20, Math.round((sale * ratio - deposit) * 0.004)) });
          }
        }
      }
    }
    if (m === 12) {
      y++;
      m = 1;
    } else m++;
  }
  return out.sort((a, b) => b.date.localeCompare(a.date));
}

function build() {
  const rand = seeded(20261127);
  const details: ComplexDetail[] = [];
  const trades = new Map<string, Trade[]>();

  MOCK_DONGS.forEach((d, di) => {
    d.names.forEach((name, ni) => {
      const id = `mock-${pad(di)}${ni}`;
      const year = 1993 + Math.floor(rand() * 32);
      const age = 2026 - year;
      const households = 150 + Math.floor(rand() * 18) * 60;
      const repIdx = Math.floor(rand() * AREAS.length);
      const topFloor = year >= 2010 ? 20 + Math.floor(rand() * 16) : 10 + Math.floor(rand() * 16);

      // 평형 구성: 대표 평형 + 이웃 평형 1~2개
      const idxs = [...new Set([repIdx, Math.max(0, repIdx - 1), Math.min(AREAS.length - 1, repIdx + (rand() < 0.5 ? 1 : 0))])].sort();
      const shares = idxs.map((i) => (i === repIdx ? 2 : 1));
      const shareSum = shares.reduce((a, b) => a + b, 0);
      const areaTypes: AreaType[] = idxs.map((i, k) => ({
        exclusiveM2: AREAS[i].exclusive,
        supplyM2: AREAS[i].supply,
        households: Math.round((households * shares[k]) / shareSum),
      }));
      const representativeM2 = AREAS[repIdx].exclusive;

      // 신축일수록 비싸게
      const agePenalty = Math.max(0.55, 1 - age * 0.015);
      const pyeongPrice = d.basePyeong * agePenalty * (0.85 + rand() * 0.35);
      const perM2 = pyeongPrice * 0.3025;
      const jeonseBase = 0.62 + rand() * 0.16;

      // 주차: 신축일수록 많고 지하 비율 높음, 오래된 단지는 기계식 섞임
      const parkingRatio = year >= 2010 ? 1.2 + rand() * 0.7 : year >= 2000 ? 0.9 + rand() * 0.5 : 0.5 + rand() * 0.55;
      const total = Math.round(households * parkingRatio);
      const indoorShare = year >= 2010 ? 0.88 + rand() * 0.1 : year >= 2000 ? 0.5 + rand() * 0.3 : 0.1 + rand() * 0.3;
      const mechShare = year < 2005 && rand() < 0.35 ? 0.1 + rand() * 0.2 : 0;
      const indoor = Math.round(total * indoorShare);
      const indoorMech = Math.round(indoor * mechShare);
      const kapt: ParkingFact = {
        source: 'kapt',
        sourceLabel: '공동주택 상세정보(K-apt) · 목업',
        asOf: MOCK_AS_OF,
        indoorSelf: indoor - indoorMech,
        indoorMech,
        outdoorSelf: total - indoor,
        outdoorMech: 0,
      };
      // 건축물대장은 가끔 값이 다름 (기준 시점·집계 방식 차이 흉내)
      const drift = rand() < 0.3 ? 0.85 + rand() * 0.1 : 1;
      const bldrgst: ParkingFact = {
        source: 'bldrgst',
        sourceLabel: '건축물대장 총괄표제부 · 목업',
        asOf: '2026-10-31',
        indoorSelf: Math.round(kapt.indoorSelf * drift),
        indoorMech: kapt.indoorMech,
        outdoorSelf: Math.round(kapt.outdoorSelf * drift),
        outdoorMech: 0,
      };

      const tradeList = genTrades(id, areaTypes, perM2, jeonseBase, topFloor);
      trades.set(id, tradeList);
      const repSales = tradeList.filter((t) => t.dealType === 'sale' && t.exclusiveM2 === representativeM2);
      const repJeonse = tradeList.filter((t) => t.dealType === 'jeonse' && t.exclusiveM2 === representativeM2);
      const lastSale = latestTrade(repSales);
      const lastJeonse = latestTrade(repJeonse);

      const reviewCount = Math.floor(rand() * 14);
      const avgScore = Math.min(5, Math.max(1, parkingRatio * 2.6 + (rand() - 0.5)));
      const recent: ParkingReview[] = Array.from({ length: Math.min(3, reviewCount) }, (_, k) => {
        const s = Math.min(5, Math.max(1, Math.round(avgScore + (rand() - 0.5) * 1.5)));
        return { score: s, comment: REVIEW_TEXT[s][k % 2], date: `2026-${pad(11 - k * 2)}-${pad(3 + k * 7)}` };
      });

      const perHousehold = parkingPerHousehold(summarizeParking(kapt).total, households);
      details.push({
        id,
        name,
        sigunguCode: d.sigunguCode,
        dongName: d.dongName,
        roadAddress: `울산 ${d.dongName} (목업 주소 ${ni + 1})`,
        jibunAddress: `울산 ${d.dongName} ${100 + di * 10 + ni}-${ni + 1} (목업)`,
        location: { lat: d.lat + (rand() - 0.5) * 0.012, lng: d.lng + (rand() - 0.5) * 0.014 },
        houseType: 'apt',
        approvedDate: `${year}-${pad(1 + Math.floor(rand() * 12))}-15`,
        households,
        dongCount: Math.max(1, Math.round(households / (topFloor * 4))),
        topFloor,
        builder: BUILDERS[Math.floor(rand() * BUILDERS.length)],
        heating: year >= 2000 ? '개별난방(도시가스)' : rand() < 0.5 ? '중앙난방' : '지역난방',
        hallType: year >= 2000 ? '계단식' : rand() < 0.6 ? '복도식' : '혼합식',
        areaTypes,
        representativeM2,
        recentPrice: lastSale ? { value: lastSale.price, source: `${MOCK_SOURCE} (${lastSale.date} 거래)`, asOf: MOCK_AS_OF } : null,
        recentJeonse: lastJeonse ? { value: lastJeonse.price, source: `${MOCK_SOURCE} (${lastJeonse.date} 거래)`, asOf: MOCK_AS_OF } : null,
        pricePerPyeong: lastSale ? pricePerPyeong(lastSale.price, representativeM2) : null,
        parkingPerHousehold: { value: perHousehold, source: kapt.sourceLabel, asOf: kapt.asOf },
        parking: {
          facts: [kapt, bldrgst],
          elevatorToUnderground: year >= 2005 ? true : indoorShare > 0.4 ? null : false,
          dongRank: { position: 0, total: 0, dongName: d.dongName }, // 아래에서 채움
          evChargers: { value: year >= 2015 ? 4 + Math.floor(rand() * 20) : Math.floor(rand() * 5), source: '한국환경공단 충전소 정보 · 목업', asOf: MOCK_AS_OF },
          reviews: { average: Math.round(avgScore * 10) / 10, count: reviewCount, recent: reviewCount ? recent : [] },
        },
      });
    });
  });

  // 같은 동네(동·읍) 안 세대당 주차 순위
  for (const c of details) {
    const same = details.filter((x) => x.dongName === c.dongName).map((x) => x.parkingPerHousehold?.value ?? NaN);
    c.parking.dongRank = { ...rankAmong(c.parkingPerHousehold?.value ?? NaN, same), dongName: c.dongName };
  }
  return { details, trades };
}

const built = build();

export const MOCK_DETAILS: ComplexDetail[] = built.details;
export const MOCK_TRADES: Map<string, Trade[]> = built.trades;

/** 목록·지도용 요약 */
export const MOCK_COMPLEXES: ComplexSummary[] = MOCK_DETAILS.map((d) => ({
  id: d.id,
  name: d.name,
  sigunguCode: d.sigunguCode,
  dongName: d.dongName,
  roadAddress: d.roadAddress,
  location: d.location,
  houseType: d.houseType,
  approvedDate: d.approvedDate,
  households: d.households,
  recentPrice: d.recentPrice,
  representativeM2: d.representativeM2,
  pricePerPyeong: d.pricePerPyeong,
  parkingPerHousehold: d.parkingPerHousehold,
}));
