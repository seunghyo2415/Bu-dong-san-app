\set ON_ERROR_STOP 1
set search_path = public, extensions;
-- 테스트 사용자 3명
insert into auth.users (id) values ('00000000-0000-0000-0000-0000000000a1'), ('00000000-0000-0000-0000-0000000000b2'), ('00000000-0000-0000-0000-0000000000c3'), ('00000000-0000-0000-0000-0000000000d4');

do $$
declare cid uuid := (select id from complexes where kapt_code = 'A1'); pid bigint; j jsonb; ok boolean;
begin
  -- 사용자 A 로 로그인한 것처럼
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);
  set local role authenticated;
  insert into profiles (nickname) values ('삼산주민');
  -- 남의 user_id 로 써도 내 id 로 바뀌고, 전화번호·금칙어는 가려짐
  insert into posts (complex_id, user_id, category, body)
  values (cid, '00000000-0000-0000-0000-0000000000b2', 'review', '주차 넉넉해요 문의 010-1234-5678 병신같은 관리') returning id into pid;
  assert (select user_id from posts where id = pid) = '00000000-0000-0000-0000-0000000000a1', 'user_id 위조 방지';
  assert (select body from posts where id = pid) = '주차 넉넉해요 문의 010-****-**** **같은 관리', '가리기: ' || (select body from posts where id = pid);
  insert into parking_reviews (complex_id, score, comment) values (cid, 4, '밤 10시에도 자리 있음');
  reset role;

  -- 사용자 B: 댓글, 그리고 A 를 차단하면 A 글이 안 보임
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b2', true);
  set local role authenticated;
  insert into comments (post_id, body) values (pid, '정보 감사해요');
  assert jsonb_array_length(public.list_posts(cid)) = 1, '차단 전 1개';
  assert (public.list_posts(cid)->0->>'commentCount')::int = 1, '댓글 수';
  assert public.list_posts(cid)->0->>'nickname' = '삼산주민', '닉네임';
  insert into blocks (blocked_id) values ('00000000-0000-0000-0000-0000000000a1');
  assert jsonb_array_length(public.list_posts(cid)) = 0, '차단 후 안 보임';
  insert into parking_reviews (complex_id, score) values (cid, 2);
  -- B 는 A 의 글을 지울 수 없음 (RLS: 0건 삭제)
  delete from posts where id = pid;
  reset role;
  assert exists (select 1 from posts where id = pid), '남의 글 삭제 불가';

  -- 신고 3건 → 자동 숨김
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b2', true);
  set local role authenticated; insert into reports (target_type, target_id, reason) values ('post', pid, '욕설'); reset role;
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c3', true);
  set local role authenticated; insert into reports (target_type, target_id, reason) values ('post', pid, '광고'); reset role;
  assert not (select hidden from posts where id = pid), '2건은 아직 보임';
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000d4', true);
  set local role authenticated;
  insert into reports (target_type, target_id, reason) values ('post', pid, '도배');
  assert jsonb_array_length(public.list_posts(cid)) = 0, '3건이면 숨김';
  reset role;
  -- 글쓴이 본인은 숨김 글도 자기 것은 볼 수 있음
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);
  set local role authenticated;
  assert (select count(*) from posts where id = pid) = 1, '본인은 숨김 글 확인 가능';
  -- 신고 수를 직접 고칠 수 없음
  update posts set report_count = 0, hidden = false where id = pid;
  reset role;
  assert (select hidden from posts where id = pid), '숨김 해제 위조 불가';

  -- 로그인 안 한 사용자(anon)는 글쓰기 불가
  perform set_config('request.jwt.claim.sub', '', true);
  set local role anon;
  begin
    insert into posts (complex_id, category, body) values (cid, 'question', '익명 글');
    ok := false;
  exception when others then ok := true;
  end;
  reset role;
  assert ok, 'anon 글쓰기 차단';

  -- 상세 화면의 주차 체감 평가
  j := public.complex_detail(cid);
  assert (j->'parking'->'reviews'->>'count')::int = 2 and (j->'parking'->'reviews'->>'average')::numeric = 3.0, '평가 평균 ' || (j->'parking'->'reviews')::text;
  assert j->'parking'->'reviews'->'recent'->0->>'comment' = '밤 10시에도 자리 있음', '최근 한줄평';
  assert public.complex_detail('00000000-0000-0000-0000-000000000000') is null, '없는 단지는 null';

  raise notice '✅ 커뮤니티(가리기·차단·신고·권한·평가) 테스트 통과';
end $$;
-- 신고 후에도 작성자가 바뀌지 않았는지 (회귀 테스트)
do $$ begin
  assert (select count(*) from posts where user_id = '00000000-0000-0000-0000-0000000000a1') = 1, '신고 뒤에도 작성자 유지';
  raise notice '✅ 작성자 유지 확인';
end $$;
