# 빌드 · 배포 안내 (9단계)

## 1. 개발용 앱(APK) — 공유 받기·푸시 알림 테스트용

Expo Go 로는 **당근 공유 받기·푸시 알림**을 테스트할 수 없어요. 내 폰에 설치하는 개발용 앱을 한 번 만들면 돼요. (무료, 클라우드에서 빌드)

```bash
cd apps/mobile
npx eas-cli@latest login            # Expo 계정 (expo.dev 에서 무료 가입)
npx eas-cli@latest init             # 프로젝트 연결 → app.json 에 projectId 가 들어감 (푸시 알림에 필요)
```

앱에 들어갈 **공개용** 값은 EAS 환경변수로 넣어요 (`.env` 는 빌드 서버로 올라가지 않음):

```bash
npx eas-cli@latest env:create --environment development --name EXPO_PUBLIC_KAKAO_JS_KEY --value <카카오 JS 키> --visibility plaintext
npx eas-cli@latest env:create --environment development --name EXPO_PUBLIC_DATA_MODE --value supabase --visibility plaintext
npx eas-cli@latest env:create --environment development --name EXPO_PUBLIC_SUPABASE_URL --value https://<ref>.supabase.co --visibility plaintext
npx eas-cli@latest env:create --environment development --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value <anon 키> --visibility plaintext
# preview / production 도 같은 방식으로 (--environment 만 바꿔서)
```

빌드 (15~25분):

```bash
npx eas-cli@latest build --profile development --platform android
```

끝나면 나오는 링크(QR)를 폰으로 열어 APK 설치 → 컴퓨터에서 `npm start` → 개발용 앱에서 접속.

> ⚠️ 카카오 개발자 콘솔 → 플랫폼 → **Android** 플랫폼도 등록해 두세요 (패키지명 `com.myrealestate.ulsan`). 지도는 WebView 라 Web(http://localhost) 등록이 핵심이에요.

## 2. 스토어 배포 전에 꼭 할 일

| 항목 | 내용 |
|---|---|
| 패키지 이름 | `app.json` 의 `com.myrealestate.ulsan` — **스토어에 한 번 올리면 못 바꿔요.** 바꾸려면 지금 |
| 아이콘·스플래시 | 지금은 Expo 기본 그림 → `assets/images/` 의 icon.png(1024×1024), android-icon-*.png 교체 |
| 개인정보처리방침 URL | 앱 안 「설정 → 개인정보처리방침」 내용을 웹에 올린 주소가 필요 (예: GitHub Pages, 노션 공개 페이지). 운영자·연락처·시행일 채우기 |
| 계산기 세율 | `packages/shared/src/policy.ts` (또는 DB `policy_values`) 를 위택스·법령과 대조 후 `verifiedAt` 날짜 기입 |
| 커뮤니티 운영 | 신고 처리 담당(본인) 정하기 — Supabase Table Editor 에서 `reports`, `posts.hidden` 확인 |
| 데이터 출처 | 공공데이터포털 이용 조건(출처 표시) — 앱 「데이터 출처 안내」에 이미 있음 |

## 3. Google Play 출시

1. https://play.google.com/console → 개발자 계정 등록 ($25, 1회)
2. 정식 빌드: `npx eas-cli@latest build --profile production --platform android` (.aab)
3. Play Console → 앱 만들기 → 내부 테스트 트랙에 .aab 올리기 (또는 `npx eas-cli@latest submit --platform android`)
4. 스토어 등록정보: 앱 이름 「내가 만든 부동산 앱」, 설명, 스크린샷(폰 2장 이상), 개인정보처리방침 URL
5. **데이터 보안(Data safety) 설문** 참고 답변:
   - 위치: 수집함(앱 기능, 선택) — 저장·공유 안 함
   - 사진: 기기에만 저장, 수집 안 함
   - 사용자 콘텐츠(게시글): 수집함(커뮤니티) — 삭제 요청 가능
   - 기기 ID(푸시 토큰): 수집함(알림)
6. 콘텐츠 등급 설문 → 커뮤니티(사용자 간 소통) 있음 → 신고·차단 기능 있음
7. 개인 개발자 계정은 **비공개 테스트(테스터 12명 이상, 14일)** 를 거쳐야 프로덕션 출시 가능할 수 있어요 (Play 정책 확인)

## 4. iOS (나중에)

- Apple Developer Program ($99/년), `npx eas-cli@latest build --platform ios`
- 공유 받기는 Share Extension 으로 이미 설정됨(`expo-share-intent` 플러그인). EAS 첫 빌드 때 확장 타깃 인증서를 하나 더 만들게 됨
