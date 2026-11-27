/**
 * 관심 단지 새 실거래 푸시 알림 (매일 수집 뒤 pg_cron 이 호출). x-ingest-secret 으로 보호.
 * 지난 실행 이후 들어온 거래만 알린다. Expo Push API 로 100개씩 전송.
 */
import { buildMessages, chunk, type Alert } from '../_shared/notify.ts';
import { SupabaseSink } from '../_shared/sink.ts';

Deno.serve(async (req) => {
  const secret = Deno.env.get('INGEST_SECRET');
  if (!secret || req.headers.get('x-ingest-secret') !== secret) return new Response('forbidden', { status: 403 });
  const db = new SupabaseSink(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const last = await db.select<{ ran_at: string }>('notify_runs', 'select=ran_at&order=ran_at.desc&limit=1&error=is.null');
  const since = last[0]?.ran_at ?? new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const startedAt = new Date().toISOString();
  try {
    const alerts = await db.rpc<Alert[]>('pending_trade_alerts', { p_since: since });
    let sent = 0;
    for (const batch of chunk(buildMessages(alerts ?? []), 100)) {
      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(batch),
      });
      if (res.ok) sent += batch.length;
    }
    await db.insert('notify_runs', { ran_at: startedAt, since, sent });
    return Response.json({ ok: true, sent });
  } catch (e) {
    await db.insert('notify_runs', { ran_at: startedAt, since, sent: 0, error: String(e).slice(0, 500) });
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
});
