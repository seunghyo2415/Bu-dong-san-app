import { Ionicons } from '@expo/vector-icons';
import {
  detectExternalLink,
  compareToRecentTrades,
  formatArea,
  formatManwon,
  mergeParsed,
  parseSharedText,
  type ParsedShare,
} from '@ulsan/shared';
import { useQuery } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, Chip, MockBadge } from '@/components/ui';
import { dataSource, type ComplexCandidate } from '@/data';
import { MOCK_AS_OF } from '@/data/mock/complexes';
import { ExternalLinkReceive } from '@/features/share/ExternalLinkReceive';
import { usePlaces, type Place } from '@/features/places/KakaoServices';
import { naverSearch } from '@/features/places/naver';
import { fetchLinkPreview } from '@/features/share/link-preview';
import { sourceOf, useListings } from '@/stores/listings';
import { radius, space, usePalette } from '@/theme/colors';

type Step = 'reading' | 'finding' | 'choose' | 'save';
const DEAL_LABEL = { sale: '매매', jeonse: '전세', monthly: '월세' } as const;

export default function ShareReceiveScreen() {
  const params = useLocalSearchParams<{ text?: string }>();
  const shared = (params.text ?? '').toString();
  // 네이버페이 부동산·호갱노노 단지 링크면 '단지에 연결' 화면
  const external = detectExternalLink(shared);
  if (external) {
    return (
      <>
        <Stack.Screen options={{ title: '단지 링크 연결' }} />
        <ExternalLinkReceive app={external.app} url={external.url} text={shared} />
      </>
    );
  }
  return <ListingReceive shared={shared} />;
}

function ListingReceive({ shared }: { shared: string }) {
  const c = usePalette();
  const insets = useSafeAreaInsets();
  const addListing = useListings((s) => s.add);

  const [step, setStep] = useState<Step>('reading');
  const [parsed, setParsed] = useState<ParsedShare>(() => parseSharedText(shared));
  const [usedPreview, setUsedPreview] = useState(false);
  const [previewTitle, setPreviewTitle] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<ComplexCandidate[]>([]);
  const [chosen, setChosen] = useState<ComplexCandidate | null>(null);
  const places = usePlaces();
  const [kakaoPlaces, setKakaoPlaces] = useState<Place[]>([]);

  /** 카카오 지도에서 찾기: 주소면 주소 검색, 아니면 장소(아파트) 검색. 결과 좌표 근처 단지를 후보로 */
  const lookup = async (opts: { name?: string | null; address?: string | null; dong?: string | null }) => {
    let near: { lat: number; lng: number } | null = null;
    let found: Place[] = [];
    if (places.available) {
      try {
        if (opts.address) {
          const r = await places.search({ kind: 'address', query: opts.address });
          if (r.places[0]) near = { lat: r.places[0].lat, lng: r.places[0].lng };
        }
        const q = opts.name ?? (opts.address ? null : opts.dong);
        if (q) {
          const r = await places.search({ kind: 'keyword', query: /울산/.test(q) ? q : `울산 ${q}` }, { size: 8 });
          // 아파트·주거 시설만 (가게 등 제외)
          found = r.places.filter((x) => /아파트|주거|오피스텔|빌라|주택/.test(x.category));
          if (!found.length) found = (await naverSearch(/울산/.test(q) ? q : `울산 ${q}`)).filter((x) => /아파트|주거|오피스텔|빌라|주택/.test(x.category));
          if (!near && found[0] && opts.name) near = { lat: found[0].lat, lng: found[0].lng };
        }
      } catch {
        /* 카카오 검색 실패해도 우리 데이터로 계속 */
      }
    }
    setKakaoPlaces(found.slice(0, 5));
    return dataSource.findCandidates({ name: opts.name ?? null, address: opts.address ?? null, dong: opts.dong ?? null, near });
  };
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);

  // 저장 폼 (자동으로 채우고 사용자가 고칠 수 있음)
  const [dealType, setDealType] = useState<'sale' | 'jeonse' | 'monthly'>('sale');
  const [priceText, setPriceText] = useState('');
  const [rentText, setRentText] = useState('');
  const [areaText, setAreaText] = useState('');
  const [floorText, setFloorText] = useState('');
  const [memo, setMemo] = useState('');

  // ① 공유 글 해석 → ② 필요하면 링크 미리보기 → ③ 후보 찾기
  useEffect(() => {
    let alive = true;
    (async () => {
      let p = parseSharedText(shared);
      if (p.url && (!p.complexName || !p.address || p.price == null)) {
        const og = await fetchLinkPreview(p.url);
        if (og && (og.title || og.description || og.address || og.complexName)) {
          p = mergeParsed(p, parseSharedText(`${og.title ?? ''}\n${og.description ?? ''}`));
          // 페이지 본문에 적힌 주소·단지명
          p = { ...p, address: p.address ?? og.address, complexName: p.complexName ?? og.complexName };
          if (alive) {
            setUsedPreview(true);
            setPreviewTitle(og.title);
          }
        }
      }
      if (!alive) return;
      setParsed(p);
      if (p.dealType) setDealType(p.dealType);
      if (p.price != null) setPriceText(String(p.price));
      if (p.monthlyRent != null) setRentText(String(p.monthlyRent));
      if (p.areaM2 != null) setAreaText(String(p.areaM2));
      if (p.floor != null) setFloorText(String(p.floor));
      setQuery(p.complexName ?? p.dongName ?? '');
      setStep('finding');
      try {
        const list = p.complexName || p.address || p.dongName ? await lookup({ name: p.complexName, address: p.address, dong: p.dongName }) : [];
        if (alive) setCandidates(list);
      } catch {
        if (alive) setCandidates([]);
      }
      if (alive) setStep('choose');
    })();
    return () => {
      alive = false;
    };
  }, [shared]);

  const searchAgain = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      setCandidates(await lookup({ name: query.trim() }));
    } finally {
      setSearching(false);
    }
  };

  const isKakaoOnly = !!chosen?.id.startsWith('kakao:');
  const trades = useQuery({ queryKey: ['trades', chosen?.id], queryFn: () => dataSource.getTrades(chosen!.id), enabled: !!chosen && !isKakaoOnly });
  const price = Number(priceText.replace(/[^\d]/g, '')) || null;
  const area = Number(areaText) || null;
  const today = dataSource.mode === 'mock' ? MOCK_AS_OF : new Date().toISOString().slice(0, 10);
  const comparison = useMemo(
    () => (chosen && price && trades.data ? compareToRecentTrades({ price, dealType, areaM2: area }, trades.data, today) : null),
    [chosen, price, dealType, area, trades.data, today],
  );

  const save = () => {
    const item = addListing({
      complexId: chosen && !isKakaoOnly ? chosen.id : null,
      complexName: chosen?.name ?? parsed.complexName,
      source: sourceOf(parsed.url),
      url: parsed.url,
      title: previewTitle ?? (shared.split('\n')[0]?.slice(0, 80) || null),
      dealType,
      price,
      monthlyRent: dealType === 'monthly' ? Number(rentText) || null : null,
      areaM2: area,
      floor: Number(floorText) || null,
      memo,
      parseStatus: usedPreview ? 'preview' : 'text',
    });
    if (chosen && !isKakaoOnly) router.replace(`/complex/${chosen.id}?savedListing=${item.id}`);
    else router.replace('/my-listings');
  };

  const found = [parsed.complexName && `단지명 "${parsed.complexName}"`, parsed.address && `주소 "${parsed.address}"`, parsed.price != null && `가격 ${formatManwon(parsed.price)}`, parsed.areaM2 && `면적 ${formatArea(parsed.areaM2)}`, parsed.floor && `${parsed.floor}층`].filter(Boolean) as string[];

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: '공유받은 매물 분석' }} />
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: 120 + insets.bottom }} keyboardShouldPersistTaps="handled">
        <MockBadge />

        <Card>
          <Text style={{ color: c.textSub, fontSize: 13 }}>공유받은 내용</Text>
          <Text style={{ color: c.text, fontSize: 15, marginTop: 4, lineHeight: 22 }} numberOfLines={5} selectable>
            {shared || '(내용 없음)'}
          </Text>
          {step === 'reading' ? (
            <View style={styles.row}>
              <ActivityIndicator color={c.primary} />
              <Text style={{ color: c.textSub }}>내용을 읽고 있어요…</Text>
            </View>
          ) : (
            <Text style={{ color: found.length ? c.good : c.warn, marginTop: space.sm, fontSize: 14, lineHeight: 20 }}>
              {found.length ? `찾은 정보: ${found.join(', ')}` : '글에서 주소나 단지명을 찾지 못했어요. 아래에서 직접 골라 주세요.'}
              {usedPreview ? '\n(링크 미리보기에서 보충)' : ''}
            </Text>
          )}
        </Card>

        {step === 'finding' ? (
          <View style={styles.row}>
            <ActivityIndicator color={c.primary} />
            <Text style={{ color: c.textSub }}>단지를 찾고 있어요…</Text>
          </View>
        ) : null}

        {step === 'choose' || step === 'save' ? (
          <Card>
            <Text style={{ color: c.text, fontSize: 18, fontWeight: '800' }}>어느 건물인가요?</Text>
            <View style={[styles.search, { borderColor: c.border }]}>
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="단지명·주소로 찾기 (예: 협성 휴포레)"
                placeholderTextColor={c.textSub}
                style={{ flex: 1, color: c.text, fontSize: 16, paddingVertical: 10 }}
                returnKeyType="search"
                onSubmitEditing={searchAgain}
              />
              <Pressable onPress={searchAgain} hitSlop={8} accessibilityLabel="검색">
                {searching ? <ActivityIndicator color={c.primary} /> : <Ionicons name="search" size={20} color={c.primary} />}
              </Pressable>
            </View>
            {kakaoPlaces.length ? (
              <View style={{ marginBottom: space.sm }}>
                <Text style={{ color: c.textSub, fontSize: 13, marginTop: space.sm }}>지도에서 찾은 곳</Text>
                {kakaoPlaces.map((p) => {
                  const id = `kakao:${p.id}`;
                  const on = chosen?.id === id;
                  return (
                    <Pressable
                      key={id}
                      onPress={() => {
                        // 우리 데이터에 그 위치(200m 안) 단지가 있으면 그 단지로
                        const near = candidates.find((cd) => cd.location && Math.hypot((cd.location.lat - p.lat) * 111000, (cd.location.lng - p.lng) * 90000) < 200);
                        setChosen(near ?? { id, name: p.name, subtitle: p.address, location: { lat: p.lat, lng: p.lng }, distanceM: null, score: 0 });
                        setStep('save');
                      }}
                      style={[styles.cand, { borderColor: on ? c.primary : c.border, backgroundColor: on ? c.chip : 'transparent' }]}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: on }}>
                      <Ionicons name="location" size={20} color={c.primary} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: c.text, fontSize: 16, fontWeight: '700' }}>{p.name}</Text>
                        <Text style={{ color: c.textSub, fontSize: 13 }}>{p.address}</Text>
                      </View>
                    </Pressable>
                  );
                })}
                <Text style={{ color: c.textSub, fontSize: 13, marginTop: space.md }}>앱의 단지 목록</Text>
              </View>
            ) : null}
            {candidates.length === 0 ? (
              <Text style={{ color: c.textSub, marginTop: space.sm }}>후보가 없어요. 단지명이나 주소를 바꿔 검색해 보세요.</Text>
            ) : (
              candidates.map((cd, i) => {
                const on = chosen?.id === cd.id;
                return (
                  <Pressable
                    key={cd.id}
                    onPress={() => {
                      setChosen(cd);
                      setStep('save');
                    }}
                    style={[styles.cand, { borderColor: on ? c.primary : c.border, backgroundColor: on ? c.chip : 'transparent' }]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}>
                    <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={22} color={on ? c.primary : c.textSub} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: c.text, fontSize: 16, fontWeight: '700' }}>
                        {cd.name} {i === 0 && !chosen ? <Text style={{ color: c.good, fontSize: 13 }}>가장 비슷해요</Text> : null}
                      </Text>
                      <Text style={{ color: c.textSub, fontSize: 13 }}>{cd.subtitle}</Text>
                    </View>
                  </Pressable>
                );
              })
            )}
          </Card>
        ) : null}

        {step === 'save' || (step === 'choose' && candidates.length === 0) ? (
          <Card>
            <Text style={{ color: c.text, fontSize: 18, fontWeight: '800' }}>내 매물함에 저장</Text>
            <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.md }}>
              {(['sale', 'jeonse', 'monthly'] as const).map((k) => (
                <Chip key={k} label={DEAL_LABEL[k]} active={dealType === k} onPress={() => setDealType(k)} />
              ))}
            </View>
            <Field label={dealType === 'sale' ? '매매가 (만원)' : '보증금 (만원)'} value={priceText} onChange={setPriceText} hint={price ? formatManwon(price) : '예) 32000 = 3억 2,000만'} />
            {dealType === 'monthly' ? <Field label="월세 (만원)" value={rentText} onChange={setRentText} /> : null}
            <Field label="전용면적 (㎡)" value={areaText} onChange={setAreaText} hint={area ? formatArea(area) + (parsed.areaFromPyeong ? ' · 평에서 환산(공급면적일 수 있음)' : '') : undefined} />
            <Field label="층" value={floorText} onChange={setFloorText} />
            <Field label="메모" value={memo} onChange={setMemo} multiline keyboard="default" />

            {chosen && price ? (
              <View style={[styles.compare, { backgroundColor: c.chip }]}>
                {trades.isPending ? (
                  <ActivityIndicator color={c.primary} />
                ) : comparison ? (
                  <>
                    <Text style={{ color: comparison.ratio > 0 ? c.bad : c.good, fontSize: 18, fontWeight: '900' }}>
                      최근 실거래 대비 {comparison.ratio > 0 ? '+' : ''}
                      {(comparison.ratio * 100).toFixed(1)}% {comparison.ratio > 0 ? '비쌈' : '저렴'}
                    </Text>
                    <Text style={{ color: c.textSub, fontSize: 13, marginTop: 2 }}>
                      기준: 최근 {comparison.months}개월 {DEAL_LABEL[dealType]} {comparison.count}건 중간값 {formatManwon(comparison.basis)}
                      {area ? ` · 전용 ${area}㎡ ±3㎡` : ''}
                    </Text>
                  </>
                ) : (
                  <Text style={{ color: c.textSub }}>비교할 최근 실거래가 없어요{dealType === 'monthly' ? ' (월세는 비교하지 않아요)' : ''}.</Text>
                )}
              </View>
            ) : null}
          </Card>
        ) : null}

        <Text style={{ color: c.textSub, fontSize: 12, lineHeight: 18 }}>
          공유받은 글과 그 링크의 공개 미리보기만 사용해요. 다른 매물을 모으지 않아요. 본 정보는 참고용이에요.
        </Text>
      </ScrollView>

      {step === 'save' || (step === 'choose' && candidates.length === 0) ? (
        <View style={[styles.bottom, { backgroundColor: c.card, borderTopColor: c.border, paddingBottom: insets.bottom + space.sm }]}>
          <Pressable onPress={save} style={[styles.btn, { backgroundColor: c.primary }]} accessibilityRole="button">
            <Text style={{ color: c.primaryText, fontWeight: '800', fontSize: 16 }}>
              {chosen && !isKakaoOnly ? `${chosen.name}에 저장하고 상세 보기` : chosen ? `${chosen.name}(으)로 매물함에 저장` : '단지 없이 매물함에 저장'}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

function Field({ label, value, onChange, hint, multiline, keyboard = 'numeric' }: { label: string; value: string; onChange: (v: string) => void; hint?: string; multiline?: boolean; keyboard?: 'numeric' | 'default' }) {
  const c = usePalette();
  return (
    <View style={{ marginTop: space.md }}>
      <Text style={{ color: c.textSub, fontSize: 13, marginBottom: 4 }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType={keyboard}
        multiline={multiline}
        style={{ color: c.text, fontSize: 16, borderWidth: 1, borderColor: c.border, borderRadius: radius.md, padding: space.md, minHeight: multiline ? 70 : undefined, textAlignVertical: multiline ? 'top' : 'center' }}
        accessibilityLabel={label}
      />
      {hint ? <Text style={{ color: c.textSub, fontSize: 12, marginTop: 2 }}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.sm },
  search: { flexDirection: 'row', alignItems: 'center', gap: space.sm, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: space.md, marginTop: space.md, marginBottom: space.sm },
  cand: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderWidth: 1, borderRadius: radius.md, marginTop: space.sm },
  compare: { marginTop: space.lg, padding: space.md, borderRadius: radius.md },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: space.md, borderTopWidth: StyleSheet.hairlineWidth },
  btn: { alignItems: 'center', paddingVertical: 15, borderRadius: radius.md },
});
