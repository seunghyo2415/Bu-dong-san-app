/**
 * 단지 이야기 모아보기 (공식 검색 API). 24시간 캐시(external_posts_cache)에 제목·요약·링크만 저장.
 * body: { complexId, query, provider, sort }  — 앱은 supabase.functions.invoke('community', ...)
 */
import { searchExternal, type Provider, type Sort } from '../_shared/external.ts';
import { SupabaseSink } from '../_shared/sink.ts';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
const PROVIDERS: Provider[] = ['naver_blog', 'naver_cafe', 'kakao_blog', 'kakao_cafe', 'kakao_web', 'youtube'];
const DAY = 24 * 60 * 60 * 1000;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const b = await req.json();
    const provider = b.provider as Provider;
    const sort: Sort = b.sort === 'date' ? 'date' : 'relevance';
    const query = String(b.query ?? '').slice(0, 80);
    const complexId = String(b.complexId ?? '');
    if (!PROVIDERS.includes(provider) || !query || !/^[0-9a-f-]{36}$/.test(complexId)) {
      return Response.json({ error: 'bad request' }, { status: 400, headers: cors });
    }
    const db = new SupabaseSink(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const cached = await db.select<{ items: unknown[]; fetched_at: string }>(
      'external_posts_cache',
      `select=items,fetched_at&complex_id=eq.${complexId}&provider=eq.${provider}&sort=eq.${sort}`,
    );
    if (cached[0] && Date.now() - Date.parse(cached[0].fetched_at) < DAY) {
      return Response.json({ items: cached[0].items, cached: true }, { headers: cors });
    }
    const items = await searchExternal(provider, query, sort, {
      naverId: Deno.env.get('NAVER_CLIENT_ID'),
      naverSecret: Deno.env.get('NAVER_CLIENT_SECRET'),
      kakao: Deno.env.get('KAKAO_REST_KEY'),
      youtube: Deno.env.get('YOUTUBE_API_KEY'),
    });
    await fetch(`${Deno.env.get('SUPABASE_URL')}/rest/v1/external_posts_cache`, {
      method: 'POST',
      headers: {
        apikey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
        Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify({ complex_id: complexId, provider, sort, items, fetched_at: new Date().toISOString() }),
    });
    return Response.json({ items, cached: false }, { headers: cors });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 502, headers: cors });
  }
});
