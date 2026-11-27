# 실제 데이터 연결 (Supabase) — 4단계

> 대부분은 Claude가 대신 합니다. 직접 하실 일은 **★ 표시**만이에요.

## 전체 그림

```
공공데이터포털 ──(서울 리전에서 매일 수집)──▶ Supabase DB ──(읽기 전용 anon 키)──▶ 앱
     ▲                                          ▲
     └── 처음 5년치는 내 PC에서 한 번에 수집 ────┘   (해외 서버에서는 공공데이터 API 접속이 막힐 수 있음)
```

## 1. ★ 공공데이터포털 인증키 + 활용신청

1. https://www.data.go.kr 회원가입 → 로그인
2. 아래 5개 API를 각각 검색해서 상세 페이지의 **「활용신청」** 버튼 → 활용목적 "앱 개발" → 신청 (대부분 자동 승인)
   - 국토교통부_아파트 매매 실거래가 상세 자료
   - 국토교통부_아파트 전월세 실거래가 자료
   - 국토교통부_공동주택 단지 목록제공 서비스
   - 국토교통부_공동주택 기본 정보제공 서비스
   - 국토교통부_건축HUB_건축물대장정보 서비스
3. **마이페이지 → 데이터활용 → Open API → 개발계정** → 아무 API나 눌러 **일반 인증키(Decoding)** 복사
   - 승인 직후 1~2시간은 "등록되지 않은 키" 오류가 날 수 있어요. 잠시 후 다시.

## 2. ★ 카카오 REST API 키

2단계에서 만든 카카오 앱 → **앱 키** → **REST API 키** 복사 (단지 주소 → 지도 좌표 변환에 사용, 서버 전용)

## 3. ★ Supabase 가입 + 프로젝트

1. https://supabase.com → Start your project → GitHub 계정으로 가입
2. New project → 이름 `bu-dong-san-app`, **Region: Northeast Asia (Seoul)**, 비밀번호는 자동 생성 후 따로 보관 → Create
3. (Claude에게 맡길 경우) Account → **Access Tokens** → Generate new token → Claude가 띄우는 입력창에 붙여넣기

## 4. DB·서버 함수 설치 (Claude가 진행, 또는 직접)

```bash
npx supabase login
npx supabase link --project-ref <프로젝트-ref>
npx supabase db push                      # supabase/migrations 적용
npx supabase functions deploy ingest      # 자동 수집 함수
```

## 5. ★ 비밀값 넣기 (Supabase 대시보드)

Edge Functions → **Secrets** → Add:

| 이름 | 값 |
|---|---|
| `PUBLIC_DATA_KEY` | 1번 인증키 (Decoding) |
| `KAKAO_REST_KEY` | 2번 REST 키 |
| `INGEST_SECRET` | 아무 긴 문자열 (예: 비밀번호 생성기로 40자) |

그다음 SQL Editor 에서 `supabase/schedule.sql` 내용을 붙여넣고 `<...>` 두 곳을 바꿔 실행 → 매일 자동 수집 예약.

## 6. ★ 처음 5년치 수집 (내 PC, 한 번만)

```bash
copy ingest\.env.example ingest\.env     # 맥: cp ingest/.env.example ingest/.env
# ingest/.env 에 PUBLIC_DATA_KEY, KAKAO_REST_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 입력
npm run ingest -- all --months 60
```

- 30분~1시간 걸릴 수 있어요. 중간에 끊겨도 다시 실행하면 이어서 채워져요(중복 저장 안 됨).
- 끝나면 매칭 실패 목록은 Supabase → Table Editor → `match_failures` 에서 볼 수 있어요.

## 7. ★ 앱을 실제 데이터로

`apps/mobile/.env`:

```
EXPO_PUBLIC_DATA_MODE=supabase
EXPO_PUBLIC_SUPABASE_URL=https://<프로젝트-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon public 키>
```

`npm start -- --clear` 로 다시 실행.

## 문제 해결

| 증상 | 원인·해결 |
|---|---|
| `SERVICE_KEY_IS_NOT_REGISTERED_ERROR` | 활용신청 직후(1~2시간 대기) 또는 Encoding/Decoding 키 혼동 → Decoding 키 사용 |
| `LIMITED_NUMBER_OF_SERVICE_REQUESTS_EXCEEDS_ERROR` | 하루 호출 한도 초과 → 다음 날 이어서 실행 |
| 자동 수집 로그 확인 | Table Editor → `ingest_runs` (error 칸) / Edge Functions → ingest → Logs |
| 지도에 단지가 안 보임 | 좌표가 없는 단지 → `KAKAO_REST_KEY` 확인 후 `npm run ingest -- complexes` |
