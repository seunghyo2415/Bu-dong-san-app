-- ============================================================
-- 5. 커뮤니티: 프로필 · 단지별 게시판 · 댓글 · 신고 · 차단 · 금칙어 · 주차 체감 평가 · 외부 글 캐시
--    로그인은 Supabase 익명 로그인(닉네임만) — 대시보드 Authentication 에서 Anonymous sign-ins 켜기
-- ============================================================

create table public.profiles (
  user_id    uuid primary key references auth.users on delete cascade default auth.uid(),
  nickname   text not null unique check (char_length(nickname) between 2 and 12),
  created_at timestamptz not null default now()
);

create table public.posts (
  id                bigint generated always as identity primary key,
  complex_id        uuid not null references public.complexes on delete cascade,
  user_id           uuid not null references auth.users on delete cascade default auth.uid(),
  category          text not null check (category in ('review', 'pros_cons', 'question')),
  body              text not null check (char_length(body) between 2 and 2000),
  resident_verified boolean not null default false,  -- 글 쓸 때 단지 300m 안에서 위치 확인
  report_count      int not null default 0,
  hidden            boolean not null default false,
  created_at        timestamptz not null default now()
);
create index posts_complex on public.posts (complex_id, created_at desc);

create table public.comments (
  id           bigint generated always as identity primary key,
  post_id      bigint not null references public.posts on delete cascade,
  user_id      uuid not null references auth.users on delete cascade default auth.uid(),
  body         text not null check (char_length(body) between 1 and 1000),
  report_count int not null default 0,
  hidden       boolean not null default false,
  created_at   timestamptz not null default now()
);
create index comments_post on public.comments (post_id, created_at);

create table public.reports (
  id          bigint generated always as identity primary key,
  target_type text not null check (target_type in ('post', 'comment')),
  target_id   bigint not null,
  reporter_id uuid not null references auth.users on delete cascade default auth.uid(),
  reason      text not null check (char_length(reason) between 1 and 200),
  created_at  timestamptz not null default now(),
  unique (target_type, target_id, reporter_id)
);

create table public.blocks (
  blocker_id uuid not null references auth.users on delete cascade default auth.uid(),
  blocked_id uuid not null references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);

create table public.banned_words (word text primary key);
insert into public.banned_words (word) values ('씨발'), ('시발'), ('개새끼'), ('병신'), ('좆'), ('꺼져'), ('죽어라')
on conflict do nothing;

create table public.parking_reviews (
  id         bigint generated always as identity primary key,
  complex_id uuid not null references public.complexes on delete cascade,
  user_id    uuid not null references auth.users on delete cascade default auth.uid(),
  score      smallint not null check (score between 1 and 5),
  comment    text check (comment is null or char_length(comment) <= 100),
  created_at timestamptz not null default now(),
  unique (complex_id, user_id)
);

-- 외부 글 모아보기 캐시 (제목·짧은 요약·링크만, 24시간)
create table public.external_posts_cache (
  complex_id uuid not null references public.complexes on delete cascade,
  provider   text not null,
  sort       text not null,
  items      jsonb not null,
  fetched_at timestamptz not null default now(),
  primary key (complex_id, provider, sort)
);

-- ---------- 개인정보 가리기 + 금칙어 (앱의 maskPersonalInfo 와 같은 규칙) ----------
create or replace function public.clean_text(t text) returns text
language plpgsql stable security definer set search_path = public as $$  -- 금칙어 표는 일반 사용자가 못 읽으므로 definer
declare w text; out text := t;
begin
  out := regexp_replace(out, '([0-9]{6})[- ]?([1-4])[0-9]{6}', '\1-\2******', 'g');
  out := regexp_replace(out, '(01[016789])[-. ]?([0-9]{3,4})[-. ]?([0-9]{4})', '\1-****-****', 'g');
  out := regexp_replace(out, '(^|[^0-9])(0[0-9]{1,2})[-.) ]([0-9]{3,4})[-. ]([0-9]{4})', '\1\2-****-****', 'g');
  out := regexp_replace(out, '([A-Za-z0-9._%+-])[A-Za-z0-9._%+-]*@([A-Za-z0-9.-]+\.[A-Za-z]{2,})', '\1***@\2', 'g');
  for w in select word from public.banned_words loop
    out := replace(out, w, repeat('*', greatest(2, char_length(w))));
  end loop;
  return out;
end $$;

create or replace function public.before_write_text() returns trigger
language plpgsql as $$
begin
  if tg_table_name = 'parking_reviews' then
    new.comment := public.clean_text(new.comment);
  else
    new.body := public.clean_text(new.body);
  end if;
  -- 다른 사람 이름으로 쓰지 못하게: 새 글은 로그인한 본인, 수정할 때는 작성자를 절대 바꾸지 않음
  if tg_op = 'INSERT' then
    if auth.uid() is not null then new.user_id := auth.uid(); end if;
  else
    new.user_id := old.user_id;
  end if;
  -- 사용자가 신고 수·숨김을 직접 고치지 못하게 (신고 트리거처럼 시스템이 고칠 때는 허용)
  if tg_op = 'UPDATE' and tg_table_name in ('posts', 'comments') and coalesce(current_setting('app.trusted_write', true), '') <> 'on' then
    new.report_count := old.report_count;
    new.hidden := old.hidden;
  end if;
  return new;
end $$;

create trigger posts_clean before insert or update on public.posts for each row execute function public.before_write_text();
create trigger comments_clean before insert or update on public.comments for each row execute function public.before_write_text();
create trigger reviews_clean before insert or update on public.parking_reviews for each row execute function public.before_write_text();

-- 신고 3건이면 자동 숨김 (관리자가 확인 후 복구 가능)
create or replace function public.after_report() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform set_config('app.trusted_write', 'on', true);
  if new.target_type = 'post' then
    update public.posts set report_count = report_count + 1, hidden = (report_count + 1 >= 3) where id = new.target_id;
  else
    update public.comments set report_count = report_count + 1, hidden = (report_count + 1 >= 3) where id = new.target_id;
  end if;
  perform set_config('app.trusted_write', 'off', true);
  return new;
end $$;
create trigger reports_count after insert on public.reports for each row execute function public.after_report();

-- ---------- 보안 (RLS) ----------
alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.reports enable row level security;
alter table public.blocks enable row level security;
alter table public.banned_words enable row level security;
alter table public.parking_reviews enable row level security;
alter table public.external_posts_cache enable row level security;

create policy "누구나 닉네임 보기" on public.profiles for select using (true);
create policy "내 프로필 만들기" on public.profiles for insert to authenticated with check (user_id = auth.uid());
create policy "내 프로필 고치기" on public.profiles for update to authenticated using (user_id = auth.uid());

create policy "숨김 아닌 글 보기" on public.posts for select using (not hidden or user_id = auth.uid());
create policy "로그인하면 글쓰기" on public.posts for insert to authenticated with check (user_id = auth.uid());
create policy "내 글 고치기" on public.posts for update to authenticated using (user_id = auth.uid());
create policy "내 글 지우기" on public.posts for delete to authenticated using (user_id = auth.uid());

create policy "숨김 아닌 댓글 보기" on public.comments for select using (not hidden or user_id = auth.uid());
create policy "로그인하면 댓글" on public.comments for insert to authenticated with check (user_id = auth.uid());
create policy "내 댓글 지우기" on public.comments for delete to authenticated using (user_id = auth.uid());

create policy "신고하기" on public.reports for insert to authenticated with check (reporter_id = auth.uid());
create policy "내 신고 보기" on public.reports for select to authenticated using (reporter_id = auth.uid());

create policy "내 차단 목록" on public.blocks for all to authenticated using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());

create policy "평가 보기" on public.parking_reviews for select using (true);
create policy "내 평가 쓰기" on public.parking_reviews for insert to authenticated with check (user_id = auth.uid());
create policy "내 평가 고치기" on public.parking_reviews for update to authenticated using (user_id = auth.uid());

create policy "외부 글 캐시 보기" on public.external_posts_cache for select using (true);
-- banned_words: 정책 없음 → 앱에서 못 읽음 (서버 함수만 사용)

grant select on public.profiles, public.posts, public.comments, public.parking_reviews, public.external_posts_cache to anon, authenticated;
grant insert, update on public.profiles to authenticated;
grant insert, update, delete on public.posts to authenticated;
grant insert, delete on public.comments to authenticated;
grant insert, select on public.reports to authenticated;
grant select, insert, delete on public.blocks to authenticated;
grant insert, update on public.parking_reviews to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant all on public.profiles, public.posts, public.comments, public.reports, public.blocks, public.banned_words,
  public.parking_reviews, public.external_posts_cache to service_role;

-- ---------- 게시판 목록 (닉네임·댓글 수 포함, 내가 차단한 사람 글 제외) ----------
create or replace function public.list_posts(p_complex uuid, p_limit int default 30, p_before bigint default null)
returns jsonb language sql stable as $$
  select coalesce(jsonb_agg(x order by (x->>'id')::bigint desc), '[]') from (
    select jsonb_build_object(
      'id', p.id, 'category', p.category, 'body', p.body, 'createdAt', p.created_at,
      'nickname', coalesce(pr.nickname, '익명'), 'authorId', p.user_id,
      'residentVerified', p.resident_verified, 'mine', p.user_id = auth.uid(),
      'commentCount', (select count(*) from public.comments c where c.post_id = p.id and not c.hidden)) x
    from public.posts p
    left join public.profiles pr on pr.user_id = p.user_id
    where p.complex_id = p_complex and not p.hidden
      and (p_before is null or p.id < p_before)
      and not exists (select 1 from public.blocks b where b.blocker_id = auth.uid() and b.blocked_id = p.user_id)
    order by p.id desc
    limit least(p_limit, 100)
  ) t
$$;

create or replace function public.list_comments(p_post bigint)
returns jsonb language sql stable as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', c.id, 'body', c.body, 'createdAt', c.created_at, 'nickname', coalesce(pr.nickname, '익명'),
      'authorId', c.user_id, 'mine', c.user_id = auth.uid()) order by c.id), '[]')
  from public.comments c left join public.profiles pr on pr.user_id = c.user_id
  where c.post_id = p_post and not c.hidden
    and not exists (select 1 from public.blocks b where b.blocker_id = auth.uid() and b.blocked_id = c.user_id)
$$;
grant execute on function public.list_posts(uuid, int, bigint) to anon, authenticated;
grant execute on function public.list_comments(bigint) to anon, authenticated;

-- ---------- 단지 상세: 주차 체감 평가를 실제 값으로 ----------
create or replace function public.parking_reviews_json(p_complex uuid) returns jsonb
language sql stable as $$
  select jsonb_build_object(
    'average', coalesce(round(avg(score)::numeric, 1), 0),
    'count', count(*),
    'recent', coalesce((select jsonb_agg(jsonb_build_object('score', r.score, 'comment', coalesce(r.comment, ''), 'date', r.created_at::date))
                        from (select * from public.parking_reviews where complex_id = p_complex and coalesce(comment, '') <> ''
                              order by created_at desc limit 3) r), '[]'))
  from public.parking_reviews where complex_id = p_complex
$$;
grant execute on function public.parking_reviews_json(uuid) to anon, authenticated;

alter function public.complex_detail(uuid) rename to complex_detail_core;
create function public.complex_detail(p_id uuid) returns jsonb
language sql stable as $$
  select case when d is null then null else jsonb_set(d, '{parking,reviews}', public.parking_reviews_json(p_id)) end
  from public.complex_detail_core(p_id) d
$$;
grant execute on function public.complex_detail(uuid) to anon, authenticated;
