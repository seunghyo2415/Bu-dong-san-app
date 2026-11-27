/**
 * 내 PC에서 공공데이터를 모아 Supabase 에 넣는 명령.
 * 공공데이터 API는 해외 서버에서 막힐 수 있어서, 처음 대량 수집은 한국에 있는 내 PC에서 실행하는 걸 권장.
 *
 *   npm run ingest -- all --months 60     # 처음 한 번: 단지 + 건축물대장 + 5년치 실거래
 *   npm run ingest -- trades --months 2   # 최근 2개월 실거래만
 *   npm run ingest -- complexes | buildings | finish
 *
 * 필요한 값은 ingest/.env 에 (예시는 .env.example)
 */
import { KakaoClient } from '../supabase/functions/_shared/kakao.ts';
import { finish, syncBuildings, syncComplexes, syncTrades, type JobContext } from '../supabase/functions/_shared/jobs.ts';
import { PublicDataClient } from '../supabase/functions/_shared/publicdata.ts';
import { SupabaseSink, type Sink } from '../supabase/functions/_shared/sink.ts';
import { PgSink } from './pg-sink.ts';

const args = process.argv.slice(2);
const cmd = args[0] ?? 'help';
const monthsIdx = args.indexOf('--months');
const monthsGiven = monthsIdx >= 0 ? Number(args[monthsIdx + 1]) : null;

function need(name: string) {
  const v = process.env[name];
  if (!v) {
    console.error(`❌ ingest/.env 에 ${name} 이(가) 없어요. ingest/.env.example 을 참고하세요.`);
    process.exit(1);
  }
  return v;
}

async function main() {
  if (!['all', 'complexes', 'buildings', 'trades', 'finish'].includes(cmd)) {
    console.log('사용법: npm run ingest -- <all|complexes|buildings|trades|finish> [--months N]');
    return;
  }
  const db: Sink = process.env.DATABASE_URL
    ? PgSink.connect(process.env.DATABASE_URL)
    : new SupabaseSink(need('SUPABASE_URL'), need('SUPABASE_SERVICE_ROLE_KEY'));
  const ctx: JobContext = {
    pd: new PublicDataClient(need('PUBLIC_DATA_KEY')),
    kakao: process.env.KAKAO_REST_KEY ? new KakaoClient(process.env.KAKAO_REST_KEY) : null,
    db,
    log: (m) => console.log(m),
  };
  if (!ctx.kakao) console.log('⚠️ KAKAO_REST_KEY 가 없어 단지 좌표를 만들지 않아요 (지도에 안 보임).');

  const t0 = Date.now();
  if (cmd === 'all' || cmd === 'complexes') await syncComplexes(ctx);
  if (cmd === 'all' || cmd === 'buildings') await syncBuildings(ctx);
  if (cmd === 'all' || cmd === 'trades') await syncTrades(ctx, monthsGiven ?? (cmd === 'all' ? 60 : 2));
  await finish(ctx);
  console.log(`✅ 끝 (${Math.round((Date.now() - t0) / 1000)}초)`);
  if (db instanceof PgSink) await db.end();
}

main().catch((e) => {
  console.error('❌', e instanceof Error ? e.message : e);
  process.exit(1);
});
