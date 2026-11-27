-- 로컬 테스트: 가짜 데이터로 수집 → 매칭 → 앱 조회 흐름 확인. 실패하면 예외 발생.
\set ON_ERROR_STOP 1
set search_path = public, extensions;

select public.ingest_apt_list('[
 {"kapt_code":"A1","name":"삼산테스트아파트","bjdong_code":"3114010100","sido":"울산광역시","sigungu":"남구","dong":"삼산동","ri":""},
 {"kapt_code":"A2","name":"삼산 다른마을 2차","bjdong_code":"3114010100","sido":"울산광역시","sigungu":"남구","dong":"삼산동","ri":""},
 {"kapt_code":"A3","name":"구영 숲마을","bjdong_code":"3171025021","sido":"울산광역시","sigungu":"울주군","dong":"범서읍","ri":"구영리"}
]');

select public.ingest_kapt_basis('[
 {"kapt_code":"A1","name":"삼산테스트아파트","jibun_address":"울산광역시 남구 삼산동 1234-5 삼산테스트아파트","jibun":"1234-5",
  "road_address":"울산광역시 남구 테스트로 1","bjdong_code":"3114010100","approved_date":"2015-03-02","households":1000,
  "dong_count":10,"top_floor":25,"base_floor":2,"builder":"테스트건설","heating":"개별난방","hall_type":"계단식","mgmt_type":"위탁관리","sale_type":"분양"},
 {"kapt_code":"A2","name":"삼산 다른마을 2차","jibun":"77","bjdong_code":"3114010100","approved_date":"1998-01-01","households":400},
 {"kapt_code":"A3","name":"구영 숲마을","jibun":"300","bjdong_code":"3171025021","approved_date":"2010-01-01","households":500}
]');

select public.ingest_kapt_detail('[
 {"kapt_code":"A1","parking_ground":120,"parking_under":1200,"ev_ground":2,"ev_under":10,"bus_stop_distance":"5분이내"},
 {"kapt_code":"A2","parking_ground":300,"parking_under":0},
 {"kapt_code":"A3","parking_ground":50,"parking_under":600}
]');

select public.set_complex_locations('[
 {"kapt_code":"A1","lat":35.5405,"lng":129.3365,"pnu":"3114010100112340005"},
 {"kapt_code":"A2","lat":35.5420,"lng":129.3380},
 {"kapt_code":"A3","lat":35.5672,"lng":129.2482}
]');

select public.ingest_buildings('[
 {"mgm_bldrgst_pk":"B-recap-1","kind":"recap","pnu":"3114010100112340005","name":"삼산테스트아파트","households":1000,
  "far":249.5,"bcr":18.2,"indoor_self":1000,"indoor_mech":50,"outdoor_self":110,"outdoor_mech":0,"raw":{}},
 {"mgm_bldrgst_pk":"B-title-1","kind":"title","pnu":"3114010100112340005","dong_name":"101동","indoor_self":100,"raw":{}}
]');

-- 매매: (1) 지번으로 매칭 → aptSeq 별칭 생성 (2) 같은 aptSeq, 지번 비어도 별칭으로 매칭
--       (3) 이름 유사도로 매칭 (4) 매칭 실패
select public.ingest_trades('[
 {"source_key":"t1","apt_seq":"31140-1","sgg_cd":"31140","umd_cd":"10100","umd_nm":"삼산동","apt_nm":"삼산테스트","jibun":"1234-5",
  "exclusive_m2":84.97,"floor":10,"price":45000,"deal_date":"2026-10-03","build_year":2015,"is_direct":false,"canceled":false},
 {"source_key":"t2","apt_seq":"31140-1","sgg_cd":"31140","umd_cd":"10100","umd_nm":"삼산동","apt_nm":"삼산테스트","jibun":"",
  "exclusive_m2":84.97,"floor":3,"price":43000,"deal_date":"2026-09-01","build_year":2015,"is_direct":true,"canceled":false},
 {"source_key":"t2c","apt_seq":"31140-1","sgg_cd":"31140","umd_cd":"10100","umd_nm":"삼산동","apt_nm":"삼산테스트","jibun":"1234-5",
  "exclusive_m2":84.97,"floor":3,"price":99999,"deal_date":"2026-10-20","build_year":2015,"is_direct":false,"canceled":true,"cancel_date":"2026-10-25"},
 {"source_key":"t3","apt_seq":"31140-2","sgg_cd":"31140","umd_cd":"10100","umd_nm":"삼산동","apt_nm":"삼산다른마을2차아파트","jibun":"999",
  "exclusive_m2":59.9,"floor":5,"price":21000,"deal_date":"2026-10-11","build_year":1998},
 {"source_key":"t4","apt_seq":"31140-9","sgg_cd":"31140","umd_cd":"10100","umd_nm":"삼산동","apt_nm":"전혀없는단지","jibun":"5",
  "exclusive_m2":59.9,"floor":5,"price":20000,"deal_date":"2026-10-12","build_year":1990}
]');

-- 같은 거래를 다시 넣어도 중복되지 않음
select public.ingest_trades('[{"source_key":"t1","apt_seq":"31140-1","sgg_cd":"31140","umd_cd":"10100","umd_nm":"삼산동","apt_nm":"삼산테스트","jibun":"1234-5","exclusive_m2":84.97,"floor":10,"price":45000,"deal_date":"2026-10-03"}]');

-- 전월세: 법정동 이름으로 코드 찾기 → 지번 매칭. 울주군은 "범서읍 구영리" 형태도 처리
select public.ingest_rents('[
 {"source_key":"r1","sgg_cd":"31140","umd_nm":"삼산동","apt_nm":"삼산테스트","jibun":"1234-5","exclusive_m2":84.97,"floor":7,
  "deposit":30000,"monthly_rent":0,"deal_date":"2026-10-05","contract_type":"신규"},
 {"source_key":"r2","sgg_cd":"31140","umd_nm":"삼산동","apt_nm":"삼산테스트","jibun":"1234-5","exclusive_m2":84.97,"floor":7,
  "deposit":5000,"monthly_rent":90,"deal_date":"2026-10-06"},
 {"source_key":"r3","sgg_cd":"31710","umd_nm":"범서읍 구영리","apt_nm":"구영숲마을","jibun":"300","exclusive_m2":74.9,"floor":2,
  "deposit":15000,"monthly_rent":0,"deal_date":"2026-10-07"}
]');

select public.refresh_summaries();

do $$
declare j jsonb; n int;
begin
  -- 도우미 함수
  assert public.make_pnu('3114010100', '1234-5') = '3114010100112340005', 'make_pnu 일반';
  assert public.make_pnu('3114010100', '산 12') = '3114010100200120000', 'make_pnu 산';
  assert public.make_pnu('3114010100', '') is null, 'make_pnu 빈 지번';
  assert public.norm_name('삼산 현대(1차) 아파트') = '삼산현대1', 'norm_name';

  -- 매칭 결과
  assert (select count(*) from trades) = 5, '거래 5건 (중복 없음)';
  assert (select complex_id from trades where source_key='t1') = (select id from complexes where kapt_code='A1'), 't1 PNU 매칭';
  assert (select complex_id from trades where source_key='t2') = (select id from complexes where kapt_code='A1'), 't2 aptSeq 별칭 매칭';
  assert (select complex_id from trades where source_key='t3') = (select id from complexes where kapt_code='A2'), 't3 이름 매칭';
  assert (select complex_id from trades where source_key='t4') is null, 't4 매칭 실패';
  assert exists (select 1 from match_failures where source='trade' and key='aptSeq:31140-9'), '실패 로그';
  assert (select complex_id from rents where source_key='r1') = (select id from complexes where kapt_code='A1'), 'r1 전세 매칭';
  assert (select complex_id from rents where source_key='r3') = (select id from complexes where kapt_code='A3'), 'r3 울주군 리 매칭';

  -- 주차: K-apt + 건축물대장(총괄표제부 우선)
  assert (select total from parking_facts p join complexes c on c.id=p.complex_id where kapt_code='A1' and source='kapt') = 1320, 'kapt 총계';
  select to_jsonb(p) into j from parking_facts p join complexes c on c.id=p.complex_id where kapt_code='A1' and source='bldrgst';
  assert (j->>'under_total')::int = 1050 and (j->>'ground_total')::int = 110 and (j->>'indoor_mech')::int = 50, '건축물대장 총괄표제부 주차';

  -- 요약: 대표 평형 84.97, 최근 실거래 45000 (해제 거래 99999 제외), 세대당 1.32
  j := public.complex_summary((select id from complexes where kapt_code='A1'));
  assert (j->'recentPrice'->>'value')::int = 45000, '최근 실거래(해제 제외) ' || j::text;
  assert (j->'parkingPerHousehold'->>'value')::numeric = 1.32, '세대당 주차';
  assert (j->>'representativeM2')::numeric = 84.97, '대표 평형';

  -- 상세
  j := public.complex_detail((select id from complexes where kapt_code='A1'));
  assert jsonb_array_length(j->'parking'->'facts') = 2, '주차 출처 2개';
  assert j->'parking'->'facts'->0->>'source' = 'kapt', 'kapt 먼저';
  assert (j->'recentJeonse'->>'value')::int = 30000, '최근 전세';
  assert (j->'parking'->'dongRank'->>'position')::int = 1 and (j->'parking'->'dongRank'->>'total')::int = 2, '동네 순위 ' || (j->'parking'->'dongRank')::text;
  assert (j->'parking'->'evChargers'->>'value')::int = 12, '충전기';
  assert (j->>'far')::numeric = 249.5, '용적률';

  -- 거래 목록: 매매 3 + 전세 1 + 월세 1
  j := public.complex_trades((select id from complexes where kapt_code='A1'));
  assert jsonb_array_length(j) = 5, '거래 목록 ' || jsonb_array_length(j);
  assert (select count(*) from jsonb_array_elements(j) e where e->>'dealType'='monthly') = 1, '월세 구분';

  -- 지도 마커
  j := public.map_markers(35.0, 129.0, 36.0, 130.0, 'sigungu', '{}');
  assert jsonb_array_length(j) = 2, '구 마커 2개(남구·울주군) ' || j::text;
  j := public.map_markers(35.53, 129.33, 35.55, 129.34, 'complex', '{"parkingMin":1.0}');
  assert jsonb_array_length(j) = 1 and j->0->>'name' = '삼산테스트아파트', '필터: 주차 1.0↑ ' || j::text;
  j := public.map_markers(35.0, 129.0, 36.0, 130.0, 'dong', '{}');
  assert jsonb_array_length(j) = 2, '동 마커 ' || j::text;

  -- 목록·검색·홈
  assert jsonb_array_length(public.list_complexes('{"builtAfter":2009}')) = 2, '연식 필터';
  j := public.search_all('삼산');
  assert (select count(*) from jsonb_array_elements(j) e where e->>'kind'='complex') = 2, '검색 단지 ' || j::text;
  assert (select count(*) from jsonb_array_elements(j) e where e->>'kind'='dong') = 1, '검색 동';
  j := public.region_summaries();
  assert jsonb_array_length(j) = 5, '구군 5개';
  assert (select (e->>'monthlyTrades')::int from jsonb_array_elements(j) e where e->>'sigunguCode'='31140') = 3, '남구 최근 30일 거래(해제 제외) ' || j::text;

  -- 다시 매칭: 새 단지가 들어오면 실패했던 거래가 연결됨
  perform public.ingest_apt_list('[{"kapt_code":"A9","name":"전혀없는단지","bjdong_code":"3114010100","dong":"삼산동"}]');
  j := public.rematch_unmatched();
  assert (select complex_id from trades where source_key='t4') = (select id from complexes where kapt_code='A9'), '재매칭';
  assert (select resolved from match_failures where key='aptSeq:31140-9'), '실패 로그 해결 표시';

  raise notice '✅ 수집·매칭·조회 테스트 모두 통과';
end $$;
