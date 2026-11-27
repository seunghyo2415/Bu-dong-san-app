-- ============================================================
-- 6. 계산기 정책값 · 관심 단지 새 실거래 알림
-- ============================================================

-- 세율·LTV·DSR 등은 코드가 아니라 여기서 관리 (앱은 최신 effective_from 값을 읽고, 없으면 앱 기본값)
create table public.policy_values (
  key            text not null,
  effective_from date not null,
  value          jsonb not null,
  source_url     text,
  note           text,
  verified_at    date,          -- 사람이 법령과 대조한 날
  primary key (key, effective_from)
);
alter table public.policy_values enable row level security;
create policy "정책값 보기" on public.policy_values for select using (true);
grant select on public.policy_values to anon, authenticated;
grant all on public.policy_values to service_role;

create or replace function public.current_policy(p_key text) returns jsonb
language sql stable as $$
  select jsonb_build_object('value', value, 'effectiveFrom', effective_from, 'verifiedAt', verified_at, 'sourceUrl', source_url)
  from public.policy_values where key = p_key and effective_from <= current_date
  order by effective_from desc limit 1
$$;
grant execute on function public.current_policy(text) to anon, authenticated;

-- 푸시 알림 토큰 (Expo push token) 과 관심 단지 구독
create table public.push_tokens (
  user_id    uuid primary key references auth.users on delete cascade default auth.uid(),
  token      text not null,
  platform   text,
  updated_at timestamptz not null default now()
);
create table public.alert_subscriptions (
  user_id    uuid not null references auth.users on delete cascade default auth.uid(),
  complex_id uuid not null references public.complexes on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, complex_id)
);
create table public.notify_runs (
  id         bigint generated always as identity primary key,
  ran_at     timestamptz not null default now(),
  since      timestamptz not null,
  sent       int not null default 0,
  error      text
);
alter table public.push_tokens enable row level security;
alter table public.alert_subscriptions enable row level security;
alter table public.notify_runs enable row level security;
create policy "내 토큰" on public.push_tokens for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "내 구독" on public.alert_subscriptions for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update, delete on public.push_tokens, public.alert_subscriptions to authenticated;
grant all on public.push_tokens, public.alert_subscriptions, public.notify_runs to service_role;
grant usage, select on all sequences in schema public to service_role;

-- 지난 알림 이후 새로 들어온 매매 실거래 → 보낼 알림 목록 (서버 전용)
create or replace function public.pending_trade_alerts(p_since timestamptz) returns jsonb
language sql stable security definer set search_path = public, extensions as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'token', pt.token, 'complexId', c.id, 'complexName', c.name, 'count', t.n, 'latestPrice', t.latest_price, 'latestDate', t.latest_date)), '[]')
  from public.alert_subscriptions s
  join public.push_tokens pt on pt.user_id = s.user_id
  join public.complexes c on c.id = s.complex_id
  join lateral (
    select count(*) n,
           (array_agg(price order by deal_date desc, id desc))[1] latest_price,
           max(deal_date) latest_date
    from public.trades tr
    where tr.complex_id = s.complex_id and tr.fetched_at > p_since and not tr.canceled
  ) t on t.n > 0
$$;
revoke all on function public.pending_trade_alerts(timestamptz) from public, anon, authenticated;
grant execute on function public.pending_trade_alerts(timestamptz) to service_role;
