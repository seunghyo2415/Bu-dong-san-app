/**
 * 커뮤니티 공용 규칙: 개인정보 가리기, 금칙어, 광고성 글 거르기, 외부 글 정리, 장단점 키워드.
 * 서버(DB 트리거)에도 같은 규칙이 있다 — 앱에서 먼저 보여 주고, 서버에서 한 번 더 확인.
 */

/** 전화번호·이메일·주민번호 형태를 가린다 */
export function maskPersonalInfo(text: string): string {
  return text
    .replace(/\b(\d{6})[-\s]?([1-4])\d{6}\b/g, '$1-$2******') // 주민등록번호
    .replace(/(01[016789])[-.\s]?(\d{3,4})[-.\s]?(\d{4})/g, '$1-****-****') // 휴대폰
    .replace(/\b(0\d{1,2})[-.)\s](\d{3,4})[-.\s](\d{4})\b/g, '$1-****-****') // 일반전화
    .replace(/([A-Za-z0-9._%+-])[A-Za-z0-9._%+-]*@([A-Za-z0-9.-]+\.[A-Za-z]{2,})/g, '$1***@$2'); // 이메일
}

/** 금칙어를 *** 로 */
export function maskBannedWords(text: string, words: string[]): string {
  let out = text;
  for (const w of words) {
    if (!w) continue;
    out = out.split(w).join('*'.repeat(Math.max(2, w.length)));
  }
  return out;
}

export const DEFAULT_BANNED_WORDS = ['씨발', '시발', '개새끼', '병신', '좆', '꺼져', '죽어라'];

/** 광고·홍보성 글로 보이는 단서 (제목·요약 기준) */
const AD_HINTS = ['체험단', '협찬', '원고료', '소정의', '제공받아', '제공 받아', '광고', '홍보관', '모델하우스', '분양상담', '분양 상담', '특별공급', '선착순', '상담문의', '상담 문의', '대출상담', '이벤트', '파격', '할인분양', '잔여세대', '무료상담'];

export function isAdLikely(title: string, summary = ''): boolean {
  const t = `${title} ${summary}`.replace(/\s+/g, ' ');
  return AD_HINTS.some((h) => t.includes(h));
}

export type ExternalProvider = 'naver_blog' | 'naver_cafe' | 'kakao_blog' | 'kakao_cafe' | 'kakao_web' | 'youtube';

export type ExternalPost = {
  provider: ExternalProvider;
  title: string;
  summary: string; // 짧은 요약만 (본문 복사 금지)
  url: string;
  date: string | null; // YYYY-MM-DD
  source: string; // 블로그·카페·채널 이름
  thumbnail?: string | null;
  isAd: boolean;
};

/** HTML 태그·엔티티 제거, 길이 제한 */
export function plainText(s: string | null | undefined, max = 120): string {
  const t = (s ?? '')
    .replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
  return t.length > max ? t.slice(0, max - 1) + '…' : t;
}

/** '20261105' | '2026-11-05T12:00:00.000+09:00' → '2026-11-05' */
export function toDate(s: string | null | undefined): string | null {
  if (!s) return null;
  const m = s.match(/^(\d{4})-?(\d{2})-?(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

/** 검색어: "단지명 + 지역" (예: "삼산 푸르지오 울산 남구") */
export function communityQuery(complexName: string, regionName?: string | null) {
  return [complexName.replace(/\(.*?\)/g, '').trim(), regionName ? `울산 ${regionName}` : '울산'].join(' ');
}

/** 제목·요약에서 자주 나오는 장점/단점 단어 (규칙 기반, 참고용) */
const PROS: Record<string, string[]> = {
  학군: ['학군', '학원가', '초품아', '학교 가까', '통학'],
  교통: ['역세권', '교통 편', '버스 많', '교통이 좋'],
  신축: ['신축', '새 아파트', '깔끔'],
  주차여유: ['주차 넉넉', '주차 여유', '주차 편', '지하주차장 연결'],
  조용함: ['조용', '한적'],
  공원: ['공원', '산책', '숲세권'],
  편의시설: ['마트', '편의시설', '상권', '병원 가까'],
  뷰: ['뷰', '조망', '전망', '탁 트인'],
};
const CONS: Record<string, string[]> = {
  주차부족: ['주차 부족', '주차난', '이중주차', '주차 전쟁', '주차 힘'],
  노후: ['노후', '오래된', '녹물', '리모델링'],
  소음: ['소음', '시끄러', '층간'],
  경사: ['언덕', '경사', '오르막'],
  냄새: ['냄새', '악취'],
  공단인접: ['공단', '공장 가까', '미세먼지', '화학'],
  교통불편: ['교통 불편', '버스 없', '외진'],
};

export function keywordStats(texts: string[]): { pros: { word: string; count: number }[]; cons: { word: string; count: number }[] } {
  const count = (dict: Record<string, string[]>) =>
    Object.entries(dict)
      .map(([word, hints]) => ({ word, count: texts.filter((t) => hints.some((h) => t.includes(h))).length }))
      .filter((x) => x.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  return { pros: count(PROS), cons: count(CONS) };
}
