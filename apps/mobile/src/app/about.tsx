import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';

import { Card, Chip } from '@/components/ui';
import { space, usePalette } from '@/theme/colors';

const SOURCES: [string, string][] = [
  ['아파트 매매·전월세 실거래가', '국토교통부 실거래가 공개시스템 (공공데이터포털) · 매일 갱신'],
  ['단지 목록·기본·상세정보, 주차대수(지상/지하), 단지 내 전기차 충전기', '국토교통부 공동주택관리정보시스템(K-apt) (공공데이터포털) · 매주 갱신'],
  ['주차 구분(자주식/기계식), 용적률·건폐율', '국토교통부 건축HUB 건축물대장 (공공데이터포털) · 매월 갱신'],
  ['지도·로드뷰·주소/장소 검색·주변시설', '카카오맵 API'],
  ['통근버스 노선', '사용자가 불러온 파일 (이 폰에만 저장)'],
];

/** 데이터 출처 안내 + 개인정보처리방침 */
export default function AboutScreen() {
  const c = usePalette();
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const privacy = tab === 'privacy';
  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={{ padding: space.lg, gap: space.lg }}>
      <Stack.Screen options={{ title: privacy ? '개인정보처리방침' : '데이터 출처 안내' }} />
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <Chip label="데이터 출처" active={!privacy} onPress={() => router.setParams({ tab: '' })} />
        <Chip label="개인정보처리방침" active={privacy} onPress={() => router.setParams({ tab: 'privacy' })} />
      </View>
      {privacy ? (
        <Card>
          <Text style={{ color: c.text, fontSize: 15, lineHeight: 24 }}>
            {`1. 모으는 정보
- 로그인하지 않으면 서버에 저장하는 개인정보가 없습니다.
- 즐겨찾기·최근 본 단지·메모·내 매물함·임장 체크리스트·직장 위치·통근버스 노선은 이 휴대폰에만 저장됩니다.
- 현재 위치는 '현재 위치' 버튼을 누를 때만 지도 표시에 사용하고 저장하지 않습니다.

2. 커뮤니티(로그인 시)
- 닉네임, 작성한 글·댓글, 신고·차단 기록을 저장합니다. 글 속 전화번호는 자동으로 가려집니다.
- 탈퇴하면 계정과 글은 30일 안에 삭제됩니다.

3. 외부 서비스
- 지도·장소 검색은 카카오 API를 사용합니다(검색어·좌표가 카카오로 전송).
- 공유받은 매물 링크는 그 링크의 공개 미리보기만 읽고 저장하지 않습니다.

4. 문의: 앱 스토어에 등록된 개발자 이메일

※ 정식 출시 전 실제 운영 정보(운영자, 연락처, 시행일)로 바꿔야 합니다.`}
          </Text>
        </Card>
      ) : (
        <>
          {SOURCES.map(([k, v]) => (
            <Card key={k}>
              <Text style={{ color: c.text, fontSize: 15, fontWeight: '800' }}>{k}</Text>
              <Text style={{ color: c.textSub, fontSize: 14, marginTop: 4, lineHeight: 20 }}>{v}</Text>
            </Card>
          ))}
          <Text style={{ color: c.textSub, fontSize: 13, lineHeight: 20 }}>
            공공데이터는 공공데이터포털 이용 조건에 따라 출처를 표시합니다. 모든 수치 옆에 출처와 기준일을 함께 보여줍니다. 본 정보는 참고용이며 실제 거래 시 공식 서류(등기부등본, 건축물대장 등)를 확인하세요.
          </Text>
        </>
      )}
    </ScrollView>
  );
}
