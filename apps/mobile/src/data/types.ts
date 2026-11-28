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
  location: LatLng | null;
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

export type AreaType = { exclusiveM2: number; supplyM2: number | null; households: number | null };

export type ParkingSource = 'kapt' | 'bldrgst';

/**
 * 출처별 주차대수.
 * - K-apt 상세정보: 지상(kaptdPcnt)·지하(kaptdPcntu)만 제공
 * - 건축물대장: 옥내/옥외 × 자주식/기계식 4구분 제공 (옥내≈지하, 옥외≈지상으로 표시)
 */
export type ParkingFact = {
  source: ParkingSource;
  sourceLabel: string;
  asOf: string;
  ground: number | null;
  underground: number | null;
  indoorSelf?: number | null;
  indoorMech?: number | null;
  outdoorSelf?: number | null;
  outdoorMech?: number | null;
};

export type ParkingReview = { score: number; comment: string; date: string };

export type ComplexDetail = ComplexSummary & {
  jibunAddress: string;
  dongCount: number | null;
  topFloor: number | null;
  builder: string | null;
  heating: string | null;
  hallType: string | null;
  far?: number | null; // 용적률(%)
  bcr?: number | null; // 건폐율(%)
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

/** 공유 매물 → 단지 후보 */
export type ComplexCandidate = {
  id: string;
  name: string;
  subtitle: string;
  location: LatLng | null;
  distanceM: number | null;
  score: number;
};

export type CandidateQuery = { name?: string | null; address?: string | null; dong?: string | null; near?: LatLng | null };

export type PostCategory = 'review' | 'pros_cons' | 'question';
export type BoardPost = {
  id: string;
  category: PostCategory;
  body: string;
  createdAt: string;
  nickname: string;
  authorId: string;
  residentVerified: boolean;
  mine: boolean;
  commentCount: number;
};
export type BoardComment = { id: string; body: string; createdAt: string; nickname: string; authorId: string; mine: boolean };
export type Me = { userId: string; nickname: string | null };
export type ExternalProvider = 'naver_blog' | 'naver_cafe' | 'kakao_blog' | 'kakao_cafe' | 'kakao_web' | 'youtube';
export type ExternalPostItem = { provider: ExternalProvider; title: string; summary: string; url: string; date: string | null; source: string; thumbnail: string | null };

/** 커뮤니티 (외부 글 모아보기 + 단지 게시판 + 주차 체감 평가) */
export interface CommunitySource {
  getExternalPosts(c: { id: string; name: string; regionName: string }, provider: ExternalProvider, sort: 'relevance' | 'date'): Promise<ExternalPostItem[]>;
  me(): Promise<Me | null>;
  signIn(nickname: string): Promise<Me>;
  listPosts(complexId: string): Promise<BoardPost[]>;
  createPost(input: { complexId: string; category: PostCategory; body: string; residentVerified: boolean }): Promise<void>;
  deletePost(id: string): Promise<void>;
  listComments(postId: string): Promise<BoardComment[]>;
  addComment(postId: string, body: string): Promise<void>;
  report(type: 'post' | 'comment', id: string, reason: string): Promise<void>;
  block(userId: string): Promise<void>;
  submitParkingReview(complexId: string, score: number, comment: string): Promise<void>;
}

export interface DataSource {
  readonly mode: 'mock' | 'supabase';
  getMapMarkers(bbox: BBox, mode: MapLevelMode, filters: ComplexFilters): Promise<MapMarker[]>;
  listComplexes(bbox: BBox | null, filters: ComplexFilters): Promise<ComplexSummary[]>;
  getComplexSummary(id: string): Promise<ComplexSummary | null>;
  getComplexDetail(id: string): Promise<ComplexDetail | null>;
  getTrades(id: string): Promise<Trade[]>;
  search(query: string): Promise<SearchResult[]>;
  getRegionSummaries(): Promise<RegionSummary[]>;
  /** 이름·주소·동으로 단지 후보 (점수 높은 순) */
  findCandidates(q: CandidateQuery): Promise<ComplexCandidate[]>;
  community: CommunitySource;
  /** 계산기 정책값 (DB policy_values). 없으면 null → 앱 기본값 */
  getPolicy(): Promise<{ value: Record<string, unknown>; effectiveFrom: string; verifiedAt: string | null } | null>;
  /** 푸시 토큰 등록·관심 단지 알림 구독 (실데이터 모드에서만) */
  registerPushToken(token: string, platform: string): Promise<void>;
  setTradeAlert(complexId: string, on: boolean): Promise<void>;
}
