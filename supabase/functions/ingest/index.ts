/**
 * Supabase Edge Function: 매일 자동 수집 (pg_cron 이 호출).
 * 공공데이터 API는 해외에서 접속이 막힐 수 있어, 호출할 때 'x-region: ap-northeast-2'(서울)로 실행되게 한다.
 * 보안: 요청 헤더 x-ingest-secret 이 INGEST_SECRET 과 같아야 실행.
 *
 * body: { "job": "daily" | "trades" | "complexes" | "buildings", "months": 2, "sigungus": ["31140"] }
 *   실행 시간 제한(무료 요금제 약 150초) 때문에 큰 작업은 시군구별로 나눠 호출한다.
 */
import { KakaoClient } from '../_shared/kakao.ts';
import { finish, syncBuildings, syncComplexes, syncTrades, type JobContext } from '../_shared/jobs.ts';
import { PublicDataClient } from '../_shared/publicdata.ts';
import { SupabaseSink } from '../_shared/sink.ts';

Deno.serve(async (req) => {
  const secret = Deno.env.get('INGEST_SECRET');
  if (!secret || req.headers.get('x-ingest-secret') !== secret) return new Response('forbidden', { status: 403 });

  const body = await req.json().catch(() => ({}));
  const job: string = body.job ?? 'daily';
  const months: number | string[] = Array.isArray(body.months) ? body.months : Number(body.months) || 2;
  const sigungus: string[] | undefined = Array.isArray(body.sigungus) ? body.sigungus : undefined;
  const logs: string[] = [];
  const ctx: JobContext = {
    pd: new PublicDataClient(Deno.env.get('PUBLIC_DATA_KEY')!),
    kakao: Deno.env.get('KAKAO_REST_KEY') ? new KakaoClient(Deno.env.get('KAKAO_REST_KEY')!) : null,
    db: new SupabaseSink(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!),
    log: (m) => logs.push(m),
  };
  try {
    if (job === 'complexes') await syncComplexes(ctx, sigungus);
    else if (job === 'buildings') await syncBuildings(ctx);
    else await syncTrades(ctx, months, sigungus); // daily / trades: 기본 최근 2개월 (늦게 신고·해제되는 거래 반영)
    await finish(ctx);
    return Response.json({ ok: true, logs });
  } catch (e) {
    return Response.json({ ok: false, error: String(e), logs }, { status: 500 });
  }
});
