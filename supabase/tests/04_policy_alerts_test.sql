\set ON_ERROR_STOP 1
set search_path = public, extensions;
do $$
declare cid uuid := (select id from complexes where kapt_code = 'A1'); j jsonb; ok boolean;
begin
  insert into policy_values (key, effective_from, value) values ('calculators', '2020-01-01', '{"v":1}'), ('calculators', '2026-01-01', '{"v":2}'), ('calculators', '2099-01-01', '{"v":3}');
  assert (public.current_policy('calculators')->'value'->>'v') = '2', '오늘 기준 최신 정책값';

  -- 사용자 A: 토큰 등록 + 구독
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);
  set local role authenticated;
  insert into push_tokens (token, platform) values ('ExponentPushToken[test-a]', 'android');
  insert into alert_subscriptions (complex_id) values (cid);
  -- 다른 사람 토큰은 못 봄 / 알림 목록 함수는 일반 사용자 실행 불가
  begin
    perform public.pending_trade_alerts(now() - interval '1 day');
    ok := false;
  exception when insufficient_privilege then ok := true;
  end;
  reset role;
  assert ok, '알림 함수는 서버 전용';

  j := public.pending_trade_alerts(now() - interval '1 hour');
  assert jsonb_array_length(j) = 1, '새 거래 알림 1건 ' || j::text;
  assert (j->0->>'count')::int = 2 and j->0->>'token' = 'ExponentPushToken[test-a]', '해제 제외 2건 ' || j::text;
  assert jsonb_array_length(public.pending_trade_alerts(now() + interval '1 hour')) = 0, '그 이후 새 거래 없음';
  raise notice '✅ 정책값·알림 테스트 통과';
end $$;
