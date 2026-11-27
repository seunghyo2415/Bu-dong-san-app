-- ============================================================
-- 4. 공유 매물 → 단지 후보 찾기 ("어느 건물인가요?")
--    이름 유사도 + (좌표가 있으면) 거리로 점수. 앱(anon)에서 호출
-- ============================================================
create or replace function public.find_complex_candidates(
  q text default null, lat float8 default null, lng float8 default null, dong text default null, max_rows int default 8
) returns jsonb
language sql stable as $$
  with p as (
    select public.norm_name(q) n,
           case when lat is not null and lng is not null
                then extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography end g
  ),
  scored as (
    select m.*,
           case when p.n <> '' then extensions.similarity(public.norm_name(m.name), p.n) else 0 end
             + case when p.n <> '' and (public.norm_name(m.name) like '%' || p.n || '%' or p.n like '%' || public.norm_name(m.name) || '%') then 0.3 else 0 end
             as name_score,
           case when p.g is not null and m.location is not null then extensions.st_distance(m.location, p.g) end as dist
    from public.complex_summary_mv m, p
    where (dong is null or m.dong_name = dong or p.g is not null or p.n <> '')
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', s.id, 'name', s.name,
           'subtitle', coalesce(s.dong_name, '') || ' · ' || coalesce(s.households, 0) || '세대'
                       || case when s.dist is not null then ' · ' || round(s.dist) || 'm' else '' end,
           'location', case when s.location is not null then jsonb_build_object(
               'lat', extensions.st_y(s.location::extensions.geometry), 'lng', extensions.st_x(s.location::extensions.geometry)) end,
           'distanceM', round(s.dist),
           'score', round((s.name_score + case when s.dist is null then 0 else greatest(0, 1 - s.dist / 500) end)::numeric, 2)
         ) order by s.name_score + case when s.dist is null then 0 else greatest(0, 1 - s.dist / 500) end desc), '[]')
  from (
    select * from scored
    where name_score >= 0.2 or (dist is not null and dist <= 500) or (dong is not null and dong_name = dong)
    order by name_score + case when dist is null then 0 else greatest(0, 1 - dist / 500) end desc
    limit least(max_rows, 20)
  ) s
$$;
grant execute on function public.find_complex_candidates(text, float8, float8, text, int) to anon, authenticated;
