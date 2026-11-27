-- ============================================================
-- 3. 앱이 읽는 함수 (anon 키로 호출). 반환 JSON 키는 앱 타입(apps/mobile/src/data/types.ts)과 같다.
-- ============================================================

-- 울산 시군구 (지도 구·군 마커용 중심 좌표 포함)
insert into public.regions (code, level, name, center) values
  ('31110', 'sigungu', '중구',   'SRID=4326;POINT(129.3328 35.5694)'),
  ('31140', 'sigungu', '남구',   'SRID=4326;POINT(129.3301 35.5384)'),
  ('31170', 'sigungu', '동구',   'SRID=4326;POINT(129.4166 35.5050)'),
  ('31200', 'sigungu', '북구',   'SRID=4326;POINT(129.3650 35.6013)'),
  ('31710', 'sigungu', '울주군', 'SRID=4326;POINT(129.2423 35.5223)')
on conflict (code) do nothing;

-- ---------- 단지 요약 (머티리얼라이즈드 뷰: 수집 후 refresh_summaries() 로 갱신) ----------
create materialized view public.complex_summary_mv as
with rep as (
  -- 대표 평형 = 최근 3년 매매가 가장 많은 전용면적 (없으면 전체 기간)
  select distinct on (complex_id) complex_id, exclusive_m2
  from public.trades
  where complex_id is not null and not canceled
  group by complex_id, exclusive_m2
  order by complex_id, count(*) filter (where deal_date >= current_date - interval '3 years') desc, count(*) desc, exclusive_m2
),
last_sale as (
  select distinct on (t.complex_id) t.complex_id, t.price, t.deal_date
  from public.trades t join rep on rep.complex_id = t.complex_id and rep.exclusive_m2 = t.exclusive_m2
  where not t.canceled
  order by t.complex_id, t.deal_date desc, t.id desc
),
park as (
  select distinct on (complex_id) complex_id, source, total, as_of
  from public.parking_facts where total > 0
  order by complex_id, (source = 'kapt') desc
)
select
  c.id, c.name, c.sigungu_code, c.bjdong_code, c.dong_name, c.road_address, c.location,
  c.house_type, c.approved_date, extract(year from c.approved_date)::int as approved_year,
  c.households, rep.exclusive_m2 as rep_m2,
  ls.price as last_price, ls.deal_date as last_date,
  case when rep.exclusive_m2 > 0 then round(ls.price / (rep.exclusive_m2 / 3.305785))::int end as price_per_pyeong,
  case when c.households > 0 then round(park.total::numeric / c.households, 2) end as parking_per_hh,
  park.source as parking_source, park.as_of as parking_as_of
from public.complexes c
left join rep on rep.complex_id = c.id
left join last_sale ls on ls.complex_id = c.id
left join park on park.complex_id = c.id;

create unique index complex_summary_mv_id on public.complex_summary_mv (id);
create index complex_summary_mv_loc on public.complex_summary_mv using gist (location);

create or replace function public.refresh_summaries() returns void
language sql security definer set search_path = public, extensions as $$
  refresh materialized view concurrently public.complex_summary_mv;
$$;
revoke all on function public.refresh_summaries() from public, anon, authenticated;
grant execute on function public.refresh_summaries() to service_role;
grant select on public.complex_summary_mv to anon, authenticated, service_role;

create or replace function public.parking_source_label(src text) returns text
language sql immutable as $$
  select case src when 'kapt' then '공동주택 상세정보(K-apt)' when 'bldrgst' then '건축물대장' else src end
$$;

-- 요약 한 줄 → 앱 ComplexSummary JSON
create or replace function public.summary_json(s public.complex_summary_mv) returns jsonb
language sql stable as $$
  select jsonb_build_object(
    'id', s.id, 'name', s.name, 'sigunguCode', s.sigungu_code, 'dongName', coalesce(s.dong_name, ''),
    'roadAddress', coalesce(s.road_address, ''),
    'location', case when s.location is not null then jsonb_build_object(
        'lat', extensions.st_y(s.location::extensions.geometry), 'lng', extensions.st_x(s.location::extensions.geometry)) end,
    'houseType', s.house_type, 'approvedDate', coalesce(s.approved_date::text, ''),
    'households', coalesce(s.households, 0),
    'representativeM2', coalesce(s.rep_m2, 0),
    'recentPrice', case when s.last_price is not null then jsonb_build_object(
        'value', s.last_price, 'source', '국토교통부 실거래가 (' || s.last_date || ' 거래)', 'asOf', s.last_date) end,
    'pricePerPyeong', s.price_per_pyeong,
    'parkingPerHousehold', case when s.parking_per_hh is not null then jsonb_build_object(
        'value', s.parking_per_hh, 'source', public.parking_source_label(s.parking_source), 'asOf', s.parking_as_of) end
  )
$$;

-- 필터 조건 (앱 ComplexFilters)
create or replace function public.summary_matches(s public.complex_summary_mv, f jsonb) returns boolean
language sql immutable as $$
  select (f->>'priceMin' is null or s.last_price >= (f->>'priceMin')::int)
     and (f->>'priceMax' is null or s.last_price <= (f->>'priceMax')::int)
     and (f->>'areaMin' is null or s.rep_m2 >= (f->>'areaMin')::numeric)
     and (f->>'areaMax' is null or s.rep_m2 <= (f->>'areaMax')::numeric)
     and (f->>'builtAfter' is null or s.approved_year >= (f->>'builtAfter')::int)
     and (f->>'householdsMin' is null or s.households >= (f->>'householdsMin')::int)
     and (f->>'parkingMin' is null or s.parking_per_hh >= (f->>'parkingMin')::numeric)
$$;

create or replace function public.bbox_geom(sw_lat float8, sw_lng float8, ne_lat float8, ne_lng float8)
returns extensions.geometry language sql immutable as $$
  select extensions.st_makeenvelope(sw_lng, sw_lat, ne_lng, ne_lat, 4326)
$$;

-- ---------- 지도 마커 ----------
create or replace function public.map_markers(
  sw_lat float8, sw_lng float8, ne_lat float8, ne_lng float8, mode text, filters jsonb default '{}'
) returns jsonb
language sql stable as $$
  with s as (
    select * from public.complex_summary_mv m
    where m.location is not null and public.summary_matches(m, coalesce(filters, '{}'))
  )
  select coalesce(jsonb_agg(x), '[]') from (
    -- 단지 단위: 화면 안만
    select jsonb_build_object('kind', 'complex', 'id', s.id, 'name', s.name,
             'location', jsonb_build_object('lat', extensions.st_y(s.location::extensions.geometry), 'lng', extensions.st_x(s.location::extensions.geometry)),
             'recentPrice', s.last_price, 'pricePerPyeong', s.price_per_pyeong) x
    from (select * from s
          where mode = 'complex'
            and extensions.st_intersects(s.location::extensions.geometry, public.bbox_geom(sw_lat, sw_lng, ne_lat, ne_lng))
          order by s.households desc nulls last
          limit 400) s  -- 한 화면 최대 400개 (성능)
    union all
    -- 동 단위
    select jsonb_build_object('kind', 'region', 'id', 'dong:' || r.code, 'name', r.name,
             'location', jsonb_build_object('lat', extensions.st_y(r.center::extensions.geometry), 'lng', extensions.st_x(r.center::extensions.geometry)),
             'count', count(*), 'avgPricePerPyeong', round(avg(s.price_per_pyeong))::int)
    from s join public.regions r on r.code = s.bjdong_code
    where mode = 'dong' and r.center is not null
      and extensions.st_intersects(r.center::extensions.geometry, public.bbox_geom(sw_lat, sw_lng, ne_lat, ne_lng))
    group by r.code, r.name, r.center
    union all
    -- 구·군 단위
    select jsonb_build_object('kind', 'region', 'id', 'sgg:' || r.code, 'name', r.name,
             'location', jsonb_build_object('lat', extensions.st_y(r.center::extensions.geometry), 'lng', extensions.st_x(r.center::extensions.geometry)),
             'count', count(*), 'avgPricePerPyeong', round(avg(s.price_per_pyeong))::int)
    from s join public.regions r on r.code = s.sigungu_code
    where mode = 'sigungu'
    group by r.code, r.name, r.center
  ) t
$$;

-- ---------- 목록 ----------
create or replace function public.list_complexes(
  filters jsonb default '{}', sw_lat float8 default null, sw_lng float8 default null,
  ne_lat float8 default null, ne_lng float8 default null, max_rows int default 300
) returns jsonb
language sql stable as $$
  select coalesce(jsonb_agg(public.summary_json(m) order by m.households desc nulls last), '[]')
  from (
    select * from public.complex_summary_mv m
    where public.summary_matches(m, coalesce(filters, '{}'))
      and (sw_lat is null or (m.location is not null and
           extensions.st_intersects(m.location::extensions.geometry, public.bbox_geom(sw_lat, sw_lng, ne_lat, ne_lng))))
    order by m.households desc nulls last
    limit least(max_rows, 500)
  ) m
$$;

create or replace function public.complex_summary(p_id uuid) returns jsonb
language sql stable as $$
  select public.summary_json(m) from public.complex_summary_mv m where m.id = p_id
$$;

-- ---------- 단지 상세 ----------
create or replace function public.complex_detail(p_id uuid) returns jsonb
language sql stable as $$
  with m as (select * from public.complex_summary_mv where id = p_id),
  c as (select * from public.complexes where id = p_id),
  last_jeonse as (
    select r.deposit, r.deal_date from public.rents r, m
    where r.complex_id = p_id and r.monthly_rent = 0 and r.exclusive_m2 = m.rep_m2
    order by r.deal_date desc, r.id desc limit 1
  ),
  areas as (
    select exclusive_m2, count(*) n from public.trades where complex_id = p_id group by exclusive_m2
    union
    select exclusive_m2, count(*) from public.rents where complex_id = p_id group by exclusive_m2
  ),
  rank_in_dong as (
    select count(*) filter (where o.parking_per_hh > m.parking_per_hh) + 1 as position, count(*) as total
    from public.complex_summary_mv o, m
    where o.bjdong_code = m.bjdong_code and o.parking_per_hh is not null and m.parking_per_hh is not null
  )
  select public.summary_json(m) || jsonb_build_object(
    'jibunAddress', coalesce(c.jibun_address, ''),
    'dongCount', c.dong_count, 'topFloor', c.top_floor, 'builder', c.builder,
    'heating', c.heating, 'hallType', c.hall_type,
    'far', c.far, 'bcr', c.bcr,
    'areaTypes', coalesce((select jsonb_agg(jsonb_build_object('exclusiveM2', a.exclusive_m2, 'supplyM2', null, 'households', null)
                                            order by a.exclusive_m2)
                           from (select exclusive_m2 from areas group by exclusive_m2) a), '[]'),
    'recentJeonse', (select jsonb_build_object('value', j.deposit, 'source', '국토교통부 전월세 실거래가 (' || j.deal_date || ' 거래)', 'asOf', j.deal_date) from last_jeonse j),
    'parking', jsonb_build_object(
      'facts', coalesce((select jsonb_agg(jsonb_build_object(
                  'source', p.source, 'sourceLabel', public.parking_source_label(p.source), 'asOf', p.as_of,
                  'ground', p.ground_total, 'underground', p.under_total,
                  'indoorSelf', p.indoor_self, 'indoorMech', p.indoor_mech,
                  'outdoorSelf', p.outdoor_self, 'outdoorMech', p.outdoor_mech) order by (p.source = 'kapt') desc)
                 from public.parking_facts p where p.complex_id = p_id), '[]'),
      'elevatorToUnderground', null,
      'dongRank', (select jsonb_build_object('position', position, 'total', total, 'dongName', coalesce(m.dong_name, '')) from rank_in_dong),
      'evChargers', case when c.ev_chargers_ground is not null or c.ev_chargers_underground is not null then
                      jsonb_build_object('value', coalesce(c.ev_chargers_ground, 0) + coalesce(c.ev_chargers_underground, 0),
                                         'source', '공동주택 상세정보(K-apt) 단지 내 충전기', 'asOf', c.detail_fetched_at::date) end,
      'reviews', jsonb_build_object('average', 0, 'count', 0, 'recent', '[]'::jsonb)
    )
  )
  from m, c
$$;

-- ---------- 거래 내역 (매매 + 전월세) ----------
create or replace function public.complex_trades(p_id uuid) returns jsonb
language sql stable as $$
  select coalesce(jsonb_agg(x order by x->>'date' desc), '[]') from (
    select jsonb_build_object('id', 't' || id, 'dealType', 'sale', 'date', deal_date, 'floor', floor,
             'exclusiveM2', exclusive_m2, 'price', price, 'isDirect', is_direct, 'canceled', canceled) x
    from public.trades where complex_id = p_id
    union all
    select jsonb_build_object('id', 'r' || id, 'dealType', case when monthly_rent = 0 then 'jeonse' else 'monthly' end,
             'date', deal_date, 'floor', floor, 'exclusiveM2', exclusive_m2, 'price', deposit,
             'monthlyRent', nullif(monthly_rent, 0), 'isDirect', false, 'canceled', false)
    from public.rents where complex_id = p_id
  ) t
$$;

-- ---------- 검색 ----------
create or replace function public.search_all(q text) returns jsonb
language sql stable as $$
  with qn as (select public.norm_name(q) n, trim(q) raw)
  select coalesce(jsonb_agg(x), '[]') from (
    (select jsonb_build_object('kind', 'dong', 'id', r.code, 'title', r.name,
              'subtitle', '울산 ' || coalesce((select name from public.regions p where p.code = r.parent_code), ''),
              'location', jsonb_build_object('lat', extensions.st_y(r.center::extensions.geometry), 'lng', extensions.st_x(r.center::extensions.geometry))) x
     from public.regions r, qn
     where r.level = 'dong' and r.center is not null and qn.raw <> '' and r.name like '%' || qn.raw || '%'
     limit 5)
    union all
    (select jsonb_build_object('kind', 'complex', 'id', m.id, 'title', m.name,
              'subtitle', coalesce((select name from public.regions p where p.code = m.sigungu_code), '') || ' ' ||
                          coalesce(m.dong_name, '') || ' · ' || coalesce(m.households, 0) || '세대',
              'location', jsonb_build_object('lat', extensions.st_y(m.location::extensions.geometry), 'lng', extensions.st_x(m.location::extensions.geometry)))
     from public.complex_summary_mv m, qn
     where qn.n <> '' and m.location is not null
       and (public.norm_name(m.name) like '%' || qn.n || '%' or extensions.similarity(public.norm_name(m.name), qn.n) > 0.3)
     order by (public.norm_name(m.name) like qn.n || '%') desc, extensions.similarity(public.norm_name(m.name), qn.n) desc
     limit 15)
  ) t
$$;

-- ---------- 홈: 구·군별 최근 1개월 거래량과 평균 평당가 ----------
create or replace function public.region_summaries() returns jsonb
language sql stable as $$
  with latest as (select max(deal_date) d from public.trades where not canceled),
  t as (
    select tr.sgg_cd, tr.price / (tr.exclusive_m2 / 3.305785) ppy
    from public.trades tr, latest
    where not tr.canceled and tr.deal_date > latest.d - interval '30 days'
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'sigunguCode', r.code, 'name', r.name,
           'monthlyTrades', (select count(*) from t where t.sgg_cd = r.code),
           'avgPricePerPyeong', coalesce((select round(avg(ppy))::int from t where t.sgg_cd = r.code), 0),
           'asOf', (select d from latest), 'source', '국토교통부 실거래가 (최근 30일)') order by r.code), '[]')
  from public.regions r where r.level = 'sigungu'
$$;

grant execute on function public.map_markers(float8, float8, float8, float8, text, jsonb) to anon, authenticated;
grant execute on function public.list_complexes(jsonb, float8, float8, float8, float8, int) to anon, authenticated;
grant execute on function public.complex_summary(uuid) to anon, authenticated;
grant execute on function public.complex_detail(uuid) to anon, authenticated;
grant execute on function public.complex_trades(uuid) to anon, authenticated;
grant execute on function public.search_all(text) to anon, authenticated;
grant execute on function public.region_summaries() to anon, authenticated;
