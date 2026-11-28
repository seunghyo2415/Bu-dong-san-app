# 직접 하실 일 (한 번에 정리)

> 코드는 1~9단계까지 다 만들어 두었어요. 아래는 **계정·키처럼 본인만 할 수 있는 일**이에요. 순서대로 하면 돼요.
> 키는 채팅·GitHub 에 붙여넣지 말고 아래 안내된 곳(`.env`, Supabase 비밀값, EAS 환경변수)에만 넣으세요.

## A. 지금 바로 (10분) — 지도 켜기

- [ ] 카카오 개발자 앱 만들고 **JavaScript 키** → `apps/mobile/.env` 의 `EXPO_PUBLIC_KAKAO_JS_KEY` ([API_KEYS.md](API_KEYS.md) 1번)
- [ ] 같은 화면에서 **Web 플랫폼 도메인 `https://localhost`** 등록
- [ ] `npm start` → Expo Go 로 확인: 지도·로드뷰·주변시설·직장 등록·통근버스 불러오기가 이 키 하나로 동작

## B. 실제 데이터 (30분 + 수집 1시간) — [SETUP_SUPABASE.md](SETUP_SUPABASE.md)

- [ ] 공공데이터포털 가입 + 5개 API 활용신청 + 인증키(Decoding)
- [ ] 카카오 **REST API 키**
- [ ] Supabase 가입 → 프로젝트(서울 리전) → DB 설치·함수 배포 (Claude 에게 "Supabase 연결해 줘"라고 하면 접근 토큰 입력창을 띄워 대신 진행 가능)
- [ ] Supabase 비밀값: `PUBLIC_DATA_KEY`, `KAKAO_REST_KEY`, `INGEST_SECRET`
- [ ] Authentication → **Anonymous sign-ins 켜기** (커뮤니티)
- [ ] `supabase/schedule.sql` 실행 (매일 자동 수집·알림)
- [ ] 내 PC 에서 `npm run ingest -- all --months 60` (처음 5년치)
- [ ] `apps/mobile/.env` 를 `EXPO_PUBLIC_DATA_MODE=supabase` + 주소·anon 키로

## C. 선택 키 (커뮤니티 외부 글)

- [ ] 네이버 개발자센터 검색 API → `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`
- [ ] YouTube Data API v3 키 → `YOUTUBE_API_KEY`
- (카카오 블로그·카페·웹 검색은 B 의 REST 키로 이미 동작)

## D. 공유 받기·푸시 테스트 — [RELEASE.md](RELEASE.md) 1번

- [ ] Expo 계정 → `eas init` → EAS 환경변수 → 개발용 APK 빌드·설치
- [ ] 당근마켓 매물 → 공유 → 「내가 만든 부동산 앱」 확인

## E. 출시 전 — [RELEASE.md](RELEASE.md) 2~3번

- [ ] 패키지 이름 확정 (`com.myrealestate.ulsan` 그대로 쓸지)
- [ ] 아이콘·스플래시 그림
- [ ] 계산기 세율을 최신 법령과 대조 (`verifiedAt` 기입)
- [ ] 개인정보처리방침 웹 주소, Play 개발자 계정

## 확인이 남은 것 (첫 실제 실행 때 Claude 가 같이 봐야 할 것)

- 공공데이터 응답의 실제 빈 값·숫자 형식 (필드 이름은 공식 명세로 확인 완료)
- 카카오·네이버·YouTube 응답 필드 (문서 사이트 접속이 막혀 개발자 문서 지식 기준으로 작성) → [DATA_SOURCES.md](DATA_SOURCES.md) 맨 아래 표
- 울산 시군구 코드(31110·31140·31170·31200·31710)를 첫 단지목록 수집 로그로 대조
- 통근버스 정류장 좌표: 첫 "위치 찾기" 뒤 못 찾은 정류장 직접 지정
