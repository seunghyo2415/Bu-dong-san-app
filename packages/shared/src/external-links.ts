/**
 * 다른 부동산 서비스(네이버페이 부동산·호갱노노) 단지 링크.
 * 이 서비스들은 단지 번호를 공개하지 않아(비공식 내부 API 사용·크롤링 금지) 처음엔 이름 검색으로 열고,
 * 사용자가 그 앱에서 단지 화면을 "공유"해 주면 그 링크를 기억해 다음부터 바로 연다.
 */
export type ExternalApp = 'naver' | 'hogangnono';

export const EXTERNAL_APPS: Record<ExternalApp, { label: string; hosts: string[]; words: string[] }> = {
  naver: { label: '네이버페이 부동산', hosts: ['land.naver.com', 'naver.me'], words: ['네이버페이 부동산', '네이버 부동산', 'NAVER 부동산'] },
  hogangnono: { label: '호갱노노', hosts: ['hogangnono.com'], words: ['호갱노노'] },
};

const URL_RE = /https?:\/\/[^\s<>"')]+/i;

function hostMatches(host: string, base: string) {
  return host === base || host.endsWith('.' + base);
}

/** 공유받은 글이 네이버페이 부동산·호갱노노 단지 링크인지 */
export function detectExternalLink(text: string): { app: ExternalApp; url: string } | null {
  const url = text.match(URL_RE)?.[0]?.replace(/[.,]+$/, '');
  if (!url) return null;
  let host = '';
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
  for (const app of Object.keys(EXTERNAL_APPS) as ExternalApp[]) {
    if (EXTERNAL_APPS[app].hosts.some((h) => hostMatches(host, h))) {
      // naver.me 는 네이버 전체 단축 링크라 '부동산' 단어가 같이 있을 때만
      if (host === 'naver.me' && !EXTERNAL_APPS.naver.words.some((w) => text.includes(w)) && !/부동산|아파트|단지/.test(text)) return null;
      return { app, url };
    }
  }
  return null;
}

/** 아직 연결 전: 그 서비스에서 단지 이름으로 찾기 */
export function externalSearchUrl(app: ExternalApp, complexName: string): string {
  const q = encodeURIComponent(complexName.replace(/\(.*?\)/g, '').trim());
  return app === 'naver' ? `https://m.land.naver.com/search/result/${q}` : 'https://hogangnono.com';
}

/** 공유 글에서 단지 이름 후보 (링크·서비스 이름 빼고 남은 글) */
export function nameFromSharedText(text: string): string {
  let t = text.replace(URL_RE, ' ');
  for (const a of Object.values(EXTERNAL_APPS)) for (const w of a.words) t = t.split(w).join(' ');
  return t.replace(/\[[^\]]*\]|[|·\-–:]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 40);
}
