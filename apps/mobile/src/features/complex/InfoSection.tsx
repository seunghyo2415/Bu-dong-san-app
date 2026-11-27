import { formatArea } from '@ulsan/shared';
import { Text, View } from 'react-native';

import { Card, Row, SectionTitle } from '@/components/ui';
import type { ComplexDetail } from '@/data';
import { space, usePalette } from '@/theme/colors';

const LATER: [string, string][] = [
  ['매물 (당근 공유 · 외부 매물 바로가기)', '5단계'],
  ['위치 · 로드뷰 · 주변시설 · 학교 · 통근버스 정류장', '6단계'],
  ['관리비 · 용적률/건폐율 · 건축물대장', '4단계 (실데이터 연결 시)'],
  ['커뮤니티 (블로그·카페·유튜브 모아보기, 주민 게시판)', '7단계'],
  ['취득세 · 대출 · 갭 계산기', '8단계'],
];

export function InfoSection({ d }: { d: ComplexDetail }) {
  const c = usePalette();
  return (
    <View style={{ gap: space.md }}>
      <SectionTitle title="단지 정보" />
      <Card>
        <Row label="난방 방식" value={d.heating} />
        <Row label="복도 형태" value={d.hallType} />
        <Row label="지번 주소" value={d.jibunAddress} />
        <Row label="사용승인일" value={d.approvedDate} />
      </Card>
      <Card>
        <Text style={{ color: c.text, fontSize: 16, fontWeight: '800', marginBottom: space.xs }}>평형 구성</Text>
        {d.areaTypes.map((a) => (
          <Row key={a.exclusiveM2} label={`전용 ${formatArea(a.exclusiveM2)}`} value={`${a.households.toLocaleString()}세대`} />
        ))}
      </Card>
      <Card>
        <Text style={{ color: c.text, fontSize: 16, fontWeight: '800', marginBottom: space.xs }}>다음 단계에서 추가돼요</Text>
        {LATER.map(([k, v]) => (
          <Row key={k} label={k} value={v} />
        ))}
      </Card>
    </View>
  );
}
