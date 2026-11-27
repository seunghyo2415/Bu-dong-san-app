import {
  formatArea,
  formatManwon,
  formatPercent,
  highestTrade,
  jeonseRatio,
  latestTrade,
  m2ToPyeong,
  ratioToPeak,
  withinYears,
} from '@ulsan/shared';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Card, Chip, EmptyState, InfoTip, Row, SectionTitle, Skeleton, SourceNote } from '@/components/ui';
import { dataSource, type ComplexDetail, type DealType, type Trade } from '@/data';
import { MOCK_AS_OF } from '@/data/mock/complexes';
import { space, usePalette } from '@/theme/colors';

import { PriceChart } from './PriceChart';

const DEAL_LABEL: Record<DealType, string> = { sale: '매매', jeonse: '전세', monthly: '월세' };
const PERIODS: { label: string; years: number | null }[] = [
  { label: '1년', years: 1 },
  { label: '3년', years: 3 },
  { label: '5년', years: 5 },
  { label: '전체', years: null },
];

function priceText(t: Trade) {
  return t.dealType === 'monthly' ? `${formatManwon(t.price)} / 월 ${t.monthlyRent}만` : formatManwon(t.price);
}

export function PriceSection({ d }: { d: ComplexDetail }) {
  const c = usePalette();
  const q = useQuery({ queryKey: ['trades', d.id], queryFn: () => dataSource.getTrades(d.id) });
  const [area, setArea] = useState(d.representativeM2);
  const [deal, setDeal] = useState<DealType>('sale');
  const [period, setPeriod] = useState<number | null>(3);
  const [showAll, setShowAll] = useState(false);

  const today = dataSource.mode === 'mock' ? MOCK_AS_OF : new Date().toISOString().slice(0, 10);

  const view = useMemo(() => {
    const all = q.data ?? [];
    const sameArea = all.filter((t) => t.exclusiveM2 === area);
    const ofDeal = sameArea.filter((t) => t.dealType === deal);
    const inPeriod = withinYears(ofDeal, period, today);
    const latest = latestTrade(ofDeal);
    const peak = highestTrade(ofDeal);
    const lastSale = latestTrade(sameArea.filter((t) => t.dealType === 'sale'));
    const lastJeonse = latestTrade(sameArea.filter((t) => t.dealType === 'jeonse'));
    const from = period == null ? (ofDeal.length ? ofDeal[ofDeal.length - 1].date : today) : withinYearsStart(today, period);
    return { inPeriod, latest, peak, lastSale, lastJeonse, from };
  }, [q.data, area, deal, period, today]);

  return (
    <View style={{ gap: space.md }}>
      <SectionTitle title="실거래가 · 시세" />

      {/* 평형 탭 */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
        {d.areaTypes.map((a) => (
          <Chip
            key={a.exclusiveM2}
            label={`전용 ${a.exclusiveM2}㎡ (${m2ToPyeong(a.exclusiveM2)}평)`}
            active={area === a.exclusiveM2}
            onPress={() => {
              setArea(a.exclusiveM2);
              setShowAll(false);
            }}
          />
        ))}
      </ScrollView>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Text style={{ color: c.textSub, fontSize: 13 }}>
          {formatArea(area)} · 공급 {d.areaTypes.find((a) => a.exclusiveM2 === area)?.supplyM2}㎡ · {d.areaTypes.find((a) => a.exclusiveM2 === area)?.households}세대
        </Text>
        <InfoTip term="전용면적" />
      </View>

      <View style={{ flexDirection: 'row', gap: space.sm }}>
        {(Object.keys(DEAL_LABEL) as DealType[]).map((k) => (
          <Chip key={k} label={DEAL_LABEL[k]} active={deal === k} onPress={() => setDeal(k)} />
        ))}
      </View>

      {q.isPending ? (
        <Card style={{ gap: space.md }}>
          <Skeleton height={28} width="50%" />
          <Skeleton height={200} />
        </Card>
      ) : q.isError ? (
        <EmptyState title="거래 내역을 불러오지 못했어요" action={{ label: '다시 시도', onPress: () => q.refetch() }} />
      ) : (
        <>
          <Card>
            <Text style={{ color: c.textSub, fontSize: 13 }}>최근 {DEAL_LABEL[deal]} 실거래</Text>
            {view.latest ? (
              <>
                <Text style={{ color: c.text, fontSize: 28, fontWeight: '900', marginTop: 2 }}>{priceText(view.latest)}</Text>
                <Text style={{ color: c.textSub, fontSize: 13 }}>
                  {view.latest.date} · {view.latest.floor}층
                </Text>
              </>
            ) : (
              <Text style={{ color: c.text, fontSize: 18, marginTop: 4 }}>거래 없음</Text>
            )}
            {deal !== 'monthly' && view.peak && view.latest ? (
              <View style={{ marginTop: space.sm }}>
                <Row label="역대 최고가" value={`${formatManwon(view.peak.price)} (${view.peak.date.slice(0, 7)})`} />
                <Row
                  label="최고가 대비"
                  value={formatPercent(ratioToPeak(view.latest.price, view.peak.price), 0)}
                  tip={<InfoTip term="최고가대비" label="최고가 대비" />}
                  strong
                />
                {view.lastSale && view.lastJeonse ? (
                  <Row
                    label="전세가율 (최근 거래 기준)"
                    value={formatPercent(jeonseRatio(view.lastJeonse.price, view.lastSale.price), 0)}
                    tip={<InfoTip term="전세가율" />}
                  />
                ) : null}
                <Row label="공시가격" value="4단계에서 데이터 확인 후 표시" />
              </View>
            ) : null}
          </Card>

          {deal !== 'monthly' ? (
            <Card>
              <View style={{ flexDirection: 'row', gap: space.sm, marginBottom: space.md }}>
                {PERIODS.map((p) => (
                  <Chip key={p.label} label={p.label} active={period === p.years} onPress={() => setPeriod(p.years)} />
                ))}
              </View>
              <PriceChart trades={view.inPeriod} from={view.from} to={today} />
              <Text style={{ color: c.textSub, fontSize: 12, marginTop: 6 }}>점 = 거래 1건 · 선 = 월별 중간값 · 빈 점 = 해제된 거래</Text>
            </Card>
          ) : null}

          <Card>
            <Text style={{ color: c.text, fontSize: 16, fontWeight: '800', marginBottom: space.xs }}>
              최근 거래 ({view.inPeriod.length}건{period ? `, ${period}년` : ''})
            </Text>
            <View style={{ flexDirection: 'row', paddingVertical: 6 }}>
              <Text style={{ color: c.textSub, fontSize: 12, width: 84 }}>계약일</Text>
              <Text style={{ color: c.textSub, fontSize: 12, width: 40 }}>층</Text>
              <Text style={{ color: c.textSub, fontSize: 12, flex: 1, textAlign: 'right' }}>가격</Text>
            </View>
            {(showAll ? view.inPeriod : view.inPeriod.slice(0, 10)).map((t) => (
              <View key={t.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 9, borderTopWidth: 1, borderTopColor: c.border, opacity: t.canceled ? 0.55 : 1 }}>
                <Text style={{ color: c.text, fontSize: 14, width: 84 }}>{t.date.slice(2).replace(/-/g, '.')}</Text>
                <Text style={{ color: c.text, fontSize: 14, width: 40 }}>{t.floor}층</Text>
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <Text style={{ color: c.text, fontSize: 15, fontWeight: '700', textDecorationLine: t.canceled ? 'line-through' : 'none' }}>{priceText(t)}</Text>
                  {t.isDirect || t.canceled ? (
                    <Text style={{ color: t.canceled ? c.bad : c.warn, fontSize: 12 }}>
                      {[t.isDirect && '직거래', t.canceled && '해제'].filter(Boolean).join(' · ')}
                    </Text>
                  ) : null}
                </View>
              </View>
            ))}
            {!showAll && view.inPeriod.length > 10 ? (
              <Pressable onPress={() => setShowAll(true)} style={{ paddingVertical: 12, alignItems: 'center' }}>
                <Text style={{ color: c.primary, fontWeight: '700' }}>전체 {view.inPeriod.length}건 보기</Text>
              </Pressable>
            ) : null}
            <View style={{ flexDirection: 'row', gap: space.md, marginTop: space.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                <Text style={{ color: c.textSub, fontSize: 12 }}>직거래</Text>
                <InfoTip term="직거래" />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                <Text style={{ color: c.textSub, fontSize: 12 }}>해제</Text>
                <InfoTip term="해제" label="해제(취소) 거래" />
              </View>
            </View>
            <View style={{ marginTop: space.sm }}>
              <SourceNote source={dataSource.mode === 'mock' ? '목업 데이터' : '국토교통부 실거래가 공개시스템'} asOf={today} />
            </View>
          </Card>
        </>
      )}
    </View>
  );
}

function withinYearsStart(today: string, years: number) {
  const dt = new Date(today + 'T00:00:00Z');
  dt.setUTCFullYear(dt.getUTCFullYear() - years);
  return dt.toISOString().slice(0, 10);
}
