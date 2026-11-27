-- ============================================================
-- 매일 자동 수집 예약 (Supabase SQL Editor 에서 한 번 실행)
-- 1) 아래 두 값을 바꿔서 실행: 프로젝트 주소, 수집용 비밀값(Edge Function 비밀 INGEST_SECRET 과 같은 값)
-- 2) 매일 한국시간 06:17 에 최근 2개월 실거래를 시군구별로 수집하고, 매주 월요일 단지 정보를 갱신
--    공공데이터 API 가 해외 접속을 막을 수 있어 서울 리전(ap-northeast-2)에서 실행되게 요청
-- ============================================================
create extension if not exists pg_cron;
create extension if not exists pg_net;

select vault.create_secret('https://<프로젝트-ref>.supabase.co', 'project_url');
select vault.create_secret('<INGEST_SECRET 과 같은 긴 임의 문자열>', 'ingest_secret');

create or replace function public.call_ingest(payload jsonb) returns bigint
language sql security definer set search_path = public as $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
           || '/functions/v1/ingest?forceFunctionRegion=ap-northeast-2',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-region', 'ap-northeast-2',
      'x-ingest-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'ingest_secret')),
    body := payload,
    timeout_milliseconds := 150000)
$$;
revoke all on function public.call_ingest(jsonb) from public, anon, authenticated;

-- 매일 실거래 (UTC 21:17 = 한국 06:17), 시군구마다 2분 간격
select cron.schedule('trades-31110', '17 21 * * *', $$ select public.call_ingest('{"job":"trades","months":2,"sigungus":["31110"]}') $$);
select cron.schedule('trades-31140', '19 21 * * *', $$ select public.call_ingest('{"job":"trades","months":2,"sigungus":["31140"]}') $$);
select cron.schedule('trades-31170', '21 21 * * *', $$ select public.call_ingest('{"job":"trades","months":2,"sigungus":["31170"]}') $$);
select cron.schedule('trades-31200', '23 21 * * *', $$ select public.call_ingest('{"job":"trades","months":2,"sigungus":["31200"]}') $$);
select cron.schedule('trades-31710', '25 21 * * *', $$ select public.call_ingest('{"job":"trades","months":2,"sigungus":["31710"]}') $$);
-- 매주 일요일 (한국 월요일 새벽) 단지 정보, 시군구마다 3분 간격
select cron.schedule('complexes-31110', '31 19 * * 0', $$ select public.call_ingest('{"job":"complexes","sigungus":["31110"]}') $$);
select cron.schedule('complexes-31140', '34 19 * * 0', $$ select public.call_ingest('{"job":"complexes","sigungus":["31140"]}') $$);
select cron.schedule('complexes-31170', '37 19 * * 0', $$ select public.call_ingest('{"job":"complexes","sigungus":["31170"]}') $$);
select cron.schedule('complexes-31200', '40 19 * * 0', $$ select public.call_ingest('{"job":"complexes","sigungus":["31200"]}') $$);
select cron.schedule('complexes-31710', '43 19 * * 0', $$ select public.call_ingest('{"job":"complexes","sigungus":["31710"]}') $$);
-- 매월 1일 건축물대장
select cron.schedule('buildings-monthly', '53 19 1 * *', $$ select public.call_ingest('{"job":"buildings"}') $$);

-- 관심 단지 새 실거래 푸시 (한국 07:03, 실거래 수집 끝난 뒤)
select cron.schedule('notify-daily', '3 22 * * *', $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/notify',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'x-ingest-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'ingest_secret')),
    body := '{}'::jsonb, timeout_milliseconds := 60000)
$$);
