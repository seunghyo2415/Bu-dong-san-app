# 🏠 내가 만든 부동산 앱

울산 전용 부동산 정보 앱 (Android 우선). **주차 정보를 숫자로 정확히** 보여주고, **당근마켓 매물을 공유하면 바로 분석**해요.

> 지금 상태: **1~9단계 코드 완료.** 키 없이도 목업 데이터로 모든 화면이 돌아가요.
> 실제 데이터·지도·공유 받기를 켜려면 → **[docs/NEXT_STEPS.md](docs/NEXT_STEPS.md)** (직접 하실 일 한 장 정리)

## 할 수 있는 것

| 화면 | 내용 |
|---|---|
| 지도 | 구·군 → 동 → 단지 마커, 가격/평당가 표시, 필터(가격·평형·연식·세대수·**세대당 주차**), 현재 위치, 목록 보기, 통근버스 노선 겹쳐 보기 |
| 단지 상세 | 요약 · **주차**(지상/지하·자주식/기계식·출처 비교·동네 순위·충전기·퇴근시간 체감 평가) · 실거래 차트 · 위치(로드뷰·주변시설·직장·통근버스 정류장) · 매물 · 이야기 · 단지 정보 |
| 공유 받기 | 당근마켓 → 공유 → 주소·가격·면적 자동 추출 → "어느 건물인가요?" → 내 매물함 + **최근 실거래 대비 ±%** |
| 매물함 | 저장한 매물, 메모, **임장 체크리스트 + 사진** |
| 비교 | 최대 3개 단지 표 비교 |
| 이야기 | 블로그·카페·유튜브 글 모아보기(제목·요약·링크만, 광고 거르기), 단지 게시판(신고·차단·개인정보 자동 가림) |
| 도구 | 취득세·대출·DSR·전세가율 계산기(세율은 설정값), 관심 단지 새 실거래 알림 |

## 폴더

```
apps/mobile          Expo 앱 (SDK 58, Expo Router — src/app 아래 파일 하나 = 화면 하나)
packages/shared      앱·서버 공용 규칙 (금액·평·주차 등급·실거래 통계·공유 글 해석·통근버스·계산기·커뮤니티) + 테스트
supabase/migrations  DB 설계 (PostGIS, 행 단위 보안)
supabase/functions   서버 함수: ingest(공공데이터 수집) · geo(주소 검색) · community(외부 글) · notify(알림)
supabase/tests       DB 테스트 (로컬 PostGIS 로 실행)
ingest               내 PC 에서 처음 5년치 수집하는 명령 + 수집기 테스트
docs                 설계서 · API 명세 · 키 발급 · Supabase 설정 · 배포 안내 · 할 일
```

## 처음 실행 (키 없이 목업으로)

1. **Node.js LTS** 설치: https://nodejs.org
2. 폰에 **Expo Go** 설치 (Play 스토어)
3. 터미널에서:

```bash
git clone https://github.com/seunghyo2415/Bu-dong-san-app.git
cd Bu-dong-san-app
npm install
copy apps\mobile\.env.example apps\mobile\.env      # 맥: cp apps/mobile/.env.example apps/mobile/.env
npm start
```

4. QR 을 Expo Go 로 찍기 (같은 와이파이, 안 되면 `npm start -- --tunnel`)

## 검사 명령

```bash
npm test            # 공용 규칙 65개 + 수집기 23개 테스트
npm run typecheck   # 타입 검사
npm run test:db     # DB 테스트 (PostgreSQL+PostGIS 필요, GitHub 에서는 자동 실행)
```

GitHub 에 올리면 `.github/workflows/ci.yml` 이 위 검사를 모두 자동으로 돌려요.

## 문서

- [설계서](docs/DESIGN.md) — 구조·DB·데이터 흐름·단계별 결정 기록
- [공공데이터 API 명세](docs/DATA_SOURCES.md) — 공식 페이지에서 추출한 필드
- [API 키 발급](docs/API_KEYS.md) · [Supabase 연결](docs/SETUP_SUPABASE.md) · [빌드·배포](docs/RELEASE.md) · [직접 하실 일](docs/NEXT_STEPS.md)

본 앱의 정보는 참고용이며 실제 거래 시 공식 서류를 확인하세요.
