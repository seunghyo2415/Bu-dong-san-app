-- ============================================================
-- 2. 수집(ingest) 함수: 수집기가 정리한 JSON 배열을 받아 저장 + 단지 매칭
--    서버 키(service_role)로만 실행 가능
-- ============================================================

-- 시군구코드 + 법정동 이름 → 법정동 10자리 (regions 에서 찾음)
create or replace function public.resolve_bjdong(sgg text, umd_nm text) returns text
language sql stable as $$
  select code from public.regions
  where level = 'dong' and parent_code = sgg
    and (name = trim(umd_nm) or name = split_part(trim(umd_nm), ' ', 2) or trim(umd_nm) like '% ' || name)
  order by (name = trim(umd_nm)) desc
  limit 1
$$;

-- 단지 매칭: 별칭 → 필지(PNU) → 같은 법정동 안 이름 유사도. 실패하면 match_failures 에 기록
create or replace function public.match_complex(
  p_source text, p_alias text, p_pnu text, p_bjdong text, p_sgg text, p_name text, p_sample jsonb
) returns uuid
language plpgsql as $$
declare
  v_id uuid;
  v_how text;
  v_norm text := public.norm_name(p_name);
begin
  if p_alias is not null then
    select complex_id into v_id from public.complex_aliases where alias = p_alias;
    if v_id is not null then return v_id; end if;
  end if;

  if p_pnu is not null then
    select cp.complex_id into v_id
    from public.complex_parcels cp join public.complexes c on c.id = cp.complex_id
    where cp.pnu = p_pnu
    order by extensions.similarity(c.name_norm, v_norm) desc
    limit 1;
    v_how := 'auto:pnu';
  end if;

  if v_id is null and v_norm <> '' then
    select c.id into v_id
    from public.complexes c
    where (p_bjdong is not null and c.bjdong_code = p_bjdong)
       or (p_bjdong is null and c.sigungu_code = p_sgg)
    order by (c.name_norm = v_norm) desc, extensions.similarity(c.name_norm, v_norm) desc
    limit 1;
    if v_id is not null and not exists (
      select 1 from public.complexes c where c.id = v_id
        and (c.name_norm = v_norm or extensions.similarity(c.name_norm, v_norm) >= 0.45
             or c.name_norm like '%' || v_norm || '%' or v_norm like '%' || c.name_norm || '%')
    ) then
      v_id := null;
    end if;
    v_how := 'auto:name';
  end if;

  if v_id is not null then
    if p_alias is not null then
      insert into public.complex_aliases (alias, complex_id, source) values (p_alias, v_id, v_how)
      on conflict (alias) do nothing;
    end if;
    return v_id;
  end if;

  insert into public.match_failures (source, key, sample, candidates, reason)
  values (
    p_source,
    coalesce(p_alias, coalesce(p_bjdong, p_sgg) || ':' || v_norm),
    p_sample,
    (select jsonb_agg(jsonb_build_object('id', id, 'name', name, 'score', round(s::numeric, 2)))
       from (select c.id, c.name, extensions.similarity(c.name_norm, v_norm) s
             from public.complexes c where c.sigungu_code = p_sgg
             order by s desc limit 3) t),
    case when p_bjdong is null then '법정동을 찾지 못함' else '같은 필지·비슷한 이름의 단지 없음' end
  )
  on conflict (source, key) do update
    set hits = public.match_failures.hits + 1, sample = excluded.sample,
        candidates = excluded.candidates, updated_at = now(), resolved = false;
  return null;
end $$;

-- ---------- 단지 목록 (getSigunguAptList4 / getLegaldongAptList4) ----------
-- rows: [{kapt_code, name, bjdong_code, sido, sigungu, dong, ri}]
create or replace function public.ingest_apt_list(rows jsonb) returns jsonb
language plpgsql as $$
declare n int;
begin
  insert into public.regions (code, level, name, parent_code)
  select distinct on (r->>'bjdong_code') r->>'bjdong_code', 'dong',
         coalesce(nullif(r->>'ri', ''), r->>'dong'), left(r->>'bjdong_code', 5)
  from jsonb_array_elements(rows) r
  where length(r->>'bjdong_code') = 10
  on conflict (code) do update set name = excluded.name, updated_at = now();

  insert into public.complexes (kapt_code, name, sigungu_code, bjdong_code, dong_name)
  select r->>'kapt_code', r->>'name', left(r->>'bjdong_code', 5), r->>'bjdong_code',
         coalesce(nullif(r->>'ri', ''), r->>'dong')
  from jsonb_array_elements(rows) r
  where r->>'kapt_code' is not null
  on conflict (kapt_code) do update
    set name = excluded.name, bjdong_code = excluded.bjdong_code, dong_name = excluded.dong_name, updated_at = now();
  get diagnostics n = row_count;
  return jsonb_build_object('rows', jsonb_array_length(rows), 'upserted', n);
end $$;

-- ---------- 공동주택 기본정보 (getAphusBassInfoV5) ----------
-- rows: [{kapt_code, name, jibun_address, jibun, road_address, bjdong_code, approved_date, households,
--         dong_count, top_floor, base_floor, builder, heating, hall_type, mgmt_type, sale_type}]
create or replace function public.ingest_kapt_basis(rows jsonb) returns jsonb
language plpgsql as $$
declare r jsonb; v_id uuid; v_pnu text; n int := 0;
begin
  for r in select * from jsonb_array_elements(rows) loop
    update public.complexes set
      name          = coalesce(r->>'name', name),
      jibun_address = r->>'jibun_address',
      road_address  = r->>'road_address',
      bjdong_code   = coalesce(r->>'bjdong_code', bjdong_code),
      sigungu_code  = coalesce(left(r->>'bjdong_code', 5), sigungu_code),
      approved_date = (r->>'approved_date')::date,
      households    = (r->>'households')::int,
      dong_count    = (r->>'dong_count')::int,
      top_floor     = (r->>'top_floor')::int,
      base_floor    = (r->>'base_floor')::int,
      builder       = r->>'builder',
      heating       = r->>'heating',
      hall_type     = r->>'hall_type',
      mgmt_type     = r->>'mgmt_type',
      sale_type     = r->>'sale_type',
      basis_fetched_at = now(), updated_at = now()
    where kapt_code = r->>'kapt_code'
    returning id into v_id;
    if v_id is null then continue; end if;
    n := n + 1;
    v_pnu := public.make_pnu(r->>'bjdong_code', r->>'jibun');
    if v_pnu is not null then
      insert into public.complex_parcels (complex_id, pnu, source) values (v_id, v_pnu, 'kapt')
      on conflict do nothing;
    end if;
  end loop;
  return jsonb_build_object('rows', jsonb_array_length(rows), 'updated', n);
end $$;

-- ---------- 공동주택 상세정보 (getAphusDtlInfoV5) ----------
-- rows: [{kapt_code, parking_ground, parking_under, ev_ground, ev_under, bus_stop_distance}]
create or replace function public.ingest_kapt_detail(rows jsonb) returns jsonb
language plpgsql as $$
declare r jsonb; v_id uuid; n int := 0;
begin
  for r in select * from jsonb_array_elements(rows) loop
    update public.complexes set
      ev_chargers_ground = (r->>'ev_ground')::int,
      ev_chargers_underground = (r->>'ev_under')::int,
      bus_stop_distance = r->>'bus_stop_distance',
      detail_fetched_at = now(), updated_at = now()
    where kapt_code = r->>'kapt_code'
    returning id into v_id;
    if v_id is null then continue; end if;
    n := n + 1;
    if r->>'parking_ground' is not null or r->>'parking_under' is not null then
      insert into public.parking_facts (complex_id, source, ground_total, under_total, as_of)
      values (v_id, 'kapt', (r->>'parking_ground')::int, (r->>'parking_under')::int, current_date)
      on conflict (complex_id, source) do update
        set ground_total = excluded.ground_total, under_total = excluded.under_total, as_of = excluded.as_of;
    end if;
  end loop;
  return jsonb_build_object('rows', jsonb_array_length(rows), 'updated', n);
end $$;

-- ---------- 좌표 (카카오 주소 검색 결과) ----------
-- rows: [{kapt_code, lat, lng, pnu?}]
create or replace function public.set_complex_locations(rows jsonb) returns jsonb
language plpgsql as $$
declare r jsonb; v_id uuid; n int := 0;
begin
  for r in select * from jsonb_array_elements(rows) loop
    update public.complexes
      set location = extensions.st_setsrid(extensions.st_makepoint((r->>'lng')::float8, (r->>'lat')::float8), 4326)::extensions.geography,
          geocoded_at = now()
    where kapt_code = r->>'kapt_code'
    returning id into v_id;
    if v_id is null then continue; end if;
    n := n + 1;
    if length(r->>'pnu') = 19 then
      insert into public.complex_parcels (complex_id, pnu, source) values (v_id, r->>'pnu', 'kakao')
      on conflict do nothing;
    end if;
  end loop;
  -- 동 중심 좌표 = 그 동 단지들의 평균 위치 (지도 동 단위 마커용)
  update public.regions g set center = s.c
  from (select bjdong_code, extensions.st_centroid(extensions.st_collect(location::extensions.geometry))::extensions.geography c
        from public.complexes where location is not null group by bjdong_code) s
  where g.code = s.bjdong_code;
  return jsonb_build_object('rows', jsonb_array_length(rows), 'updated', n);
end $$;

-- ---------- 건축물대장 (getBrRecapTitleInfo / getBrTitleInfo) ----------
-- rows: [{mgm_bldrgst_pk, kind, pnu, name, dong_name, main_purpose, structure, approved_date, ground_floors,
--         under_floors, households, far, bcr, indoor_self, indoor_mech, outdoor_self, outdoor_mech, raw}]
create or replace function public.ingest_buildings(rows jsonb) returns jsonb
language plpgsql as $$
declare n int;
begin
  insert into public.buildings (mgm_bldrgst_pk, kind, pnu, complex_id, name, dong_name, main_purpose, structure,
    approved_date, ground_floors, under_floors, households, far, bcr,
    indoor_self, indoor_mech, outdoor_self, outdoor_mech, raw)
  select r->>'mgm_bldrgst_pk', r->>'kind', r->>'pnu',
         (select complex_id from public.complex_parcels cp where cp.pnu = r->>'pnu' limit 1),
         r->>'name', r->>'dong_name', r->>'main_purpose', r->>'structure',
         (r->>'approved_date')::date, (r->>'ground_floors')::int, (r->>'under_floors')::int,
         (r->>'households')::int, (r->>'far')::numeric, (r->>'bcr')::numeric,
         (r->>'indoor_self')::int, (r->>'indoor_mech')::int, (r->>'outdoor_self')::int, (r->>'outdoor_mech')::int,
         coalesce(r->'raw', '{}'::jsonb)
  from jsonb_array_elements(rows) r
  on conflict (mgm_bldrgst_pk) do update set
    kind = excluded.kind, pnu = excluded.pnu, complex_id = excluded.complex_id, name = excluded.name,
    dong_name = excluded.dong_name, main_purpose = excluded.main_purpose, structure = excluded.structure,
    approved_date = excluded.approved_date, ground_floors = excluded.ground_floors, under_floors = excluded.under_floors,
    households = excluded.households, far = excluded.far, bcr = excluded.bcr,
    indoor_self = excluded.indoor_self, indoor_mech = excluded.indoor_mech,
    outdoor_self = excluded.outdoor_self, outdoor_mech = excluded.outdoor_mech,
    raw = excluded.raw, fetched_at = now();
  get diagnostics n = row_count;

  -- 단지별 건축물대장 주차: 총괄표제부가 있으면 그것, 없으면 표제부(동별) 합계
  insert into public.parking_facts (complex_id, source, ground_total, under_total,
                                    indoor_self, indoor_mech, outdoor_self, outdoor_mech, as_of)
  select complex_id, 'bldrgst',
         sum(coalesce(outdoor_self, 0) + coalesce(outdoor_mech, 0)),
         sum(coalesce(indoor_self, 0) + coalesce(indoor_mech, 0)),
         sum(indoor_self), sum(indoor_mech), sum(outdoor_self), sum(outdoor_mech), current_date
  from (
    select b.*, bool_or(b.kind = 'recap') over (partition by b.complex_id) has_recap
    from public.buildings b
    where b.complex_id in (select distinct complex_id from public.complex_parcels cp
                           where cp.pnu in (select r->>'pnu' from jsonb_array_elements(rows) r))
  ) x
  where (has_recap and kind = 'recap') or (not has_recap and kind = 'title')
  group by complex_id
  having sum(coalesce(indoor_self,0)+coalesce(indoor_mech,0)+coalesce(outdoor_self,0)+coalesce(outdoor_mech,0)) > 0
  on conflict (complex_id, source) do update set
    ground_total = excluded.ground_total, under_total = excluded.under_total,
    indoor_self = excluded.indoor_self, indoor_mech = excluded.indoor_mech,
    outdoor_self = excluded.outdoor_self, outdoor_mech = excluded.outdoor_mech, as_of = excluded.as_of;

  -- 용적률·건폐율은 총괄표제부 값으로
  update public.complexes c set far = b.far, bcr = b.bcr
  from public.buildings b
  where b.complex_id = c.id and b.kind = 'recap' and b.pnu in (select r->>'pnu' from jsonb_array_elements(rows) r);

  return jsonb_build_object('rows', jsonb_array_length(rows), 'upserted', n);
end $$;

-- ---------- 아파트 매매 실거래 (getRTMSDataSvcAptTradeDev) ----------
-- rows: [{source_key, apt_seq, sgg_cd, umd_cd, umd_nm, apt_nm, jibun, apt_dong, exclusive_m2, floor, price,
--         deal_date, build_year, is_direct, canceled, cancel_date}]
create or replace function public.ingest_trades(rows jsonb) returns jsonb
language plpgsql as $$
declare r jsonb; v_bjd text; v_pnu text; v_id uuid; n_match int := 0;
begin
  -- 실거래에 들어 있는 법정동 코드·이름으로 지역표를 보강
  insert into public.regions (code, level, name, parent_code)
  select distinct on (code) code, 'dong', umd_nm, sgg
  from (select (e->>'sgg_cd') || (e->>'umd_cd') code, e->>'umd_nm' umd_nm, e->>'sgg_cd' sgg
        from jsonb_array_elements(rows) e where length(e->>'umd_cd') = 5) t
  on conflict (code) do nothing;

  for r in select * from jsonb_array_elements(rows) loop
    v_bjd := case when length(r->>'umd_cd') = 5 then (r->>'sgg_cd') || (r->>'umd_cd')
                  else public.resolve_bjdong(r->>'sgg_cd', r->>'umd_nm') end;
    v_pnu := public.make_pnu(v_bjd, r->>'jibun');
    v_id := public.match_complex('trade',
              case when nullif(r->>'apt_seq', '') is not null then 'aptSeq:' || (r->>'apt_seq') end,
              v_pnu, v_bjd, r->>'sgg_cd', r->>'apt_nm', r);
    if v_id is not null then n_match := n_match + 1; end if;
    insert into public.trades (source_key, complex_id, apt_seq, sgg_cd, umd_cd, pnu, umd_nm, apt_nm, jibun, apt_dong,
      exclusive_m2, floor, price, deal_date, build_year, is_direct, canceled, cancel_date)
    values (r->>'source_key', v_id, r->>'apt_seq', r->>'sgg_cd', r->>'umd_cd', v_pnu, r->>'umd_nm', r->>'apt_nm',
      r->>'jibun', r->>'apt_dong', (r->>'exclusive_m2')::numeric, (r->>'floor')::int, (r->>'price')::int,
      (r->>'deal_date')::date, (r->>'build_year')::int, coalesce((r->>'is_direct')::boolean, false),
      coalesce((r->>'canceled')::boolean, false), (r->>'cancel_date')::date)
    on conflict (source_key) do update set
      complex_id = coalesce(excluded.complex_id, public.trades.complex_id),
      canceled = excluded.canceled, cancel_date = excluded.cancel_date,
      is_direct = excluded.is_direct, fetched_at = now();
  end loop;
  return jsonb_build_object('rows', jsonb_array_length(rows), 'matched', n_match);
end $$;

-- ---------- 아파트 전월세 (getRTMSDataSvcAptRent) ----------
-- rows: [{source_key, sgg_cd, umd_nm, apt_nm, jibun, exclusive_m2, floor, deposit, monthly_rent, deal_date,
--         build_year, contract_term, contract_type, renew_used, pre_deposit, pre_monthly_rent}]
create or replace function public.ingest_rents(rows jsonb) returns jsonb
language plpgsql as $$
declare r jsonb; v_bjd text; v_pnu text; v_id uuid; n_match int := 0;
begin
  for r in select * from jsonb_array_elements(rows) loop
    v_bjd := public.resolve_bjdong(r->>'sgg_cd', r->>'umd_nm');
    v_pnu := public.make_pnu(v_bjd, r->>'jibun');
    v_id := public.match_complex('rent',
              'rent:' || (r->>'sgg_cd') || ':' || coalesce(r->>'umd_nm', '') || ':' || coalesce(r->>'jibun', '')
                      || ':' || public.norm_name(r->>'apt_nm'),
              v_pnu, v_bjd, r->>'sgg_cd', r->>'apt_nm', r);
    if v_id is not null then n_match := n_match + 1; end if;
    insert into public.rents (source_key, complex_id, sgg_cd, pnu, umd_nm, apt_nm, jibun, exclusive_m2, floor,
      deposit, monthly_rent, deal_date, build_year, contract_term, contract_type, renew_used, pre_deposit, pre_monthly_rent)
    values (r->>'source_key', v_id, r->>'sgg_cd', v_pnu, r->>'umd_nm', r->>'apt_nm', r->>'jibun',
      (r->>'exclusive_m2')::numeric, (r->>'floor')::int, (r->>'deposit')::int, coalesce((r->>'monthly_rent')::int, 0),
      (r->>'deal_date')::date, (r->>'build_year')::int, r->>'contract_term', r->>'contract_type',
      (r->>'renew_used')::boolean, (r->>'pre_deposit')::int, (r->>'pre_monthly_rent')::int)
    on conflict (source_key) do update set
      complex_id = coalesce(excluded.complex_id, public.rents.complex_id), fetched_at = now();
  end loop;
  return jsonb_build_object('rows', jsonb_array_length(rows), 'matched', n_match);
end $$;

-- 매칭 실패했던 거래를 다시 매칭 (단지 정보가 늘어난 뒤 실행)
create or replace function public.rematch_unmatched() returns jsonb
language plpgsql as $$
declare t record; v_id uuid; n int := 0;
begin
  for t in select id, apt_seq, pnu, sgg_cd, umd_cd, umd_nm, apt_nm from public.trades where complex_id is null loop
    v_id := public.match_complex('trade', case when t.apt_seq is not null then 'aptSeq:' || t.apt_seq end,
              t.pnu, case when t.umd_cd is not null then t.sgg_cd || t.umd_cd end, t.sgg_cd, t.apt_nm, to_jsonb(t));
    if v_id is not null then update public.trades set complex_id = v_id where id = t.id; n := n + 1; end if;
  end loop;
  for t in select id, pnu, sgg_cd, umd_nm, apt_nm, jibun from public.rents where complex_id is null loop
    v_id := public.match_complex('rent', 'rent:' || t.sgg_cd || ':' || coalesce(t.umd_nm,'') || ':' || coalesce(t.jibun,'')
              || ':' || public.norm_name(t.apt_nm), t.pnu, public.resolve_bjdong(t.sgg_cd, t.umd_nm), t.sgg_cd, t.apt_nm, to_jsonb(t));
    if v_id is not null then update public.rents set complex_id = v_id where id = t.id; n := n + 1; end if;
  end loop;
  update public.match_failures set resolved = true
  where source = 'trade' and key like 'aptSeq:%' and key in (select alias from public.complex_aliases);
  return jsonb_build_object('rematched', n);
end $$;

-- 수집 함수는 서버 키로만
do $$
declare f text;
begin
  foreach f in array array[
    'ingest_apt_list(jsonb)', 'ingest_kapt_basis(jsonb)', 'ingest_kapt_detail(jsonb)', 'set_complex_locations(jsonb)',
    'ingest_buildings(jsonb)', 'ingest_trades(jsonb)', 'ingest_rents(jsonb)', 'rematch_unmatched()',
    'match_complex(text,text,text,text,text,text,jsonb)'
  ] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
end $$;
