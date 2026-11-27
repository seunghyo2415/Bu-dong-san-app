/**
 * 가짜 API 응답 (형식은 공식 명세의 필드 이름을 따름, 값은 지어낸 것).
 * 실제 응답의 공백·빈 값 형태는 인증키 발급 후 첫 수집에서 다시 확인한다.
 */
export const tradeXml = (items: Record<string, string>[], total = items.length) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<response><header><resultCode>000</resultCode><resultMsg>OK</resultMsg></header><body><items>${items
  .map((it) => `<item>${Object.entries(it).map(([k, v]) => (v === '' ? `<${k}/>` : `<${k}>${v}</${k}>`)).join('')}</item>`)
  .join('')}</items><numOfRows>1000</numOfRows><pageNo>1</pageNo><totalCount>${total}</totalCount></body></response>`;

export const TRADE_ITEMS = [
  {
    sggCd: '31140', umdCd: '10100', landCd: '1', bonbun: '1234', bubun: '0005', umdNm: '삼산동', aptNm: '테스트한빛',
    jibun: '1234-5', excluUseAr: '84.97', dealYear: '2026', dealMonth: '10', dealDay: '3', dealAmount: '    45,000',
    floor: '10', buildYear: '2015', aptSeq: '31140-100', cdealType: '', cdealDay: '', dealingGbn: '중개거래', aptDong: '101',
  },
  {
    sggCd: '31140', umdCd: '10100', landCd: '1', bonbun: '1234', bubun: '0005', umdNm: '삼산동', aptNm: '테스트한빛',
    jibun: '1234-5', excluUseAr: '84.97', dealYear: '2026', dealMonth: '10', dealDay: '15', dealAmount: '52,000',
    floor: '3', buildYear: '2015', aptSeq: '31140-100', cdealType: 'O', cdealDay: '26.10.20', dealingGbn: '직거래', aptDong: '',
  },
];

export const RENT_ITEMS = [
  {
    sggCd: '31140', umdNm: '삼산동', aptNm: '테스트한빛', jibun: '1234-5', excluUseAr: '84.97', dealYear: '2026',
    dealMonth: '10', dealDay: '7', deposit: '30,000', monthlyRent: '0', floor: '7', buildYear: '2015',
    contractTerm: '26.11~28.11', contractType: '신규', useRRRight: '', preDeposit: '', preMonthlyRent: '',
  },
];

export const APT_LIST_JSON = JSON.stringify({
  response: {
    header: { resultCode: '00', resultMsg: 'NORMAL SERVICE.' },
    body: {
      items: [{ bjdCode: '3114010100', kaptCode: 'A99990001', kaptName: '테스트한빛아파트', as1: '울산광역시', as2: '남구', as3: '삼산동', as4: null }],
      numOfRows: '1000', pageNo: '1', totalCount: '1',
    },
  },
});

export const KAPT_BASIS_JSON = JSON.stringify({
  response: {
    header: { resultCode: '00', resultMsg: 'NORMAL SERVICE.' },
    body: {
      item: {
        kaptCode: 'A99990001', kaptName: '테스트한빛아파트', kaptAddr: '울산광역시 남구 삼산동 1234-5 테스트한빛아파트',
        doroJuso: '울산광역시 남구 테스트로 10', bjdCode: '3114010100', kaptUsedate: '20150302', kaptdaCnt: 1000,
        kaptDongCnt: 10, kaptTopFloor: 25, kaptBaseFloor: 2, kaptBcompany: '테스트건설', codeHeatNm: '개별난방',
        codeHallNm: '계단식', codeMgrNm: '위탁관리', codeSaleNm: '분양',
      },
    },
  },
});

export const KAPT_DETAIL_JSON = JSON.stringify({
  response: {
    header: { resultCode: '00', resultMsg: 'NORMAL SERVICE.' },
    body: { item: { kaptCode: 'A99990001', kaptdPcnt: '120', kaptdPcntu: '1200', groundElChargerCnt: '2', undergroundElChargerCnt: '10', kaptdWtimebus: '5분이내' } },
  },
});

export const BLD_RECAP_ITEMS = [
  {
    mgmBldrgstPk: '31140-999', sigunguCd: '31140', bjdongCd: '10100', platGbCd: '0', bun: '1234', ji: '0005',
    bldNm: '테스트한빛아파트', mainPurpsCdNm: '공동주택', useAprDay: '20150302', hhldCnt: '1000', vlRat: '249.5', bcRat: '18.2',
    indrAutoUtcnt: '1000', indrMechUtcnt: '50', oudrAutoUtcnt: '110', oudrMechUtcnt: '0',
  },
];

export const KAKAO_ADDRESS = {
  documents: [{ x: '129.3365', y: '35.5405', address: { b_code: '3114010100', main_address_no: '1234', sub_address_no: '5', mountain_yn: 'N' } }],
};
