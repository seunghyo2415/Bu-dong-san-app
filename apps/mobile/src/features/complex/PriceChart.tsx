import { formatManwonShort, monthlyMedians } from '@ulsan/shared';
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';

import type { Trade } from '@/data';
import { usePalette } from '@/theme/colors';

const H = 210;
const PAD = { l: 44, r: 10, t: 12, b: 24 };

const t = (date: string) => Date.parse(date + 'T00:00:00Z');

/** 실거래 점 그래프 + 월별 중간값 선. 해제 거래는 속이 빈 회색 점. */
export function PriceChart({ trades, from, to }: { trades: Trade[]; from: string; to: string }) {
  const c = usePalette();
  const [w, setW] = useState(0);

  const model = useMemo(() => {
    if (!trades.length || !w) return null;
    const prices = trades.map((x) => x.price);
    let min = Math.min(...prices);
    let max = Math.max(...prices);
    const span = Math.max(max - min, max * 0.1);
    min = Math.max(0, min - span * 0.1);
    max = max + span * 0.1;
    const x0 = t(from);
    const x1 = t(to);
    const sx = (d: string) => PAD.l + ((t(d) - x0) / Math.max(1, x1 - x0)) * (w - PAD.l - PAD.r);
    const sy = (p: number) => PAD.t + (1 - (p - min) / (max - min)) * (H - PAD.t - PAD.b);
    const ticks = [0, 1, 2, 3].map((i) => min + ((max - min) * i) / 3);
    const meds = monthlyMedians(trades);
    const path = meds.map((m, i) => `${i ? 'L' : 'M'}${sx(m.ym + '-15').toFixed(1)},${sy(m.median).toFixed(1)}`).join(' ');
    const years: number[] = [];
    for (let y = Number(from.slice(0, 4)) + 1; y <= Number(to.slice(0, 4)); y++) years.push(y);
    return { sx, sy, ticks, path, years };
  }, [trades, w, from, to]);

  return (
    <View
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      style={{ height: H }}
      accessible
      accessibilityLabel={`실거래 ${trades.length}건 가격 추이 그래프`}>
      {!trades.length ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: c.textSub }}>이 기간에는 거래가 없어요</Text>
        </View>
      ) : model ? (
        <Svg width={w} height={H}>
          {model.ticks.map((v) => (
            <Line key={`g${v}`} x1={PAD.l} x2={w - PAD.r} y1={model.sy(v)} y2={model.sy(v)} stroke={c.border} strokeWidth={1} />
          ))}
          {model.ticks.map((v) => (
            <SvgText key={`l${v}`} x={PAD.l - 6} y={model.sy(v) + 4} fontSize={11} fill={c.textSub} textAnchor="end">
              {formatManwonShort(Math.round(v / 100) * 100)}
            </SvgText>
          ))}
          {model.years.map((y) => {
            const x = model.sx(`${y}-01-01`);
            return (
              <SvgText key={y} x={x} y={H - 6} fontSize={11} fill={c.textSub} textAnchor="middle">
                {`${String(y).slice(2)}년`}
              </SvgText>
            );
          })}
          {trades.map((tr) => (
            <Circle
              key={tr.id}
              cx={model.sx(tr.date)}
              cy={model.sy(tr.price)}
              r={3.2}
              fill={tr.canceled ? 'none' : c.primary}
              fillOpacity={tr.canceled ? 1 : 0.45}
              stroke={tr.canceled ? c.textSub : 'none'}
              strokeWidth={1}
            />
          ))}
          <Path d={model.path} stroke={c.primary} strokeWidth={2.5} fill="none" strokeLinejoin="round" />
        </Svg>
      ) : null}
    </View>
  );
}
