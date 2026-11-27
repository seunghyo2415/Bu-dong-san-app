# 공공데이터 API 명세 (공식 페이지에서 추출)

> data.go.kr 각 API 상세 페이지에 들어 있는 공식 명세(swagger)를 **2026-11-27**에 내려받아 자동 정리한 것입니다.
> 코드에는 이 문서에 있는 이름만 씁니다. 빈 값·숫자 형식(쉼표·공백) 등은 인증키 발급 후 첫 수집 때 실제 응답으로 다시 확인합니다.

## 국토교통부_아파트 매매 실거래가 상세 자료

- 상세 페이지: https://www.data.go.kr/data/15126468/openapi.do
- 기본 주소: `https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev`

### `getRTMSDataSvcAptTradeDev` — 아파트 매매 실거래가 공개 자료(상세)

| 요청 파라미터 | 필수 | 설명 |
|---|---|---|
| `LAWD_CD` | 필수 | 지역코드, 각 지역별 코드 행정표준코드관리시스템(www.code.go.kr)의 법정동코드 10자리 중 앞 5자리 |
| `DEAL_YMD` | 필수 | 계약월, 실거래 자료의 계약년월(6자리) |
| `serviceKey` | 필수 | 공공데이터포털에서 요청하는 인증키 |
| `pageNo` | 필수 | 페이지번호 |
| `numOfRows` | 필수 | 한 페이지 결과 수 |

| 응답 필드 | 설명 |
|---|---|
| `sggCd` | 법정동시군구코드 |
| `umdCd` | 법정동읍면동코드 |
| `landCd` | 법정동지번코드 |
| `bonbun` | 법정동본번코드 |
| `bubun` | 법정동부번코드 |
| `roadNm` | 도로명 |
| `roadNmSggCd` | 도로명시군구코드 |
| `roadNmCd` | 도로명코드 |
| `roadNmSeq` | 도로명일련번호코드 |
| `roadNmbCd` | 도로명지상지하코드 |
| `roadNmBonbun` | 도로명건물본번호코드 |
| `roadNmBubun` | 도로명건물부번호코드 |
| `umdNm` | 법정동 |
| `aptNm` | 아파트명 |
| `jibun` | 지번 |
| `excluUseAr` | 전용면적 |
| `dealYear` | 계약년도 |
| `dealMonth` | 계약월 |
| `dealDay` | 계약일 |
| `dealAmount` | 거래금액(만원) |
| `floor` | 층 |
| `buildYear` | 건축년도 |
| `aptSeq` | 단지 일련번호 |
| `cdealType` | 해제여부 |
| `cdealDay` | 해제사유발생일 |
| `dealingGbn` | 거래유형(중개 및 직거래 여부) |
| `estateAgentSggNm` | 중개사소재지(시군구 단위) |
| `rgstDate` | 등기일자 |
| `aptDong` | 아파트 동명 |
| `slerGbn` | 거래주체정보_매도자(개인/법인/공공기관/기타) |
| `buyerGbn` | 거래주체정보_매수자(개인/법인/공공기관/기타) |
| `landLeaseholdGbn` | 토지임대부 아파트 여부 |

## 국토교통부_아파트 전월세 실거래가 자료

- 상세 페이지: https://www.data.go.kr/data/15126474/openapi.do
- 기본 주소: `https://apis.data.go.kr/1613000/RTMSDataSvcAptRent`

### `getRTMSDataSvcAptRent` — 아파트 전월세 실거래가 공개 자료

| 요청 파라미터 | 필수 | 설명 |
|---|---|---|
| `LAWD_CD` | 필수 | 지역코드, 각 지역별 코드 행정표준코드관리시스템(www.code.go.kr)의 법정동코드 10자리 중 앞 5자리 |
| `DEAL_YMD` | 필수 | 계약월, 실거래 자료의 계약년월(6자리) |
| `serviceKey` | 필수 | 공공데이터포털에서 요청하는 인증키 |

| 응답 필드 | 설명 |
|---|---|
| `sggCd` | 지역코드 |
| `umdNm` | 법정동 |
| `aptNm` | 단지명 |
| `jibun` | 지번 |
| `excluUseAr` | 전용면적 |
| `dealYear` | 계약년도 |
| `dealMonth` | 계약월 |
| `dealDay` | 계약일 |
| `deposit` | 보증금액(만원) |
| `monthlyRent` | 월세금액(만원) |
| `floor` | 층 |
| `buildYear` | 건축년도 |
| `contractTerm` | 계약기간 |
| `contractType` | 계약구분 |
| `useRRRight` | 갱신요구권사용 |
| `preDeposit` | 종전계약보증금 |
| `preMonthlyRent` | 종전계약월세 |

## 국토교통부_공동주택 단지 목록제공 서비스

- 상세 페이지: https://www.data.go.kr/data/15057332/openapi.do
- 기본 주소: `https://apis.data.go.kr/1613000/AptListService4`

### `getSigunguAptList4` — 국토교통부_시군구 아파트 목록

| 요청 파라미터 | 필수 | 설명 |
|---|---|---|
| `serviceKey` | 필수 | 공공데이터포털에서 받은 인증키 |
| `sigunguCode` | 필수 | 시군구코드 |
| `pageNo` | 선택 | 페이지번호 |
| `numOfRows` | 선택 | 한 페이지 결과 수 |

| 응답 필드 | 설명 |
|---|---|
| `bjdCode` | 법정동코드 10자리 |
| `kaptCode` | 단지코드 |
| `kaptName` | 단지명 |
| `as1` | 단지가 속한 시도 |
| `as2` | 단지가 속한 시군구 |
| `as3` | 단지가 속한 읍면동 |
| `as4` | 단지가 속한 리, 시도/시군구에 따라 존재하지 않을 수 있음 |

### `getLegaldongAptList4` — 국토교통부_법정동 아파트 목록

| 요청 파라미터 | 필수 | 설명 |
|---|---|---|
| `serviceKey` | 필수 | 공공데이터포털에서 받은 인증키 |
| `pageNo` | 선택 | 페이지번호 |
| `numOfRows` | 선택 | 한 페이지 결과 수 |
| `bjdCode` | 필수 | 시군구코드+법정동코드 |

| 응답 필드 | 설명 |
|---|---|
| `bjdCode` | 법정동코드 10자리 |
| `kaptCode` | 단지코드 |
| `kaptName` | 단지명 |
| `as1` | 단지가 속한 시도 |
| `as2` | 단지가 속한 시군구 |
| `as3` | 단지가 속한 읍면동 |
| `as4` | 단지가 속한 리, 시도/시군구에 따라 존재하지 않을 수 있음 |

## 국토교통부_공동주택 기본 정보제공 서비스

- 상세 페이지: https://www.data.go.kr/data/15058453/openapi.do
- 기본 주소: `https://apis.data.go.kr/1613000/AptBasisInfoServiceV5`

### `getAphusDtlInfoV5` — 국토교통부_공동주택 상세 정보조회

| 요청 파라미터 | 필수 | 설명 |
|---|---|---|
| `ServiceKey` | 필수 | 공공데이터포털에서 받은 인증키 |
| `kaptCode` | 필수 | 단지코드 |

| 응답 필드 | 설명 |
|---|---|
| `undergroundElChargerCnt` | 지하 전기차 충전대수 |
| `kaptCode` | 단지코드 |
| `kaptName` | 단지명 |
| `codeMgr` | 일반관리방식 |
| `kaptMgrCnt` | 일반관리인원 |
| `kaptCcompany` | 일반관리 계약업체 |
| `codeSec` | 경비관리방식 |
| `kaptdScnt` | 경비관리인원 |
| `kaptdSecCom` | 경비관리 계약업체 |
| `codeClean` | 청소관리방식 |
| `kaptdClcnt` | 청소관리인원 |
| `codeGarbage` | 음식물처리방법 |
| `codeDisinf` | 소독관리방식 |
| `kaptdDcnt` | 소독관리 연간 소독횟수 |
| `disposalType` | 소독방법 |
| `codeStr` | 건물구조 |
| `kaptdEcapa` | 수전용량 |
| `codeEcon` | 세대전기계약방식 |
| `codeEmgr` | 전기안전관리자법정선임여부 |
| `codeFalarm` | 화재수신반방식 |
| `codeWsupply` | 급수방식 |
| `codeElev` | 승강기관리형태 |
| `kaptdEcnt` | 승강기대수 |
| `kaptdPcnt` | 주차대수(지상) |
| `kaptdPcntu` | 주차대수(지하) |
| `codeNet` | 주차관제.홈네트워크 |
| `kaptdCccnt` | CCTV대수 |
| `welfareFacility` | 부대.복리시설 |
| `kaptdWtimebus` | 버스정류장 거리 |
| `subwayLine` | 지하철호선 |
| `subwayStation` | 지하철역명 |
| `kaptdWtimesub` | 지하철역 거리 |
| `convenientFacility` | 편의시설 |
| `educationFacility` | 교육시설 |
| `groundElChargerCnt` | 지상 전기차 충전대수 |
| `useYn` | 사용유무 |

### `getAphusBassInfoV5` — 국토교통부_공동주택 기본 정보조회

| 요청 파라미터 | 필수 | 설명 |
|---|---|---|
| `serviceKey` | 필수 | 공공데이터포털에서 발급받은 인증키 |
| `kaptCode` | 필수 | 단지코드 |

| 응답 필드 | 설명 |
|---|---|
| `zipcode` | 우편번호 |
| `kaptCode` | 단지코드 |
| `kaptName` | 단지명 |
| `kaptAddr` | 법정동주소 |
| `codeSaleNm` | 분양형태 |
| `codeHeatNm` | 난방방식 |
| `kaptTarea` | 연면적 |
| `kaptDongCnt` | 동수 |
| `kaptdaCnt` | 세대수 |
| `kaptBcompany` | 시공사 |
| `kaptAcompany` | 시행사 |
| `kaptTel` | 관리사무소연락처 |
| `kaptFax` | 관리사무소팩스 |
| `kaptUrl` | 홈페이지주소 |
| `codeAptNm` | 단지분류 |
| `doroJuso` | 도로명주소 |
| `hoCnt` | 호수 |
| `codeMgrNm` | 관리방식 |
| `codeHallNm` | 복도유형 |
| `kaptUsedate` | 사용승인일 |
| `kaptMarea` | 관리비부과면적 |
| `kaptMparea60` | 전용면적별 세대현황 |
| `kaptMparea85` | 전용면적별 세대현황 |
| `kaptMparea135` | 전용면적별 세대현황 |
| `kaptMparea136` | 전용면적별 세대현황 |
| `privArea` | 단지 전용면적합 |
| `bjdCode` | 법정동코드 |
| `kaptTopFloor` | 최고층수 |
| `ktownFlrNo` | 최고층수(건축물대장) |
| `kaptBaseFloor` | 지하층수 |
| `kaptdEcntp` | 승객용 승강기대수 |

## 국토교통부_건축HUB_건축물대장정보 서비스

- 상세 페이지: https://www.data.go.kr/data/15134735/openapi.do
- 기본 주소: `https://apis.data.go.kr/1613000/BldRgstHubService`

### `getBrTitleInfo` — 건축HUB_건축물대장 표제부 조회

| 요청 파라미터 | 필수 | 설명 |
|---|---|---|
| `serviceKey` | 필수 | 공공데이터포털에서 받은 인증키 |
| `sigunguCd` | 필수 | 시군구코드 |
| `bjdongCd` | 필수 | 법정동코드 |
| `platGbCd` | 선택 | 대지구분코드(0:대지 1:산 2:블록) |
| `bun` | 선택 | 번 |
| `ji` | 선택 | 지 |
| `startDate` | 선택 | 검색시작일(YYYYMMDD) |
| `endDate` | 선택 | 검색종료일(YYYYMMDD) |
| `_type` | 선택 | 리턴 타입 (xml, json) 생략 시 xml로 기본 제공 |
| `numOfRows` | 선택 | 리스트수 |
| `pageNo` | 선택 | 페이지번호 |

| 응답 필드 | 설명 |
|---|---|
| `mainPurpsCdNm` | 주용도코드명 |
| `etcPurps` | 기타용도 |
| `roofCd` | 지붕코드 |
| `roofCdNm` | 지붕코드명 |
| `etcRoof` | 기타지붕 |
| `hhldCnt` | 세대수(세대) |
| `fmlyCnt` | 가구수(가구) |
| `heit` | 높이(m) |
| `grndFlrCnt` | 지상층수 |
| `ugrndFlrCnt` | 지하층수 |
| `rideUseElvtCnt` | 승용승강기수 |
| `emgenUseElvtCnt` | 비상용승강기수 |
| `atchBldCnt` | 부속건축물수 |
| `atchBldArea` | 부속건축물면적(㎡) |
| `totDongTotArea` | 총동연면적(㎡) |
| `indrMechUtcnt` | 옥내기계식대수(대) |
| `indrMechArea` | 옥내기계식면적(㎡) |
| `oudrMechUtcnt` | 옥외기계식대수(대) |
| `oudrMechArea` | 옥외기계식면적(㎡) |
| `indrAutoUtcnt` | 옥내자주식대수(대) |
| `indrAutoArea` | 옥내자주식면적(㎡) |
| `oudrAutoUtcnt` | 옥외자주식대수(대) |
| `oudrAutoArea` | 옥외자주식면적(㎡) |
| `pmsDay` | 허가일 |
| `stcnsDay` | 착공일 |
| `useAprDay` | 사용승인일 |
| `pmsnoYear` | 허가번호년 |
| `pmsnoKikCd` | 허가번호기관코드 |
| `pmsnoKikCdNm` | 허가번호기관코드명 |
| `pmsnoGbCd` | 허가번호구분코드 |
| `pmsnoGbCdNm` | 허가번호구분코드명 |
| `hoCnt` | 호수(호) |
| `engrGrade` | 에너지효율등급 |
| `engrRat` | 에너지절감율 |
| `engrEpi` | EPI점수 |
| `gnBldGrade` | 친환경건축물등급 |
| `gnBldCert` | 친환경건축물인증점수 |
| `itgBldGrade` | 지능형건축물등급 |
| `itgBldCert` | 지능형건축물인증점수 |
| `crtnDay` | 생성일자 |
| `rnum` | 순번 |
| `platPlc` | 대지위치 |
| `sigunguCd` | 시군구코드 |
| `bjdongCd` | 법정동코드 |
| `platGbCd` | 대지구분코드 |
| `bun` | 번 |
| `ji` | 지 |
| `mgmBldrgstPk` | 관리건축물대장PK |
| `regstrGbCd` | 대장구분코드 |
| `regstrGbCdNm` | 대장구분코드명 |
| `regstrKindCd` | 대장종류코드 |
| `regstrKindCdNm` | 대장종류코드명 |
| `newPlatPlc` | 도로명대지위치 |
| `bldNm` | 건물명 |
| `splotNm` | 특수지명 |
| `block` | 블록 |
| `lot` | 로트 |
| `bylotCnt` | 외필지수 |
| `naRoadCd` | 새주소도로코드 |
| `naBjdongCd` | 새주소법정동코드 |
| `naUgrndCd` | 새주소지상지하코드 |
| `naMainBun` | 새주소본번 |
| `naSubBun` | 새주소부번 |
| `dongNm` | 동명칭 |
| `mainAtchGbCd` | 주부속구분코드 |
| `mainAtchGbCdNm` | 주부속구분코드명 |
| `platArea` | 대지면적(㎡) |
| `archArea` | 건축면적(㎡) |
| `bcRat` | 건폐율(%) |
| `totArea` | 연면적(㎡) |
| `vlRatEstmTotArea` | 용적률산정연면적(㎡) |
| `vlRat` | 용적률(%) |
| `strctCd` | 구조코드 |
| `strctCdNm` | 구조코드명 |
| `etcStrct` | 기타구조 |
| `mainPurpsCd` | 주용도코드 |
| `rserthqkDsgnApplyYn` | 내진설계적용여부 |
| `rserthqkAblty` | 내진능력 |

### `getBrRecapTitleInfo` — 건축HUB_건축물대장 총괄표제부 조회

| 요청 파라미터 | 필수 | 설명 |
|---|---|---|
| `serviceKey` | 필수 | 공공데이터포털에서 받은 인증키 |
| `sigunguCd` | 필수 | 시군구코드 |
| `bjdongCd` | 필수 | 법정동코드 |
| `platGbCd` | 선택 | 대지구분코드(0:대지 1:산 2:블록) |
| `bun` | 선택 | 번 |
| `ji` | 선택 | 지 |
| `startDate` | 선택 | 검색시작일(YYYYMMDD) |
| `endDate` | 선택 | 검색종료일(YYYYMMDD) |
| `_type` | 선택 | 리턴 타입 (xml, json) 생략 시 xml로 기본 제공 |
| `numOfRows` | 선택 | 리스트수 |
| `pageNo` | 선택 | 페이지번호 |

| 응답 필드 | 설명 |
|---|---|
| `itgBldGrade` | 지능형건축물등급 |
| `itgBldCert` | 지능형건축물인증점수 |
| `crtnDay` | 생성일자 |
| `naBjdongCd` | 새주소법정동코드 |
| `naUgrndCd` | 새주소지상지하코드 |
| `naMainBun` | 새주소본번 |
| `naSubBun` | 새주소부번 |
| `platArea` | 대지면적(㎡) |
| `archArea` | 건축면적(㎡) |
| `bcRat` | 건폐율(%) |
| `totArea` | 연면적(㎡) |
| `vlRatEstmTotArea` | 용적률산정연면적(㎡) |
| `vlRat` | 용적률(%) |
| `mainPurpsCd` | 주용도코드 |
| `mainPurpsCdNm` | 주용도코드명 |
| `etcPurps` | 기타용도 |
| `hhldCnt` | 세대수(세대) |
| `fmlyCnt` | 가구수(가구) |
| `mainBldCnt` | 주건축물수 |
| `atchBldCnt` | 부속건축물수 |
| `atchBldArea` | 부속건축물면적(㎡) |
| `totPkngCnt` | 총주차수 |
| `indrMechUtcnt` | 옥내기계식대수(대) |
| `indrMechArea` | 옥내기계식면적(㎡) |
| `oudrMechUtcnt` | 옥외기계식대수(대) |
| `oudrMechArea` | 옥외기계식면적(㎡) |
| `indrAutoUtcnt` | 옥내자주식대수(대) |
| `indrAutoArea` | 옥내자주식면적(㎡) |
| `oudrAutoUtcnt` | 옥외자주식대수(대) |
| `oudrAutoArea` | 옥외자주식면적(㎡) |
| `pmsDay` | 허가일 |
| `stcnsDay` | 착공일 |
| `useAprDay` | 사용승인일 |
| `pmsnoYear` | 허가번호년 |
| `pmsnoKikCd` | 허가번호기관코드 |
| `pmsnoKikCdNm` | 허가번호기관코드명 |
| `pmsnoGbCd` | 허가번호구분코드 |
| `pmsnoGbCdNm` | 허가번호구분코드명 |
| `hoCnt` | 호수(호) |
| `engrGrade` | 에너지효율등급 |
| `engrRat` | 에너지절감율 |
| `engrEpi` | EPI점수 |
| `gnBldGrade` | 친환경건축물등급 |
| `gnBldCert` | 친환경건축물인증점수 |
| `rnum` | 순번 |
| `platPlc` | 대지위치 |
| `sigunguCd` | 시군구코드 |
| `bjdongCd` | 법정동코드 |
| `platGbCd` | 대지구분코드 |
| `bun` | 번 |
| `ji` | 지 |
| `mgmBldrgstPk` | 관리건축물대장PK |
| `regstrGbCd` | 대장구분코드 |
| `regstrGbCdNm` | 대장구분코드명 |
| `regstrKindCd` | 대장종류코드 |
| `regstrKindCdNm` | 대장종류코드명 |
| `newOldRegstrGbCd` | 신구대장구분코드 |
| `newOldRegstrGbCdNm` | 신구대장구분코드명 |
| `newPlatPlc` | 도로명대지위치 |
| `bldNm` | 건물명 |
| `splotNm` | 특수지명 |
| `block` | 블록 |
| `lot` | 로트 |
| `bylotCnt` | 외필지수 |
| `naRoadCd` | 새주소도로코드 |


---

## (참고) 공공데이터 외 API — 각 사 개발자 문서 기준, 첫 실제 호출 때 확인 필요

> 아래는 개발 환경에서 해당 문서 사이트 접속이 막혀 공식 문서를 직접 열어 확인하지 못한 항목입니다. 키 발급 후 첫 호출 응답으로 확인해 이 표를 갱신합니다.

| API | 주소 | 사용하는 필드 |
|---|---|---|
| 카카오 주소 검색 | `dapi.kakao.com/v2/local/search/address.json` | `documents[].x`, `y`, `address.b_code`, `main_address_no`, `sub_address_no`, `mountain_yn` |
| 카카오 키워드·카테고리 (JS SDK `services.Places`) | 앱 WebView | `place_name`, `road_address_name`, `address_name`, `x`, `y`, `distance`, `category_group_code` / 카테고리 SC4·AC5·MT1·HP8·BK9 |
| 네이버 검색 | `openapi.naver.com/v1/search/blog.json`, `cafearticle.json` | `items[].title`, `link`, `description`, `bloggername`, `postdate`, `cafename` |
| 카카오(다음) 검색 | `dapi.kakao.com/v2/search/blog`, `cafe`, `web` | `documents[].title`, `contents`, `url`, `blogname`, `cafename`, `datetime`, `thumbnail` |
| YouTube Data API v3 | `www.googleapis.com/youtube/v3/search` | `items[].id.videoId`, `snippet.title`, `description`, `publishedAt`, `channelTitle`, `thumbnails.default.url` |
