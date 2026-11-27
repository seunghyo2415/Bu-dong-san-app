/**
 * 외부 글 검색 (공식 API 만): 네이버 검색(블로그·카페), 카카오(다음) 검색(블로그·카페·웹), YouTube Data API.
 * 제목·짧은 요약·날짜·출처·링크만 돌려준다 (본문 복사 금지).
 * ⚠️ 응답 필드는 각 사의 개발자 문서 기준 — 키 발급 후 첫 호출에서 확인하고 docs/DATA_SOURCES.md 에 기록.
 */
import type { FetchLike } from './publicdata.ts';

export type Provider = 'naver_blog' | 'naver_cafe' | 'kakao_blog' | 'kakao_cafe' | 'kakao_web' | 'youtube';
export type Sort = 'relevance' | 'date';
export type ExternalItem = { provider: Provider; title: string; summary: string; url: string; date: string | null; source: string; thumbnail: string | null };
export type Keys = { naverId?: string; naverSecret?: string; kakao?: string; youtube?: string };

export function plain(s: unknown, max = 120): string {
  const t = String(s ?? '')
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
const day = (s: unknown) => {
  const m = String(s ?? '').match(/^(\d{4})-?(\d{2})-?(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
};

export async function searchExternal(provider: Provider, query: string, sort: Sort, keys: Keys, fetchImpl: FetchLike = fetch): Promise<ExternalItem[]> {
  const q = encodeURIComponent(query);
  if (provider === 'naver_blog' || provider === 'naver_cafe') {
    if (!keys.naverId || !keys.naverSecret) throw new Error('네이버 검색 키 없음');
    const kind = provider === 'naver_blog' ? 'blog' : 'cafearticle';
    const res = await fetchImpl(`https://openapi.naver.com/v1/search/${kind}.json?query=${q}&display=20&sort=${sort === 'date' ? 'date' : 'sim'}`, {
      headers: { 'X-Naver-Client-Id': keys.naverId, 'X-Naver-Client-Secret': keys.naverSecret },
    });
    if (!res.ok) throw new Error(`네이버 검색 HTTP ${res.status}`);
    const j = (await res.json()) as { items?: Record<string, string>[] };
    return (j.items ?? []).map((it) => ({
      provider, title: plain(it.title, 80), summary: plain(it.description), url: it.link,
      date: day(it.postdate), source: plain(it.bloggername ?? it.cafename ?? '', 30), thumbnail: null,
    }));
  }
  if (provider === 'kakao_blog' || provider === 'kakao_cafe' || provider === 'kakao_web') {
    if (!keys.kakao) throw new Error('카카오 키 없음');
    const kind = provider.split('_')[1];
    const res = await fetchImpl(`https://dapi.kakao.com/v2/search/${kind}?query=${q}&size=20&sort=${sort === 'date' ? 'recency' : 'accuracy'}`, {
      headers: { Authorization: `KakaoAK ${keys.kakao}` },
    });
    if (!res.ok) throw new Error(`카카오 검색 HTTP ${res.status}`);
    const j = (await res.json()) as { documents?: Record<string, string>[] };
    return (j.documents ?? []).map((d) => ({
      provider, title: plain(d.title, 80), summary: plain(d.contents), url: d.url,
      date: day(d.datetime), source: plain(d.blogname ?? d.cafename ?? '', 30), thumbnail: d.thumbnail || null,
    }));
  }
  if (provider === 'youtube') {
    if (!keys.youtube) throw new Error('YouTube 키 없음');
    const res = await fetchImpl(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=15&regionCode=KR&relevanceLanguage=ko&order=${sort === 'date' ? 'date' : 'relevance'}&q=${q}&key=${encodeURIComponent(keys.youtube)}`,
    );
    if (!res.ok) throw new Error(`YouTube HTTP ${res.status}`);
    const j = (await res.json()) as { items?: { id?: { videoId?: string }; snippet?: Record<string, any> }[] };
    return (j.items ?? [])
      .filter((it) => it.id?.videoId)
      .map((it) => ({
        provider, title: plain(it.snippet?.title, 80), summary: plain(it.snippet?.description), url: `https://www.youtube.com/watch?v=${it.id!.videoId}`,
        date: day(it.snippet?.publishedAt), source: plain(it.snippet?.channelTitle ?? '', 30), thumbnail: it.snippet?.thumbnails?.default?.url ?? null,
      }));
  }
  throw new Error('알 수 없는 출처');
}
