/**
 * 끝에서 끝까지: 가짜 API 응답 → 수집 작업 → 실제 Postgres(PostGIS) → 앱 조회 함수.
 * TEST_DATABASE_URL 이 있을 때만 실행 (supabase/tests/run.sh 로 마이그레이션한 빈 DB).
 */
import { afterAll, describe, expect, it } from 'vitest';

import { KakaoClient } from '../../supabase/functions/_shared/kakao.ts';
import { finish, syncBuildings, syncComplexes, syncTrades, type JobContext } from '../../supabase/functions/_shared/jobs.ts';
import { ENDPOINTS, PublicDataClient } from '../../supabase/functions/_shared/publicdata.ts';
import { PgSink } from '../pg-sink.ts';
import { APT_LIST_JSON, BLD_RECAP_ITEMS, KAKAO_ADDRESS, KAPT_BASIS_JSON, KAPT_DETAIL_JSON, RENT_ITEMS, TRADE_ITEMS, tradeXml } from './fixtures.ts';

const DB = process.env.TEST_DATABASE_URL;

const fakeFetch = async (url: string) => {
  const u = new URL(url);
  const base = u.origin + u.pathname;
  const sgg = u.searchParams.get('LAWD_CD') ?? u.searchParams.get('sigunguCode');
  const empty = tradeXml([]);
  switch (base) {
    case ENDPOINTS.aptListSigungu:
      return new Response(sgg === '31140' ? APT_LIST_JSON : JSON.stringify({ response: { header: { resultCode: '00' }, body: { items: [], totalCount: 0 } } }));
    case ENDPOINTS.kaptBasis:
      return new Response(KAPT_BASIS_JSON);
    case ENDPOINTS.kaptDetail:
      return new Response(KAPT_DETAIL_JSON);
    case ENDPOINTS.bldRecap:
      return new Response(tradeXml(BLD_RECAP_ITEMS));
    case ENDPOINTS.bldTitle:
      return new Response(empty);
    case ENDPOINTS.aptTrade:
      return new Response(sgg === '31140' ? tradeXml(TRADE_ITEMS) : empty);
    case ENDPOINTS.aptRent:
      return new Response(sgg === '31140' ? tradeXml(RENT_ITEMS) : empty);
    default:
      if (url.startsWith('https://dapi.kakao.com/v2/local/search/address.json')) return Response.json(KAKAO_ADDRESS);
      return new Response('not found', { status: 404 });
  }
};

describe.skipIf(!DB)('수집 → DB → 앱 조회 (로컬 Postgres)', () => {
  const db = DB ? PgSink.connect(DB) : (null as unknown as PgSink);
  afterAll(() => db?.end());

  it('단지·건축물대장·실거래를 모아 상세 화면 JSON 을 만든다', async () => {
    const logs: string[] = [];
    const ctx: JobContext = {
      pd: new PublicDataClient('TEST', fakeFetch, 0),
      kakao: new KakaoClient('TEST', fakeFetch),
      db,
      log: (m) => logs.push(m),
    };
    await syncComplexes(ctx);
    await syncBuildings(ctx);
    await syncTrades(ctx, ['202610']);
    await finish(ctx);

    const list = await db.rpc<{ id: string; name: string }[]>('list_complexes', { filters: {} });
    expect(list).toHaveLength(1);
    const d = await db.rpc<Record<string, any>>('complex_detail', { p_id: list[0].id });
    expect(d.name).toBe('테스트한빛아파트');
    expect(d.recentPrice.value).toBe(45000); // 해제된 52,000 제외
    expect(d.parkingPerHousehold.value).toBe(1.32); // K-apt 1,320대 ÷ 1,000세대
    expect(d.parking.facts.map((f: { source: string }) => f.source)).toEqual(['kapt', 'bldrgst']);
    expect(d.parking.facts[1].indoorMech).toBe(50);
    expect(d.recentJeonse.value).toBe(30000);
    expect(d.location.lat).toBeCloseTo(35.5405);

    const trades = await db.rpc<unknown[]>('complex_trades', { p_id: list[0].id });
    expect(trades).toHaveLength(3);

    const runs = await db.select<{ job: string; error: string | null }>('ingest_runs', 'select=job,error');
    expect(runs.map((r) => r.job)).toEqual(['complexes', 'buildings', 'trades']);
    expect(runs.every((r) => r.error == null)).toBe(true);
  });
});
