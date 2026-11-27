import { describe, expect, it } from 'vitest';

import { searchExternal } from '../../supabase/functions/_shared/external.ts';

const fake = (body: unknown, check?: (url: string, init?: RequestInit) => void) => async (url: string, init?: RequestInit) => {
  check?.(url, init);
  return Response.json(body);
};

describe('외부 글 검색 정리 (응답 형태는 각 사 문서 기준 예시)', () => {
  it('네이버 블로그: 태그 제거, 헤더 키', async () => {
    const items = await searchExternal('naver_blog', '옥동 학마을 울산', 'date', { naverId: 'id', naverSecret: 's' },
      fake({ items: [{ title: '<b>옥동</b> 학마을 후기', link: 'https://blog.naver.com/x/1', description: '주차가 <b>넉넉</b>', bloggername: '집순이', postdate: '20261105' }] }, (url, init) => {
        expect(url).toContain('/v1/search/blog.json');
        expect(url).toContain('sort=date');
        expect((init?.headers as Record<string, string>)['X-Naver-Client-Id']).toBe('id');
      }));
    expect(items[0]).toEqual({ provider: 'naver_blog', title: '옥동 학마을 후기', summary: '주차가 넉넉', url: 'https://blog.naver.com/x/1', date: '2026-11-05', source: '집순이', thumbnail: null });
  });
  it('카카오 카페', async () => {
    const items = await searchExternal('kakao_cafe', 'q', 'relevance', { kakao: 'k' },
      fake({ documents: [{ title: '카페 글', contents: '내용', url: 'https://cafe.daum.net/x', cafename: '울산맘', datetime: '2026-10-01T10:00:00.000+09:00' }] }, (url, init) => {
        expect(url).toContain('/v2/search/cafe');
        expect(url).toContain('sort=accuracy');
        expect((init?.headers as Record<string, string>).Authorization).toBe('KakaoAK k');
      }));
    expect(items[0].date).toBe('2026-10-01');
    expect(items[0].source).toBe('울산맘');
  });
  it('유튜브', async () => {
    const items = await searchExternal('youtube', 'q', 'date', { youtube: 'y' },
      fake({ items: [{ id: { videoId: 'abc' }, snippet: { title: '임장 영상', description: 'd', publishedAt: '2026-09-09T00:00:00Z', channelTitle: '임장TV', thumbnails: { default: { url: 'https://i/x.jpg' } } } }, { id: { kind: 'channel' } }] }));
    expect(items).toHaveLength(1);
    expect(items[0].url).toBe('https://www.youtube.com/watch?v=abc');
  });
  it('키 없으면 오류', async () => {
    await expect(searchExternal('naver_cafe', 'q', 'date', {})).rejects.toThrow('키 없음');
  });
});
