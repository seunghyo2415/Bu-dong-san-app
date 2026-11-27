/**
 * 수집 작업 묶음. Node(내 PC: ingest/cli.ts)와 Deno(Supabase Edge Function: functions/ingest)에서 같이 쓴다.
 */
import { KakaoClient } from './kakao.ts';
import { aptListRow, buildingRow, compact, kaptBasisRow, kaptDetailRow, pnuToBuildingParams, rentRow, tradeRow } from './normalize.ts';
import { PublicDataClient, recentMonths } from './publicdata.ts';
import type { Sink } from './sink.ts';

/** 울산 시군구 코드 (중구·남구·동구·북구·울주군) — 첫 수집 때 단지목록의 bjdCode 앞 5자리와 대조해 로그로 확인 */
export const ULSAN_SIGUNGU = ['31110', '31140', '31170', '31200', '31710'];

export type JobContext = {
  pd: PublicDataClient;
  kakao: KakaoClient | null;
  db: Sink;
  log: (msg: string) => void;
};

async function pool<T>(items: T[], n: number, fn: (t: T) => Promise<void>) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) await fn(items[i++]);
  }));
}

async function tracked<T>(ctx: JobContext, job: string, params: unknown, fn: () => Promise<{ rowsIn: number; rowsOk: number; result?: T }>) {
  const run = (await ctx.db.insert('ingest_runs', { job, params })) as { id: number };
  try {
    const r = await fn();
    await ctx.db.patch('ingest_runs', `id=eq.${run.id}`, { finished_at: new Date().toISOString(), rows_in: r.rowsIn, rows_ok: r.rowsOk });
    return r;
  } catch (e) {
    await ctx.db.patch('ingest_runs', `id=eq.${run.id}`, { finished_at: new Date().toISOString(), error: String(e).slice(0, 1000) });
    throw e;
  }
}

/** 단지 목록 + 기본·상세정보 + 좌표 */
export async function syncComplexes(ctx: JobContext, sigungus = ULSAN_SIGUNGU) {
  return tracked(ctx, 'complexes', { sigungus }, async () => {
    let rowsIn = 0, rowsOk = 0;
    for (const sgg of sigungus) {
      const list = compact((await ctx.pd.aptList(sgg)).map(aptListRow));
      const wrongPrefix = list.filter((r) => r.bjdong_code && !r.bjdong_code.startsWith(sgg));
      if (wrongPrefix.length) ctx.log(`⚠️ ${sgg}: 법정동코드 앞자리가 다른 단지 ${wrongPrefix.length}곳 (시군구 코드 확인 필요)`);
      ctx.log(`${sgg}: 단지 ${list.length}곳`);
      rowsIn += list.length;
      await ctx.db.rpcBatched('ingest_apt_list', list);

      const basis: NonNullable<ReturnType<typeof kaptBasisRow>>[] = [];
      const detail: NonNullable<ReturnType<typeof kaptDetailRow>>[] = [];
      await pool(list, 4, async (c) => {
        try {
          const b = kaptBasisRow((await ctx.pd.kaptBasis(c.kapt_code!)) ?? {});
          if (b) basis.push(b);
          const d = kaptDetailRow((await ctx.pd.kaptDetail(c.kapt_code!)) ?? {});
          if (d) detail.push(d);
        } catch (e) {
          ctx.log(`  ${c.kapt_code} ${c.name}: ${e}`);
        }
      });
      await ctx.db.rpcBatched('ingest_kapt_basis', basis);
      await ctx.db.rpcBatched('ingest_kapt_detail', detail);
      rowsOk += basis.length;

      if (ctx.kakao) {
        const locs: { kapt_code: string; lat: number; lng: number; pnu: string | null }[] = [];
        await pool(basis, 4, async (b) => {
          const q = b.road_address ?? b.jibun_address;
          if (!q) return;
          try {
            const g = await ctx.kakao!.geocode(q.replace(/\s+\S*(아파트|APT)\S*$/i, ''));
            if (g) locs.push({ kapt_code: b.kapt_code!, lat: g.lat, lng: g.lng, pnu: g.pnu });
          } catch (e) {
            ctx.log(`  좌표 실패 ${b.name}: ${e}`);
          }
        });
        await ctx.db.rpcBatched('set_complex_locations', locs);
        ctx.log(`  좌표 ${locs.length}/${basis.length}`);
      }
    }
    return { rowsIn, rowsOk };
  });
}

/** 건축물대장 총괄표제부·표제부 (단지 필지 기준) */
export async function syncBuildings(ctx: JobContext) {
  return tracked(ctx, 'buildings', null, async () => {
    const parcels = await ctx.db.select<{ pnu: string }>('complex_parcels', 'select=pnu');
    const pnus = [...new Set(parcels.map((p) => p.pnu))];
    let rowsOk = 0;
    await pool(pnus, 3, async (pnu) => {
      try {
        const params = pnuToBuildingParams(pnu);
        const recap = compact((await ctx.pd.buildings('recap', params)).map((it) => buildingRow(it, 'recap')));
        const title = compact((await ctx.pd.buildings('title', params)).map((it) => buildingRow(it, 'title')));
        const rows = [...recap, ...title];
        if (rows.length) await ctx.db.rpcBatched('ingest_buildings', rows, 200);
        rowsOk += rows.length;
      } catch (e) {
        ctx.log(`  건축물대장 ${pnu}: ${e}`);
      }
    });
    ctx.log(`건축물대장: 필지 ${pnus.length}개, 건물 ${rowsOk}건`);
    return { rowsIn: pnus.length, rowsOk };
  });
}

/** 매매·전월세 실거래 (최근 months 개월) */
export async function syncTrades(ctx: JobContext, months: number | string[], sigungus = ULSAN_SIGUNGU) {
  const yms = Array.isArray(months) ? months : recentMonths(months);
  return tracked(ctx, 'trades', { months: yms, sigungus }, async () => {
    let rowsIn = 0, rowsOk = 0;
    for (const sgg of sigungus) {
      for (const ym of yms) {
        const t = compact((await ctx.pd.trades(sgg, ym)).map(tradeRow));
        const r = compact((await ctx.pd.rents(sgg, ym)).map(rentRow));
        const rt = (await ctx.db.rpcBatched('ingest_trades', t)) as { matched: number }[];
        const rr = (await ctx.db.rpcBatched('ingest_rents', r)) as { matched: number }[];
        const mt = rt.reduce((a, b) => a + (b?.matched ?? 0), 0);
        const mr = rr.reduce((a, b) => a + (b?.matched ?? 0), 0);
        ctx.log(`${sgg} ${ym}: 매매 ${t.length}(매칭 ${mt}) · 전월세 ${r.length}(매칭 ${mr})`);
        rowsIn += t.length + r.length;
        rowsOk += mt + mr;
      }
    }
    return { rowsIn, rowsOk };
  });
}

/** 마무리: 실패했던 매칭 다시 시도 + 요약 갱신 */
export async function finish(ctx: JobContext) {
  const r = await ctx.db.rpc<{ rematched: number }>('rematch_unmatched');
  await ctx.db.rpc('refresh_summaries');
  ctx.log(`다시 매칭 ${r?.rematched ?? 0}건, 요약 갱신 완료`);
}
