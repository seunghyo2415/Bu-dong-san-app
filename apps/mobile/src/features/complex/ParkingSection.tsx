import { compareParkingSources, formatPercent, parkingPerHousehold } from '@ulsan/shared';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

import { Card, InfoTip, Row, SectionTitle, SourceNote } from '@/components/ui';
import type { ComplexDetail, ParkingFact } from '@/data';
import { radius, space, usePalette } from '@/theme/colors';

import { gradeColor } from './grade';

/** 가로 막대: 값들의 비율을 색으로 나눠 보여줌 */
function StackBar({ parts }: { parts: { label: string; value: number; color: string }[] }) {
  const c = usePalette();
  const total = parts.reduce((a, b) => a + b.value, 0) || 1;
  return (
    <View>
      <View style={{ flexDirection: 'row', height: 14, borderRadius: radius.pill, overflow: 'hidden', backgroundColor: c.chip }}>
        {parts.map((p) => (p.value > 0 ? <View key={p.label} style={{ flex: p.value / total, backgroundColor: p.color }} /> : null))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md, marginTop: 6 }}>
        {parts.map((p) => (
          <View key={p.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: p.color }} />
            <Text style={{ color: c.textSub, fontSize: 13 }}>
              {p.label} {p.value.toLocaleString()}대 ({formatPercent(p.value / total, 0)})
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function Stars({ score }: { score: number }) {
  const c = usePalette();
  return (
    <View style={{ flexDirection: 'row' }} accessibilityLabel={`5점 중 ${score}점`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons key={i} name={score >= i ? 'star' : score >= i - 0.5 ? 'star-half' : 'star-outline'} size={16} color={c.warn} />
      ))}
    </View>
  );
}

const totalOf = (f: ParkingFact) => (f.ground ?? 0) + (f.underground ?? 0);
const hasBreakdown = (f: ParkingFact) => f.indoorSelf != null || f.indoorMech != null || f.outdoorSelf != null || f.outdoorMech != null;

export function ParkingSection({ d }: { d: ComplexDetail }) {
  const c = usePalette();
  const reviews = d.parking.reviews;
  const facts = d.parking.facts.filter((f) => totalOf(f) > 0);
  if (!facts.length) {
    return (
      <View style={{ gap: space.md }}>
        <SectionTitle title="주차 정보" />
        <Card>
          <Text style={{ color: c.textSub, lineHeight: 21 }}>
            이 단지는 공공데이터에 주차대수가 없어요. (소규모 단지는 공동주택관리정보시스템 의무 공개 대상이 아닐 수 있어요)
          </Text>
        </Card>
      </View>
    );
  }
  const [primary, ...others] = facts;
  const total = totalOf(primary);
  const under = primary.underground ?? 0;
  const ground = primary.ground ?? 0;
  const per = parkingPerHousehold(total, d.households);
  const detailFact = facts.find(hasBreakdown); // 자주식/기계식 구분은 건축물대장에만 있음
  const mech = detailFact ? (detailFact.indoorMech ?? 0) + (detailFact.outdoorMech ?? 0) : null;
  const mechRatio = detailFact && mech != null ? mech / Math.max(1, totalOf(detailFact)) : null;
  const indoorColor = c.primary;
  const outdoorColor = c.warn;

  return (
    <View style={{ gap: space.md }}>
      <SectionTitle title="주차 정보" />

      <Card>
        <Text style={{ color: c.textSub, fontSize: 14 }}>총 주차대수</Text>
        <Text style={{ color: c.text, fontSize: 32, fontWeight: '900', marginTop: 2 }}>
          {total.toLocaleString()}대
          <Text style={{ fontSize: 16, fontWeight: '600', color: c.textSub }}>
            {'  '}= 지하 {under.toLocaleString()} + 지상 {ground.toLocaleString()}
          </Text>
        </Text>
        <Text style={{ color: gradeColor(per, c), fontSize: 17, fontWeight: '800', marginTop: 4 }}>
          세대당 {Number.isFinite(per) ? per.toFixed(2) : '-'}대 ({total.toLocaleString()}대 ÷ {d.households.toLocaleString()}세대)
        </Text>
        <View style={{ marginTop: space.md }}>
          <StackBar
            parts={[
              { label: '지하', value: under, color: indoorColor },
              { label: '지상', value: ground, color: outdoorColor },
            ]}
          />
        </View>
        <View style={{ marginTop: space.md }}>
          <Row label="지하주차장 비율" value={formatPercent(under / Math.max(1, total), 0)} tip={<InfoTip term="옥내옥외" label="옥내(지하) · 옥외(지상)" />} />
          <Row
            label="기계식 비율"
            value={mechRatio == null ? '정보 없음' : mechRatio > 0 ? `${formatPercent(mechRatio, 0)} (${mech!.toLocaleString()}대, 건축물대장)` : '없음 (전부 자주식)'}
            tip={<InfoTip term="자주식기계식" label="자주식 · 기계식" />}
          />
          <Row label="지하 → 엘리베이터 연결" value={d.parking.elevatorToUnderground == null ? '정보 없음' : d.parking.elevatorToUnderground ? '연결됨' : '연결 안 됨'} />
          <Row label={`${d.parking.dongRank.dongName} 안 순위`} value={`${d.parking.dongRank.total}개 단지 중 ${d.parking.dongRank.position}위`} strong />
        </View>
        <View style={{ marginTop: space.sm }}>
          <SourceNote source={primary.sourceLabel} asOf={primary.asOf} />
        </View>
      </Card>

      {detailFact ? (
        <Card>
          <Text style={{ color: c.text, fontSize: 16, fontWeight: '800', marginBottom: space.xs }}>구분별 주차대수 (건축물대장)</Text>
          <Row label="옥내(지하) 자주식" value={`${(detailFact.indoorSelf ?? 0).toLocaleString()}대`} />
          <Row label="옥내(지하) 기계식" value={`${(detailFact.indoorMech ?? 0).toLocaleString()}대`} />
          <Row label="옥외(지상) 자주식" value={`${(detailFact.outdoorSelf ?? 0).toLocaleString()}대`} />
          <Row label="옥외(지상) 기계식" value={`${(detailFact.outdoorMech ?? 0).toLocaleString()}대`} />
          <SourceNote source={detailFact.sourceLabel} asOf={detailFact.asOf} />
        </Card>
      ) : null}

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: space.xs }}>
          <Text style={{ color: c.text, fontSize: 16, fontWeight: '800' }}>출처별 비교</Text>
          <InfoTip term="출처차이" label="출처마다 숫자가 다른 이유" />
        </View>
        {facts.map((f) => {
          const t = totalOf(f);
          return (
            <Row
              key={f.source}
              label={`${f.sourceLabel}\n기준일 ${f.asOf}`}
              value={`${t.toLocaleString()}대 · 세대당 ${parkingPerHousehold(t, d.households).toFixed(2)}`}
            />
          );
        })}
        {others.map((o) => {
          const cmp = compareParkingSources(total, totalOf(o));
          return cmp.significant ? (
            <View key={o.source} style={{ flexDirection: 'row', gap: 6, marginTop: space.sm, alignItems: 'flex-start' }}>
              <Ionicons name="warning" size={16} color={c.warn} />
              <Text style={{ color: c.warn, fontSize: 13, flex: 1, lineHeight: 19 }}>
                두 출처 차이 {cmp.diff > 0 ? '+' : ''}
                {cmp.diff.toLocaleString()}대 ({formatPercent(cmp.ratio, 0)}). 위 대표값은 {primary.sourceLabel} 기준이에요. 정확한 값은 관리사무소에 확인하세요.
              </Text>
            </View>
          ) : (
            <Text key={o.source} style={{ color: c.textSub, fontSize: 13, marginTop: space.sm }}>
              두 출처 값이 비슷해요 (차이 {formatPercent(Math.abs(cmp.ratio), 0)}).
            </Text>
          );
        })}
      </Card>

      <Card>
        <Row
          label="전기차 충전기 (반경 500m)"
          value={d.parking.evChargers ? `${d.parking.evChargers.value}기` : '정보 없음'}
          strong
        />
        {d.parking.evChargers ? <SourceNote source={d.parking.evChargers.source} asOf={d.parking.evChargers.asOf} /> : null}
      </Card>

      <Card>
        <Text style={{ color: c.text, fontSize: 16, fontWeight: '800' }}>퇴근시간 주차 체감 (주민 평가)</Text>
        {reviews.count ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.sm }}>
              <Text style={{ color: c.text, fontSize: 28, fontWeight: '900' }}>{reviews.average.toFixed(1)}</Text>
              <Stars score={reviews.average} />
              <Text style={{ color: c.textSub }}>({reviews.count}명)</Text>
            </View>
            {reviews.recent.map((r, i) => (
              <View key={i} style={{ borderTopWidth: 1, borderTopColor: c.border, paddingVertical: 10, marginTop: i ? 0 : space.sm }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Stars score={r.score} />
                  <Text style={{ color: c.textSub, fontSize: 12 }}>{r.date}</Text>
                </View>
                <Text style={{ color: c.text, fontSize: 15, marginTop: 4 }}>{r.comment}</Text>
              </View>
            ))}
          </>
        ) : (
          <Text style={{ color: c.textSub, marginTop: space.sm }}>아직 평가가 없어요.</Text>
        )}
        <Pressable disabled style={{ marginTop: space.sm, paddingVertical: 12, borderRadius: radius.md, backgroundColor: c.chip, alignItems: 'center', opacity: 0.6 }}>
          <Text style={{ color: c.text, fontWeight: '700' }}>평가 남기기 (로그인 기능 연결 후)</Text>
        </Pressable>
        <Text style={{ color: c.textSub, fontSize: 12, marginTop: 6 }}>주민 평가는 목업이에요. 실제 평가는 로그인 기능(4·7단계) 이후 받을 수 있어요.</Text>
      </Card>
    </View>
  );
}
