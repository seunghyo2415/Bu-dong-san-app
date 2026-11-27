import { acquisitionTax, DEFAULT_POLICY, dsr, formatManwon, formatPercent, gapAnalysis, loanSchedule, mergePolicy, type LoanMethod, type PolicyConfig } from '@ulsan/shared';
import { useQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { Card, Chip, InfoTip, Row } from '@/components/ui';
import { dataSource } from '@/data';
import { radius, space, usePalette } from '@/theme/colors';

const wonText = (w: number) => `${Math.round(w).toLocaleString('ko-KR')}원`;
const num = (s: string) => Number(s.replace(/[^\d.]/g, '')) || 0;

function usePolicy(): { policy: PolicyConfig; fromDb: boolean } {
  const q = useQuery({ queryKey: ['policy'], queryFn: () => dataSource.getPolicy(), staleTime: 24 * 3600 * 1000 });
  return useMemo(() => {
    const v = q.data?.value as Partial<PolicyConfig> | undefined;
    if (!v) return { policy: DEFAULT_POLICY, fromDb: false };
    return { policy: mergePolicy(DEFAULT_POLICY, { ...v, verifiedAt: q.data?.verifiedAt ?? null, effectiveFrom: q.data?.effectiveFrom ?? DEFAULT_POLICY.effectiveFrom }), fromDb: true };
  }, [q.data]);
}

function Input({ label, value, onChange, suffix, hint }: { label: string; value: string; onChange: (v: string) => void; suffix?: string; hint?: string }) {
  const c = usePalette();
  return (
    <View style={{ marginTop: space.md }}>
      <Text style={{ color: c.textSub, fontSize: 13, marginBottom: 4 }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: c.border, borderRadius: radius.md, paddingHorizontal: space.md }}>
        <TextInput value={value} onChangeText={onChange} keyboardType="decimal-pad" style={{ flex: 1, color: c.text, fontSize: 17, paddingVertical: 11 }} accessibilityLabel={label} />
        {suffix ? <Text style={{ color: c.textSub }}>{suffix}</Text> : null}
      </View>
      {hint ? <Text style={{ color: c.textSub, fontSize: 12, marginTop: 2 }}>{hint}</Text> : null}
    </View>
  );
}

export default function CalculatorsScreen() {
  const c = usePalette();
  const params = useLocalSearchParams<{ price?: string; area?: string; jeonse?: string; tab?: string }>();
  const { policy, fromDb } = usePolicy();
  const [tab, setTab] = useState<'tax' | 'loan' | 'gap'>((params.tab as 'tax' | 'loan' | 'gap') ?? 'tax');

  // 취득세
  const [price, setPrice] = useState(params.price ?? '30000');
  const [area, setArea] = useState(params.area ?? '84.97');
  const [houses, setHouses] = useState(1);
  const [adjusted, setAdjusted] = useState(false);
  const [first, setFirst] = useState(false);
  const tax = useMemo(() => acquisitionTax({ price: num(price), areaM2: num(area), houses, adjustedArea: adjusted, firstHome: first }, policy), [price, area, houses, adjusted, first, policy]);

  // 대출
  const [loan, setLoan] = useState('20000');
  const [rate, setRate] = useState('4.0');
  const [years, setYears] = useState('30');
  const [method, setMethod] = useState<LoanMethod>('equal_payment');
  const [income, setIncome] = useState('6000');
  const [otherDebt, setOtherDebt] = useState('0');
  const sched = useMemo(() => (num(loan) && num(years) ? loanSchedule(num(loan) * 10000, num(rate) / 100, num(years), method) : null), [loan, rate, years, method]);
  const yearly = sched ? sched.rows.slice(0, 12).reduce((a, b) => a + b.payment, 0) : 0;
  const dsrValue = dsr(num(income) * 10000, yearly + num(otherDebt) * 10000);
  const ltv = num(price) ? num(loan) / num(price) : NaN;

  // 전세가율·갭
  const [sale, setSale] = useState(params.price ?? '30000');
  const [jeonse, setJeonse] = useState(params.jeonse ?? '21000');
  const gap = gapAnalysis(num(sale), num(jeonse));

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: '계산기' }} />
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <Chip label="취득세" active={tab === 'tax'} onPress={() => setTab('tax')} />
          <Chip label="대출 이자·DSR" active={tab === 'loan'} onPress={() => setTab('loan')} />
          <Chip label="전세가율·갭" active={tab === 'gap'} onPress={() => setTab('gap')} />
        </View>

        <Card style={{ backgroundColor: c.mockBadge }}>
          <Text style={{ color: c.mockBadgeText, fontWeight: '800' }}>참고용 계산이에요</Text>
          <Text style={{ color: c.mockBadgeText, fontSize: 13, marginTop: 4, lineHeight: 19 }}>
            세율·LTV·DSR 규정은 자주 바뀌어요. 기준 설정 {policy.version}
            {fromDb ? ' (서버 최신값)' : ' (앱 기본값)'} · {policy.verifiedAt ? `법령 확인 ${policy.verifiedAt}` : '최신 법령과 대조 필요'}. 실제 세금·대출 한도는 위택스·금융기관에서 확인하세요.
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md, marginTop: 6 }}>
            {policy.sources.map((s) => (
              <Pressable key={s.url} onPress={() => WebBrowser.openBrowserAsync(s.url)}>
                <Text style={{ color: c.mockBadgeText, textDecorationLine: 'underline', fontSize: 13 }}>{s.label}</Text>
              </Pressable>
            ))}
          </View>
        </Card>

        {tab === 'tax' ? (
          <Card>
            <Input label="취득가액 (만원)" value={price} onChange={setPrice} hint={formatManwon(num(price))} />
            <Input label="전용면적 (㎡)" value={area} onChange={setArea} />
            <Text style={{ color: c.textSub, fontSize: 13, marginTop: space.md }}>취득 후 보유 주택 수</Text>
            <View style={{ flexDirection: 'row', gap: space.sm, marginTop: 4 }}>
              {[1, 2, 3, 4].map((h) => (
                <Chip key={h} label={h === 4 ? '4주택+' : `${h}주택`} active={houses === h} onPress={() => setHouses(h)} />
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.md }}>
              <Chip label="조정대상지역" active={adjusted} onPress={() => setAdjusted((v) => !v)} />
              <Chip label="생애최초" active={first} onPress={() => setFirst((v) => !v)} />
            </View>
            <View style={{ marginTop: space.lg }}>
              <Text style={{ color: c.textSub }}>예상 납부액</Text>
              <Text style={{ color: c.text, fontSize: 30, fontWeight: '900' }}>{wonText(tax.total)}</Text>
              <Row label={`취득세 (${formatPercent(tax.rate, 2)})`} value={wonText(tax.acquisition)} />
              <Row label="지방교육세" value={wonText(tax.education)} />
              <Row label="농어촌특별세" value={wonText(tax.rural)} />
              {tax.relief ? <Row label="생애최초 감면" value={`- ${wonText(tax.relief)}`} /> : null}
              {tax.notes.map((n) => (
                <Text key={n} style={{ color: c.textSub, fontSize: 12, marginTop: 4 }}>
                  · {n}
                </Text>
              ))}
            </View>
          </Card>
        ) : null}

        {tab === 'loan' ? (
          <Card>
            <Input label="대출금 (만원)" value={loan} onChange={setLoan} hint={formatManwon(num(loan))} />
            <Input label="연 이자율 (%)" value={rate} onChange={setRate} />
            <Input label="기간 (년)" value={years} onChange={setYears} />
            <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.md }}>
              <Chip label="원리금균등" active={method === 'equal_payment'} onPress={() => setMethod('equal_payment')} />
              <Chip label="원금균등" active={method === 'equal_principal'} onPress={() => setMethod('equal_principal')} />
              <Chip label="만기일시" active={method === 'bullet'} onPress={() => setMethod('bullet')} />
            </View>
            {sched ? (
              <View style={{ marginTop: space.lg }}>
                <Text style={{ color: c.textSub }}>첫 달 상환액</Text>
                <Text style={{ color: c.text, fontSize: 30, fontWeight: '900' }}>{wonText(sched.firstPayment)}</Text>
                <Row label="총 이자" value={wonText(sched.totalInterest)} strong />
                <Row label="총 상환액" value={wonText(sched.totalPayment)} />
                <Row label="LTV (대출금 ÷ 취득세 탭의 가격)" value={formatPercent(ltv, 0)} tip={<Text style={{ color: c.textSub, fontSize: 11 }}>참고 한도 {formatPercent(policy.loan.ltvGeneral, 0)}·생애최초 {formatPercent(policy.loan.ltvFirstHome, 0)}</Text>} />
              </View>
            ) : null}
            <Input label="연 소득 (만원)" value={income} onChange={setIncome} />
            <Input label="다른 대출의 연간 원리금 (만원)" value={otherDebt} onChange={setOtherDebt} />
            <Row
              label="DSR (첫 1년 기준)"
              value={`${formatPercent(dsrValue, 1)} ${dsrValue > policy.loan.dsrLimitBank ? '· 은행권 기준 초과' : ''}`}
              strong
              tip={<Text style={{ color: c.textSub, fontSize: 11 }}>은행 {formatPercent(policy.loan.dsrLimitBank, 0)}</Text>}
            />
          </Card>
        ) : null}

        {tab === 'gap' ? (
          <Card>
            <Input label="매매가 (만원)" value={sale} onChange={setSale} hint={formatManwon(num(sale))} />
            <Input label="전세가 (만원)" value={jeonse} onChange={setJeonse} hint={formatManwon(num(jeonse))} />
            <View style={{ marginTop: space.lg }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={{ color: c.textSub }}>전세가율</Text>
                <InfoTip term="전세가율" />
              </View>
              <Text style={{ color: gap.ratio >= 0.8 ? c.bad : c.text, fontSize: 30, fontWeight: '900' }}>{formatPercent(gap.ratio, 1)}</Text>
              <Row label="갭 (매매가 − 전세가)" value={formatManwon(gap.gap)} strong />
              {gap.ratio >= 0.8 ? <Text style={{ color: c.bad, fontSize: 13, marginTop: 4 }}>전세가율 80% 이상: 집값이 내리면 보증금 반환 위험이 커요.</Text> : null}
            </View>
          </Card>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
