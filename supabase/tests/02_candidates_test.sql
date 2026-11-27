\set ON_ERROR_STOP 1
set search_path = public, extensions;
-- 01 테스트에서 만든 단지(삼산테스트아파트 35.5405,129.3365 / 삼산 다른마을 2차 / 구영 숲마을)를 그대로 사용
do $$
declare j jsonb;
begin
  j := public.find_complex_candidates(q => '삼산테스트');
  assert j->0->>'name' = '삼산테스트아파트', '이름으로 1순위 ' || j::text;
  j := public.find_complex_candidates(lat => 35.5406, lng => 129.3366);
  assert j->0->>'name' = '삼산테스트아파트', '좌표로 1순위 ' || j::text;
  assert (j->0->>'distanceM')::int < 50, '거리';
  j := public.find_complex_candidates(q => '다른마을', lat => 35.5406, lng => 129.3366);
  assert j->0->>'name' = '삼산 다른마을 2차', '이름+좌표 ' || j::text;
  j := public.find_complex_candidates(q => '없는이름xyz');
  assert jsonb_array_length(j) = 0, '후보 없음 ' || j::text;
  raise notice '✅ 후보 찾기 테스트 통과';
end $$;
