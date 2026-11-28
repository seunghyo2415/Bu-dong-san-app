/**
 * 공유된 글(당근마켓 등)에서 매물 정보를 뽑는다. 실패해도 예외 없이 null 로 채운다.
 * 당근마켓 공식 API 는 없으므로, 사용자가 공유한 글과 그 링크의 공개 미리보기(OG 태그)만 쓴다.
 */
import { PYEONG_PER_M2 } from './format';

export type ShareDealType = 'sale' | 'jeonse' | 'monthly';

export type ParsedShare = {
  url: string | null;
  text: string;
  dealType: ShareDealType | null;
  /** 매매가 또는 보증금 (만원) */
  price: number | null;
  monthlyRent: number | null;
  /** 전용면적 추정(㎡). 평으로만 적힌 경우 areaFromPyeong = true */
  areaM2: number | null;
  areaFromPyeong: boolean;
  floor: number | null;
  /** 도로명·지번 주소 (찾은 경우) */
  address: string | null;
  /** 단지·건물 이름 (찾은 경우) */
  complexName: string | null;
  /** 동·읍·면 이름 (예: 삼산동) */
  dongName: string | null;
};

const URL_RE = /https?:\/\/[^\s<>"')]+/i;
const SIGUNGU = '(?:중구|남구|동구|북구|울주군)';
const BRANDS = [
  '아파트', 'APT', '빌라', '오피스텔', '맨션', '타운', '파크', '하이츠', '캐슬', '자이', '푸르지오', '힐스테이트', '아이파크',
  '래미안', '편한세상', '롯데캐슬', '센트럴', '더샵', '해링턴', '스위첸', '위브', 'SK뷰', '하늘채', '한신휴', '에일린의뜰',
  '풍경채', '베르디움', '유보라', '하우스디', '리슈빌', '메르디앙', '코아루', '골드클래스', '로얄듀크', '서희스타힐스', '엠코타운',
  '두산위브', '꿈에그린', '어울림', '데시앙', '이편한세상', '우방', '현대', '주공', '한라', '삼성', '쌍용', '대림', '경남', '극동', '신천지',
  // 울산에 많은 브랜드
  '휴포레', '협성', '인벤스', '예가', '루첸', '아이유쉘', '로얄듀크', '비발디', '해모로', '스타힐스', '블루밍', '홈타운', '스위트',
  '리슈빌', '베르디움', '센텀', '휴먼시아', '노블리스', '엠코타운', '아이파크', '시티', '빌리지', '하이빌', '그린타운', '코오롱',
];
/** 단지 이름이 아닌 말 (면적·층·거래 표현만 있는 경우 버림) */
const NOT_NAME = /^(?:[가-힣]{1,4}(?:동|읍|면|리)\s*)?(?:\d+(?:\.\d+)?\s*(?:평|㎡|m²|층|억|만)\s*)*(?:아파트|APT|빌라|오피스텔|주택|매물)?$/i;

/** "3억 2,000만", "3억2천", "32,000만원", "3.2억", "8500만" → 만원 */
export function parseKoreanPrice(s: string): number | null {
  const t = s.replace(/\s+/g, '').replace(/원/g, '');
  let m = t.match(/(\d+(?:\.\d+)?)억(?:(\d{1,2}),?(\d{3})|(\d+)천|(\d+))?만?/);
  if (m) {
    let v = Number(m[1]) * 10000;
    if (m[2] != null && m[3] != null) v += Number(m[2] + m[3]);
    else if (m[4]) v += Number(m[4]) * 1000;
    else if (m[5]) v += Number(m[5]);
    return Math.round(v);
  }
  m = t.match(/(\d{1,3}(?:,\d{3})+|\d+)만/);
  if (m) return Number(m[1].replace(/,/g, ''));
  m = t.match(/(\d+)천만/);
  if (m) return Number(m[1]) * 1000;
  return null;
}

function findDeal(text: string): Pick<ParsedShare, 'dealType' | 'price' | 'monthlyRent'> {
  const t = text.replace(/\s+/g, ' ');
  // 월세: "월세 1000/50", "보증금 1000 월세 50", "월세 보증금 500만원 월 40만원"
  let m = t.match(/월세\s*(\d[\d,]*)\s*\/\s*(\d[\d,]*)/);
  if (m) return { dealType: 'monthly', price: Number(m[1].replace(/,/g, '')), monthlyRent: Number(m[2].replace(/,/g, '')) };
  m = t.match(/보증금\s*([\d억천만,.\s]+?원?)\s*[,·/]?\s*(?:월세|월)\s*(\d[\d,]*)\s*만?/);
  if (m) return { dealType: 'monthly', price: parseKoreanPrice(m[1]) ?? Number(m[1].replace(/\D/g, '')), monthlyRent: Number(m[2].replace(/,/g, '')) };
  // 전세·매매: 키워드 뒤 가격
  for (const [kw, type] of [['전세', 'jeonse'], ['매매', 'sale'], ['매도', 'sale'], ['급매', 'sale']] as const) {
    const i = t.indexOf(kw);
    if (i >= 0) {
      const price = parseKoreanPrice(t.slice(i + kw.length, i + kw.length + 20));
      if (price != null) return { dealType: type, price, monthlyRent: null };
    }
  }
  // 키워드 없이 "3억 2천" 만 있으면 매매로 추정하지 않고 가격만
  const price = parseKoreanPrice(t);
  return { dealType: null, price, monthlyRent: null };
}

function findArea(text: string): Pick<ParsedShare, 'areaM2' | 'areaFromPyeong'> {
  const m2 = text.match(/(?:전용\s*)?(\d{2,3}(?:\.\d+)?)\s*(?:㎡|m²|m2|제곱미터)/i);
  if (m2) return { areaM2: Number(m2[1]), areaFromPyeong: false };
  const py = text.match(/(\d{1,3}(?:\.\d+)?)\s*평/);
  if (py) return { areaM2: Math.round((Number(py[1]) / PYEONG_PER_M2) * 100) / 100, areaFromPyeong: true };
  return { areaM2: null, areaFromPyeong: false };
}

function findFloor(text: string): number | null {
  const m = text.match(/(?:^|[^\d])(\d{1,2})\s*(?:\/\s*\d{1,2}\s*)?층/);
  return m ? Number(m[1]) : null;
}

function findAddress(text: string): string | null {
  const road = text.match(new RegExp(`(?:울산(?:광역시)?\\s*)?${SIGUNGU}\\s*[가-힣0-9]+(?:로|길)\\s*\\d+(?:-\\d+)?`));
  if (road) return road[0].trim();
  const jibun = text.match(new RegExp(`(?:울산(?:광역시)?\\s*)?(?:${SIGUNGU}\\s*)?(?:[가-힣]+(?:읍|면)\\s*)?[가-힣0-9]+(?:동|리|가)\\s*(?:산\\s*)?\\d+(?:-\\d+)?(?![\\d.-])(?!\\s*(?:층|평|㎡|m|만|억|동|세대|년))`));
  if (jibun && /\d/.test(jibun[0])) return jibun[0].trim();
  return null;
}

function findDong(text: string): string | null {
  const m = text.match(/([가-힣]{1,5}(?:\d가|동|읍|면))(?=[\s,·)]|$)/);
  if (!m) return null;
  const d = m[1];
  return /^(아파트|단지|해당|같은|이)/.test(d) || /\d+동$/.test(d) ? null : d;
}

function findComplexName(text: string): string | null {
  const brand = BRANDS.map((b) => b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  // 브랜드 앞 한 단어(예: "옥동 학마을 아파트"의 "옥동")까지 포함하되, 거래 용어는 제외
  const re = new RegExp(`((?:[가-힣A-Za-z0-9]{1,10}\\s)?[가-힣A-Za-z0-9]{1,12}\\s?(?:${brand})[가-힣A-Za-z0-9]{0,8}(?:\\s?\\d+차)?)`, 'i');
  const cleaned = text.replace(/\[[^\]]*\]/g, ' ');
  // 여러 후보 중 면적·층 같은 말이 아닌 첫 번째
  for (const m of cleaned.matchAll(new RegExp(re.source, 'gi'))) {
    const name = m[1]
      .replace(/^(매매|전세|월세|급매|급전세|매도|팝니다|부동산|단지|단지명|아파트명|건물명?|위치|매물)\s/, '')
      .replace(/(매매|전세|월세|급매|팝니다|합니다)$/, '')
      .replace(/^\d+(?:\.\d+)?\s*(?:평|㎡|층)\s*/, '')
      .trim();
    if (name && !NOT_NAME.test(name)) return name;
  }
  return null;
}

export function parseSharedText(raw: string): ParsedShare {
  const text = (raw ?? '').trim();
  const urlMatch = text.match(URL_RE);
  const url = urlMatch ? urlMatch[0].replace(/[.,]+$/, '') : null;
  const body = url ? text.replace(url, ' ') : text;
  return {
    url,
    text,
    ...findDeal(body),
    ...findArea(body),
    floor: findFloor(body),
    address: findAddress(body),
    complexName: findComplexName(body),
    dongName: findDong(body),
  };
}

/** 두 결과 합치기: a 에 없는 값만 b 로 채움 (공유 글 + 링크 미리보기) */
export function mergeParsed(a: ParsedShare, b: ParsedShare): ParsedShare {
  const out = { ...a } as Record<string, unknown>;
  for (const [k, v] of Object.entries(b)) if (out[k] == null && v != null) out[k] = v;
  return out as ParsedShare;
}

/** OG 태그 HTML 에서 title / description / image 만 */
export function extractOgTags(html: string): { title: string | null; description: string | null; image: string | null } {
  const head = html.slice(0, 200_000);
  const meta = (prop: string) => {
    const re = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*>`, 'i');
    const tag = head.match(re)?.[0];
    const content = tag?.match(/content=["']([^"']*)["']/i)?.[1];
    return content ? decodeHtml(content).trim() || null : null;
  };
  const title = meta('og:title') ?? (head.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() || null);
  return { title: title ? decodeHtml(title) : null, description: meta('og:description') ?? meta('description'), image: meta('og:image') };
}

function decodeHtml(s: string) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
}

/** 공유 링크 미리보기를 읽어도 되는 사이트 (단건·공개 메타데이터만) */
export const OG_ALLOWED_HOSTS = ['daangn.com', 'www.daangn.com', 'daangn.page.link', 'karrot.page.link'];
export function isOgAllowed(url: string): boolean {
  try {
    const h = new URL(url).hostname.toLowerCase();
    return OG_ALLOWED_HOSTS.some((a) => h === a || h.endsWith('.' + a));
  } catch {
    return false;
  }
}

/**
 * 공유한 매물 페이지 한 장에서 주소·단지명 후보만 뽑는다 (페이지는 저장하지 않음).
 * OG 태그 → 구조화 데이터(JSON-LD) → 본문 글자 순서로 찾는다.
 */
export function extractListingFromHtml(html: string): { title: string | null; description: string | null; image: string | null; address: string | null; complexName: string | null } {
  const og = extractOgTags(html);
  const ld: string[] = [];
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) ld.push(m[1]);
  // 태그를 지운 본문 (스크립트·스타일 제외)
  const body = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .slice(0, 60_000);
  // JSON 안의 문자열 값들 (주소 필드가 있을 수 있음)
  const jsonText = [...ld, ...[...html.matchAll(/"(?:address|addressName|streetAddress|roadAddress|jibunAddress|fullAddress|buildingName|complexName|apartmentName|name)"\s*:\s*"([^"]{2,80})"/g)].map((m) => m[1])].join(' ');
  const texts = [og.title ?? '', og.description ?? '', jsonText, body];
  let address: string | null = null;
  let complexName: string | null = null;
  for (const t of texts) {
    const p = parseSharedText(t);
    address = address ?? p.address;
    complexName = complexName ?? p.complexName;
    if (address && complexName) break;
  }
  return { ...og, address, complexName };
}
