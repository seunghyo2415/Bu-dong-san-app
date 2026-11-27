import { Ionicons } from '@expo/vector-icons';
import { formatBuiltYear, formatManwon, formatManwonShort, formatPercent, formatDistance, haversineM, jeonseRatio, m2ToPyeong } from '@ulsan/shared';
import { useQueries } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { EmptyState, MockBadge } from '@/components/ui';
import { dataSource, type ComplexDetail } from '@/data';
import { useNearby } from '@/features/location/nearby';
import { useAppStore } from '@/stores/app-store';
import { space, usePalette } from '@/theme/colors';

type RowDef = { label: string; value: (d: ComplexDetail) => number | null; format: (v: number) => string; better: 'high' | 'low' | null };

const underRatio = (d: ComplexDetail) => {
  const f = d.parking.facts[0];
  const total = (f?.ground ?? 0) + (f?.underground ?? 0);
  return total ? (f.underground ?? 0) / total : null;
};

const ROWS: RowDef[] = [
  { label: '최근 매매가', value: (d) => d.recentPrice?.value ?? null, format: formatManwon, better: null },
  { label: '대표 평형', value: (d) => d.representativeM2 || null, format: (v) => `${v}㎡\n(${m2ToPyeong(v)}평)`, better: null },
  { label: '평당가', value: (d) => d.pricePerPyeong, format: formatManwonShort, better: 'low' },
  { label: '전세가율', value: (d) => (d.recentPrice && d.recentJeonse ? jeonseRatio(d.recentJeonse.value, d.recentPrice.value) : null), format: (v) => formatPercent(v, 0), better: null },
  { label: '입주', value: (d) => (d.approvedDate ? Number(d.approvedDate.slice(0, 4)) : null), format: (v) => formatBuiltYear(`${v}-01-01`).replace(' (', '\n('), better: 'high' },
  { label: '세대수', value: (d) => d.households || null, format: (v) => `${v.toLocaleString()}세대`, better: 'high' },
  { label: '세대당 주차', value: (d) => d.parkingPerHousehold?.value ?? null, format: (v) => `${v.toFixed(2)}대`, better: 'high' },
  { label: '지하주차 비율', value: underRatio, format: (v) => formatPercent(v, 0), better: 'high' },
];

export default function CompareScreen() {
  const c = usePalette();
  const ids = useAppStore((s) => s.compareIds);
  const toggle = useAppStore((s) => s.toggleCompare);
  const workplace = useAppStore((s) => s.workplaces[0]);
  const qs = useQueries({ queries: ids.map((id) => ({ queryKey: ['complex-detail', id], queryFn: () => dataSource.getComplexDetail(id) })) });
  const items = qs.map((q) => q.data).filter((d): d is ComplexDetail => !!d);

  if (!ids.length) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, justifyContent: 'center' }}>
        <EmptyState title="비교할 단지를 담아 주세요" message="단지 상세 화면 아래 「비교」 버튼으로 최대 3곳까지 담을 수 있어요." action={{ label: '지도에서 찾기', onPress: () => router.navigate('/map') }} />
      </View>
    );
  }

  const best = (r: RowDef) => {
    if (!r.better) return null;
    const vals = items.map(r.value).filter((v): v is number => v != null);
    if (vals.length < 2) return null;
    return r.better === 'high' ? Math.max(...vals) : Math.min(...vals);
  };

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={{ padding: space.lg, gap: space.md }}>
      <MockBadge />
      <View style={[styles.table, { backgroundColor: c.card, borderColor: c.border }]}>
        <View style={[styles.row, { borderBottomColor: c.border }]}>
          <View style={styles.labelCell} />
          {items.map((d) => (
            <View key={d.id} style={styles.cell}>
              <Pressable onPress={() => router.push(`/complex/${d.id}`)}>
                <Text style={{ color: c.text, fontWeight: '800', fontSize: 14, textAlign: 'center' }} numberOfLines={2}>
                  {d.name}
                </Text>
              </Pressable>
              <Pressable onPress={() => toggle(d.id)} hitSlop={8} accessibilityLabel={`${d.name} 비교에서 빼기`} style={{ marginTop: 4 }}>
                <Ionicons name="close-circle" size={18} color={c.textSub} />
              </Pressable>
            </View>
          ))}
        </View>
        {ROWS.map((r) => {
          const b = best(r);
          return (
            <View key={r.label} style={[styles.row, { borderBottomColor: c.border }]}>
              <Text style={[styles.labelCell, { color: c.textSub }]}>{r.label}</Text>
              {items.map((d) => {
                const v = r.value(d);
                const win = b != null && v === b;
                return (
                  <Text key={d.id} style={[styles.cell, { color: win ? c.good : c.text, fontWeight: win ? '900' : '600' }]}>
                    {v == null || !Number.isFinite(v) ? '-' : r.format(v)}
                  </Text>
                );
              })}
            </View>
          );
        })}
        <View style={[styles.row, { borderBottomColor: c.border }]}>
          <Text style={[styles.labelCell, { color: c.textSub }]}>초등학교 도보</Text>
          {items.map((d) => (
            <ElemSchool key={d.id} d={d} />
          ))}
        </View>
        <View style={[styles.row, { borderBottomColor: c.border }]}>
          <Text style={[styles.labelCell, { color: c.textSub }]}>{workplace ? `${workplace.name.slice(0, 8)} 거리` : '직장 거리'}</Text>
          {items.map((d) => (
            <Text key={d.id} style={[styles.cell, { color: c.text }]}>
              {workplace && d.location ? formatDistance(haversineM(d.location, workplace.location)) : '-'}
            </Text>
          ))}
        </View>
        <View style={[styles.row, { borderBottomWidth: 0 }]}>
          <Text style={[styles.labelCell, { color: c.textSub }]}>관리비</Text>
          {items.map((d) => (
            <Text key={d.id} style={[styles.cell, { color: c.textSub, fontSize: 12 }]}>
              공개 데이터 연결 예정
            </Text>
          ))}
        </View>
      </View>
      <Text style={{ color: c.textSub, fontSize: 12, lineHeight: 18 }}>
        초록색은 그 항목에서 가장 유리한 값이에요(평당가는 낮을수록, 주차·연식·세대수는 높을수록). 직장 거리는 설정에 등록한 첫 직장까지 직선거리예요. 본 정보는 참고용이에요.
      </Text>
    </ScrollView>
  );
}

function ElemSchool({ d }: { d: ComplexDetail }) {
  const c = usePalette();
  const q = useNearby(d.location);
  const e = q.data?.find((x) => x.key === 'elem');
  return (
    <Text style={[styles.cell, { color: c.text }]}>
      {e?.walk != null ? `${e.walk}분\n${formatDistance(e.distanceM!)}` : q.isFetching ? '…' : '-'}
    </Text>
  );
}

const styles = StyleSheet.create({
  table: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  labelCell: { width: 84, fontSize: 13 },
  cell: { flex: 1, textAlign: 'center', fontSize: 14, alignItems: 'center' },
});
