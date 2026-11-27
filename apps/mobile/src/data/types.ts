/**
 * 앱 화면이 보는 데이터 모양. 화면은 여기 타입과 DataSource 인터페이스만 안다.
 * 실제 구현은 data/mock (목업) 또는 data/supabase (4단계).
 */

/** 모든 수치는 출처·기준일과 함께 다닌다. */
export type Sourced<T> = { value: T; source: string; asOf: string };

export type LatLng = { lat: number; lng: number };
export type BBox = { sw: LatLng; ne: LatLng };

export type HouseType = 'apt' | 'officetel' | 'rowhouse';

export type ComplexSummary = {
  id: string;
  name: string;
  sigunguCode: string;
  dongName: string;
  roadAddress: string;
  location: LatLng;
  houseType: HouseType;
  approvedDate: string; // YYYY-MM-DD 사용승인일
  households: number;
  /** 대표 평형(전용 ㎡)의 최근 매매가(만원) */
  recentPrice: Sourced<number> | null;
  representativeM2: number;
  /** 전용 3.3㎡(1평)당 가격(만원) */
  pricePerPyeong: number | null;
  parkingPerHousehold: Sourced<number> | null;
};

export type ComplexFilters = {
  priceMin?: number; // 만원
  priceMax?: number;
  areaMin?: number; // 전용 ㎡
  areaMax?: number;
  builtAfter?: number; // 사용승인 연도
  householdsMin?: number;
  parkingMin?: number; // 세대당
};

export type MapLevelMode = 'sigungu' | 'dong' | 'complex';

export type MapMarker =
  | {
      kind: 'region';
      id: string;
      name: string;
      location: LatLng;
      count: number;
      avgPricePerPyeong: number | null;
    }
  | {
      kind: 'complex';
      id: string;
      name: string;
      location: LatLng;
      recentPrice: number | null;
      pricePerPyeong: number | null;
    };

export type SearchResult =
  | { kind: 'complex'; id: string; title: string; subtitle: string; location: LatLng }
  | { kind: 'dong'; id: string; title: string; subtitle: string; location: LatLng }
  | { kind: 'address'; id: string; title: string; subtitle: string; location: LatLng };

export type RegionSummary = {
  sigunguCode: string;
  name: string;
  monthlyTrades: number;
  avgPricePerPyeong: number;
  asOf: string;
  source: string;
};

export type DealType = 'sale' | 'jeonse' | 'monthly';

export type Trade = {
  id: string;
  dealType: DealType;
  date: string; // 계약일 YYYY-MM-DD
  floor: number;
  exclusiveM2: number;
  /** 매매가, 또는 전세·월세 보증금 (만원) */
  price: number;
  monthlyRent?: number; // 월세 (만원)
  isDirect: boolean; // 직거래 여부
  canceled: boolean; // 해제(취소) 여부
};

export type AreaType = { exclusiveM2: number; supplyM2: number; households: number };

export type ParkingSource = 'kapt' | 'bldrgst';

export type ParkingFact = {
  source: ParkingSource;
  sourceLabel: string;
  asOf: string;
  indoorSelf: number;
  indoorMech: number;
  outdoorSelf: number;
  outdoorMech: number;
};

export type ParkingReview = { score: number; comment: string; date: string };

export type ComplexDetail = ComplexSummary & {
  jibunAddress: string;
  dongCount: number;
  topFloor: number;
  builder: string;
  heating: string;
  hallType: string;
  areaTypes: AreaType[];
  /** 대표 평형 최근 전세가 */
  recentJeonse: Sourced<number> | null;
  parking: {
    facts: ParkingFact[]; // 출처별 값 (대표값은 facts[0])
    elevatorToUnderground: boolean | null;
    dongRank: { position: number; total: number; dongName: string };
    evChargers: Sourced<number> | null; // 반경 500m
    reviews: { average: number; count: number; recent: ParkingReview[] };
  };
};

export interface DataSource {
  readonly mode: 'mock' | 'supabase';
  getMapMarkers(bbox: BBox, mode: MapLevelMode, filters: ComplexFilters): Promise<MapMarker[]>;
  listComplexes(bbox: BBox | null, filters: ComplexFilters): Promise<ComplexSummary[]>;
  getComplexSummary(id: string): Promise<ComplexSummary | null>;
  getComplexDetail(id: string): Promise<ComplexDetail | null>;
  getTrades(id: string): Promise<Trade[]>;
  search(query: string): Promise<SearchResult[]>;
  getRegionSummaries(): Promise<RegionSummary[]>;
}
