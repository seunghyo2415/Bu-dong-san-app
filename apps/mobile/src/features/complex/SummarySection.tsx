import {
  formatArea,
  formatBuiltYear,
  formatManwon,
  formatPercent,
  jeonseRatio,
  parkingGrade,
  PARKING_GRADE_LABEL,
  sigunguName,
} from '@ulsan/shared';
import { Text, View } from 'react-native';

import { Card, InfoTip, SourceNote } from '@/components/ui';
import type { ComplexDetail } from '@/data';
import { space, usePalette } from '@/theme/colors';

import { gradeColor } from './grade';

export function SummarySection({ d }: { d: ComplexDetail }) {
  const c = usePalette();
  const p = d.parkingPerHousehold?.value;
  const grade = p != null ? parkingGrade(p) : null;
  const ratio = d.recentPrice && d.recentJeonse ? jeonseRatio(d.recentJeonse.value, d.recentPrice.value) : NaN;

  const facts: [string, string][] = [
    ['입주', formatBuiltYear(d.approvedDate)],
    ['세대수', `${d.households.toLocaleString()}세대`],
    ['동 수', `${d.dongCount}개동`],
    ['최고층', `${d.topFloor}층`],
    ['시공사', d.builder],
  ];

  return (
    <View style={{ gap: space.md }}>
      <View>
        <Text style={{ color: c.text, fontSize: 26, fontWeight: '800' }}>{d.name}</Text>
        <Text style={{ color: c.textSub, fontSize: 14, marginTop: 4 }} selectable>
          {sigunguName(d.sigunguCode)} · {d.roadAddress}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.sm }}>
          {facts.map(([k, v]) => (
            <Text key={k} style={{ color: c.text, fontSize: 14, backgroundColor: c.chip, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, overflow: 'hidden' }}>
              <Text style={{ color: c.textSub }}>{k} </Text>
              {v}
            </Text>
          ))}
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: space.md }}>
        <Card style={{ flex: 1 }}>
          <Text style={{ color: c.textSub, fontSize: 13 }}>매매 최근 실거래</Text>
          <Text style={{ color: c.text, fontSize: 22, fontWeight: '800', marginTop: 4 }}>{d.recentPrice ? formatManwon(d.recentPrice.value) : '거래 없음'}</Text>
          <Text style={{ color: c.textSub, fontSize: 12, marginTop: 2 }}>전용 {formatArea(d.representativeM2)}</Text>
        </Card>
        <Card style={{ flex: 1 }}>
          <Text style={{ color: c.textSub, fontSize: 13 }}>전세 최근 실거래</Text>
          <Text style={{ color: c.text, fontSize: 22, fontWeight: '800', marginTop: 4 }}>{d.recentJeonse ? formatManwon(d.recentJeonse.value) : '거래 없음'}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
            <Text style={{ color: c.textSub, fontSize: 12 }}>전세가율 {formatPercent(ratio, 0)}</Text>
            <InfoTip term="전세가율" />
          </View>
        </Card>
      </View>

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={{ color: c.textSub, fontSize: 14 }}>세대당 주차대수</Text>
          <InfoTip term="세대당주차" label="세대당 주차대수" />
        </View>
        {p != null && grade ? (
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: space.sm, marginTop: 4 }}>
            <Text style={{ color: gradeColor(p, c), fontSize: 44, fontWeight: '900', lineHeight: 50 }}>{p.toFixed(2)}대</Text>
            <Text style={{ color: gradeColor(p, c), fontSize: 20, fontWeight: '800', marginBottom: 6 }}>{PARKING_GRADE_LABEL[grade]}</Text>
          </View>
        ) : (
          <Text style={{ color: c.textSub, marginTop: 4 }}>주차 정보가 없어요</Text>
        )}
        <Text style={{ color: c.textSub, fontSize: 13 }}>
          {d.parking.dongRank.dongName} {d.parking.dongRank.total}개 단지 중 {d.parking.dongRank.position}위 · 1.5대↑ 여유 / 1.0~1.5 보통 / 1.0↓ 부족
        </Text>
      </Card>
      {d.recentPrice ? <SourceNote source={d.recentPrice.source} asOf={d.recentPrice.asOf} /> : null}
    </View>
  );
}
