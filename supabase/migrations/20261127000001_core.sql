-- ============================================================
-- 1. 핵심 스키마: 지역 · 단지 · 필지 · 건축물대장 · 주차 · 실거래 · 매칭 로그
--    금액 = 만원 정수, 면적 = ㎡, 좌표 = geography(Point, 4326)
--    필드 출처는 docs/DATA_SOURCES.md (공식 명세) 참고
-- ============================================================
create extension if not exists postgis with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- ---------- 도우미 함수 ----------

-- 단지명 정규화: 공백·괄호·"아파트/APT/단지" 등을 지워 비교하기 쉽게
create or replace function public.norm_name(s text) returns text
language sql immutable parallel safe as $$
  select regexp_replace(
           regexp_replace(lower(coalesce(s, '')), '\(주\)|아파트|apt|단지|[[:space:]()\[\]·.,\-_]', '', 'g'),
           '([0-9]+)차', '\1', 'g')
$$;

-- 지번 문자열("123-4", "산 12", "123") + 법정동코드 10자리 → PNU 19자리
-- PNU = 법정동코드(10) + 대지구분(1: 일반 1, 산 2) + 본번(4) + 부번(4)
create or replace function public.make_pnu(bjdong10 text, jibun text) returns text
language plpgsql immutable parallel safe as $$
declare
  m text[];
  san boolean;
begin
  if bjdong10 is null or length(bjdong10) <> 10 or jibun is null then return null; end if;
  san := jibun ~ '^\s*산';
  m := regexp_match(jibun, '([0-9]+)(?:\s*-\s*([0-9]+))?');
  if m is null then return null; end if;
  return bjdong10 || case when san then '2' else '1' end
         || lpad(m[1], 4, '0') || lpad(coalesce(m[2], '0'), 4, '0');
end $$;

-- ---------- 지역 ----------
create table public.regions (
  code        text primary key,               -- 시군구 5자리 또는 법정동 10자리
  level       text not null check (level in ('sigungu', 'dong')),
  name        text not null,
  parent_code text,
  center      geography(Point, 4326),
  updated_at  timestamptz not null default now()
);
create index regions_parent_name on public.regions (parent_code, name);

-- ---------- 단지 ----------
create table public.complexes (
  id            uuid primary key default gen_random_uuid(),
  kapt_code     text unique,                    -- K-apt 단지코드 (소규모 단지는 없을 수 있음)
  name          text not null,
  name_norm     text generated always as (public.norm_name(name)) stored,
  sigungu_code  text not null,
  bjdong_code   text,                           -- 법정동 10자리 (bjdCode)
  dong_name     text,
  road_address  text,                           -- doroJuso
  jibun_address text,                           -- kaptAddr
  location      geography(Point, 4326),
  approved_date date,                           -- kaptUsedate
  households    int,                            -- kaptdaCnt
  dong_count    int,                            -- kaptDongCnt
  top_floor     int,                            -- kaptTopFloor
  base_floor    int,                            -- kaptBaseFloor (지하층수)
  builder       text,                           -- kaptBcompany
  heating       text,                           -- codeHeatNm
  hall_type     text,                           -- codeHallNm
  mgmt_type     text,                           -- codeMgrNm
  sale_type     text,                           -- codeSaleNm
  far           numeric,                        -- 용적률 (건축물대장 vlRat)
  bcr           numeric,                        -- 건폐율 (건축물대장 bcRat)
  ev_chargers_ground      int,                  -- groundElChargerCnt
  ev_chargers_underground int,                  -- undergroundElChargerCnt
  bus_stop_distance text,                       -- kaptdWtimebus (원문 그대로)
  house_type    text not null default 'apt',
  basis_fetched_at  timestamptz,
  detail_fetched_at timestamptz,
  geocoded_at       timestamptz,
  updated_at    timestamptz not null default now()
);
create index complexes_location on public.complexes using gist (location);
create index complexes_name_trgm on public.complexes using gin (name_norm extensions.gin_trgm_ops);
create index complexes_bjdong on public.complexes (bjdong_code);

-- 단지 ↔ 필지(PNU) 다대다: 한 단지가 여러 필지에 걸치는 경우가 흔함
create table public.complex_parcels (
  complex_id uuid not null references public.complexes on delete cascade,
  pnu        text not null check (length(pnu) = 19),
  source     text not null,
  primary key (complex_id, pnu)
);
create index complex_parcels_pnu on public.complex_parcels (pnu);

-- 실거래 단지 일련번호(aptSeq) 등 → 단지 연결 (자동 또는 관리자가 수동으로)
create table public.complex_aliases (
  alias      text primary key,                  -- 예: 'aptSeq:31140-1234'
  complex_id uuid not null references public.complexes on delete cascade,
  source     text not null,                     -- 'auto:pnu' | 'auto:name' | 'manual'
  created_at timestamptz not null default now()
);

-- ---------- 건축물대장 (총괄표제부·표제부) ----------
create table public.buildings (
  mgm_bldrgst_pk text primary key,              -- mgmBldrgstPk
  kind           text not null check (kind in ('recap', 'title')),
  pnu            text not null,
  complex_id     uuid references public.complexes on delete set null,
  name           text,                          -- bldNm
  dong_name      text,                          -- dongNm (표제부)
  main_purpose   text,                          -- mainPurpsCdNm
  structure      text,                          -- strctCdNm (표제부)
  approved_date  date,                          -- useAprDay
  ground_floors  int,                           -- grndFlrCnt
  under_floors   int,                           -- ugrndFlrCnt
  households     int,                           -- hhldCnt
  far            numeric,                       -- vlRat
  bcr            numeric,                       -- bcRat
  indoor_self    int,                           -- indrAutoUtcnt 옥내자주식
  indoor_mech    int,                           -- indrMechUtcnt 옥내기계식
  outdoor_self   int,                           -- oudrAutoUtcnt 옥외자주식
  outdoor_mech   int,                           -- oudrMechUtcnt 옥외기계식
  raw            jsonb not null,
  fetched_at     timestamptz not null default now()
);
create index buildings_pnu on public.buildings (pnu);
create index buildings_complex on public.buildings (complex_id);

-- ---------- 주차 (출처별) ----------
create table public.parking_facts (
  complex_id   uuid not null references public.complexes on delete cascade,
  source       text not null check (source in ('kapt', 'bldrgst')),
  ground_total int,                             -- 지상 (K-apt kaptdPcnt / 건축물대장 옥외 합)
  under_total  int,                             -- 지하 (K-apt kaptdPcntu / 건축물대장 옥내 합)
  indoor_self  int,
  indoor_mech  int,
  outdoor_self int,
  outdoor_mech int,
  total        int generated always as (coalesce(ground_total, 0) + coalesce(under_total, 0)) stored,
  as_of        date not null,
  primary key (complex_id, source)
);

-- ---------- 실거래 ----------
create table public.trades (
  id            bigint generated always as identity primary key,
  source_key    text not null unique,           -- 원본 행 식별(중복 수집 방지)
  complex_id    uuid references public.complexes on delete set null,
  apt_seq       text,                           -- aptSeq 단지 일련번호
  sgg_cd        text not null,
  umd_cd        text,
  pnu           text,
  umd_nm        text,
  apt_nm        text,
  jibun         text,
  apt_dong      text,
  exclusive_m2  numeric(7, 2) not null,
  floor         int,
  price         int not null,                   -- 거래금액(만원)
  deal_date     date not null,
  build_year    int,
  is_direct     boolean not null default false, -- dealingGbn = '직거래'
  canceled      boolean not null default false, -- cdealType = 'O'
  cancel_date   date,
  fetched_at    timestamptz not null default now()
);
create index trades_complex_date on public.trades (complex_id, deal_date desc);
create index trades_sgg_date on public.trades (sgg_cd, deal_date desc);

create table public.rents (
  id               bigint generated always as identity primary key,
  source_key       text not null unique,
  complex_id       uuid references public.complexes on delete set null,
  sgg_cd           text not null,
  pnu              text,
  umd_nm           text,
  apt_nm           text,
  jibun            text,
  exclusive_m2     numeric(7, 2) not null,
  floor            int,
  deposit          int not null,                -- 보증금(만원)
  monthly_rent     int not null default 0,      -- 월세(만원), 0 이면 전세
  deal_date        date not null,
  build_year       int,
  contract_term    text,
  contract_type    text,                        -- 신규/갱신
  renew_used       boolean,                     -- useRRRight
  pre_deposit      int,
  pre_monthly_rent int,
  fetched_at       timestamptz not null default now()
);
create index rents_complex_date on public.rents (complex_id, deal_date desc);

-- ---------- 운영 로그 ----------
create table public.match_failures (
  id         bigint generated always as identity primary key,
  source     text not null,                     -- 'trade' | 'rent' | 'building' ...
  key        text not null,                     -- 같은 실패는 한 줄로 (예: aptSeq)
  sample     jsonb not null,
  candidates jsonb,
  reason     text not null,
  hits       int not null default 1,
  resolved   boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source, key)
);

create table public.ingest_runs (
  id          bigint generated always as identity primary key,
  job         text not null,
  params      jsonb,
  started_at  timestamptz not null default now(),
  finished_at timestamptz,
  rows_in     int,
  rows_ok     int,
  error       text
);

-- ---------- 보안: 공공데이터 테이블은 누구나 읽기, 쓰기는 서버(service_role)만 ----------
alter table public.regions         enable row level security;
alter table public.complexes       enable row level security;
alter table public.complex_parcels enable row level security;
alter table public.complex_aliases enable row level security;
alter table public.buildings       enable row level security;
alter table public.parking_facts   enable row level security;
alter table public.trades          enable row level security;
alter table public.rents           enable row level security;
alter table public.match_failures  enable row level security;
alter table public.ingest_runs     enable row level security;

create policy "public read" on public.regions       for select using (true);
create policy "public read" on public.complexes     for select using (true);
create policy "public read" on public.parking_facts for select using (true);
create policy "public read" on public.trades        for select using (true);
create policy "public read" on public.rents         for select using (true);
create policy "public read" on public.buildings     for select using (true);
-- match_failures / ingest_runs / aliases / parcels : 정책 없음 → anon·authenticated 접근 불가 (service_role 만)

grant usage on schema public to anon, authenticated, service_role;
grant select on all tables in schema public to anon, authenticated;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
