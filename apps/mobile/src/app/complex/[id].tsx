import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View, type ScrollViewInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState, MockBadge, Skeleton } from '@/components/ui';
import { dataSource } from '@/data';
import { InfoSection } from '@/features/complex/InfoSection';
import { ListingsSection } from '@/features/complex/ListingsSection';
import { LocationSection } from '@/features/location/LocationSection';
import { ParkingSection } from '@/features/complex/ParkingSection';
import { PriceSection } from '@/features/complex/PriceSection';
import { SummarySection } from '@/features/complex/SummarySection';
import { useAppStore } from '@/stores/app-store';
import { radius, space, usePalette } from '@/theme/colors';

const SECTIONS = ['요약', '주차', '시세', '위치', '매물', '정보'] as const;
type Section = (typeof SECTIONS)[number];

export default function ComplexScreen() {
  const c = usePalette();
  const insets = useSafeAreaInsets();
  const { id, savedListing } = useLocalSearchParams<{ id: string; savedListing?: string }>();
  const q = useQuery({ queryKey: ['complex-detail', id], queryFn: () => dataSource.getComplexDetail(id) });
  const { favorites, toggleFavorite, addRecentView, memos, setMemo } = useAppStore();
  const scrollRef = useRef<ScrollViewInstance>(null);
  // 각 블록의 높이를 기록해 위치를 계산 (웹에서는 onLayout 이 위치 변화만으로는 다시 불리지 않아 높이 합산 방식 사용)
  const heights = useRef<Record<string, number>>({});
  const [active, setActive] = useState<Section>('요약');
  const [memoOpen, setMemoOpen] = useState(false);
  const [memoDraft, setMemoDraft] = useState('');

  useEffect(() => {
    if (q.data) addRecentView(q.data.id);
  }, [q.data, addRecentView]);

  if (q.isPending) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, padding: space.lg, gap: space.md }}>
        <Skeleton height={30} width="60%" />
        <Skeleton height={18} width="85%" />
        <View style={{ flexDirection: 'row', gap: space.md }}>
          <Skeleton height={96} width="48%" />
          <Skeleton height={96} width="48%" />
        </View>
        <Skeleton height={130} />
        <Skeleton height={200} />
      </View>
    );
  }
  if (q.isError || !q.data) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, justifyContent: 'center' }}>
        <EmptyState
          title={q.isError ? '단지 정보를 불러오지 못했어요' : '단지 정보를 찾을 수 없어요'}
          message="잠시 후 다시 시도하거나, 목록·지도에서 다시 선택해 주세요."
          action={q.isError ? { label: '다시 시도', onPress: () => q.refetch() } : undefined}
        />
      </View>
    );
  }

  const d = q.data;
  const fav = favorites.includes(d.id);
  const memo = memos[d.id];

  const BLOCKS = ['badge', ...SECTIONS] as const;
  const offsetOf = (s: Section) => {
    let y = space.lg;
    for (const b of BLOCKS) {
      if (b === s) return y;
      y += (heights.current[b] ?? 0) + space.xl;
    }
    return y;
  };
  const jump = (s: Section) => {
    setActive(s);
    scrollRef.current?.scrollTo({ y: Math.max(0, offsetOf(s) - 8), animated: true });
  };
  const mark = (b: (typeof BLOCKS)[number]) => (e: { nativeEvent: { layout: { height: number } } }) => {
    heights.current[b] = e.nativeEvent.layout.height;
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Stack.Screen options={{ title: d.name, headerStyle: { backgroundColor: c.card }, headerTintColor: c.text }} />

      {/* 섹션 바로가기 */}
      <View style={[styles.tabs, { backgroundColor: c.card, borderBottomColor: c.border }]}>
        {SECTIONS.map((s) => (
          <Pressable key={s} onPress={() => jump(s)} style={[styles.tab, active === s && { borderBottomColor: c.primary }]} accessibilityRole="tab" accessibilityState={{ selected: active === s }}>
            <Text style={{ color: active === s ? c.primary : c.textSub, fontWeight: '700', fontSize: 14 }}>{s}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ padding: space.lg, gap: space.xl, paddingBottom: 110 + insets.bottom }}
        scrollEventThrottle={64}
        onScroll={(e) => {
          const y = e.nativeEvent.contentOffset.y + 40;
          let cur: Section = '요약';
          for (const s of SECTIONS) if (offsetOf(s) <= y) cur = s;
          if (cur !== active) setActive(cur);
        }}>
        <View onLayout={mark('badge')} style={{ gap: space.sm }}>
          <MockBadge />
          {savedListing ? (
            <Pressable onPress={() => jump('매물')} style={[styles.memo, { backgroundColor: c.chip, marginTop: 0 }]}>
              <Text style={{ color: c.good, fontWeight: '800' }}>✓ 내 매물함에 저장했어요 · 실거래 비교 보기</Text>
            </Pressable>
          ) : null}
        </View>
        <View onLayout={mark('요약')}>
          <SummarySection d={d} />
          {memo ? (
            <Pressable onPress={() => { setMemoDraft(memo); setMemoOpen(true); }} style={[styles.memo, { backgroundColor: c.mockBadge }]}>
              <Text style={{ color: c.text, fontSize: 14 }}>📝 {memo}</Text>
            </Pressable>
          ) : null}
        </View>
        <View onLayout={mark('주차')}>
          <ParkingSection d={d} />
        </View>
        <View onLayout={mark('시세')}>
          <PriceSection d={d} />
        </View>
        <View onLayout={mark('위치')}>
          <LocationSection d={d} />
        </View>
        <View onLayout={mark('매물')}>
          <ListingsSection d={d} />
        </View>
        <View onLayout={mark('정보')}>
          <InfoSection d={d} />
        </View>
        <Text style={{ color: c.textSub, fontSize: 12, lineHeight: 18 }}>본 정보는 참고용이며 실제 거래 시 공식 서류를 확인하세요.</Text>
      </ScrollView>

      {/* 하단 버튼 (한 손 조작) */}
      <View style={[styles.bottom, { backgroundColor: c.card, borderTopColor: c.border, paddingBottom: insets.bottom + space.sm }]}>
        <Pressable onPress={() => toggleFavorite(d.id)} style={styles.action} accessibilityRole="button" accessibilityState={{ selected: fav }}>
          <Ionicons name={fav ? 'star' : 'star-outline'} size={24} color={fav ? c.warn : c.text} />
          <Text style={{ color: c.text, fontSize: 12, fontWeight: '600' }}>{fav ? '즐겨찾기됨' : '즐겨찾기'}</Text>
        </Pressable>
        <Pressable
          onPress={() =>
            Share.share({
              message: `${d.name} (${d.dongName})\n최근 실거래 ${d.recentPrice ? Math.round(d.recentPrice.value).toLocaleString() + '만원' : '-'} · 세대당 주차 ${d.parkingPerHousehold?.value.toFixed(2) ?? '-'}대\n— 내가 만든 부동산 앱`,
            })
          }
          style={styles.action}
          accessibilityRole="button">
          <Ionicons name="share-outline" size={24} color={c.text} />
          <Text style={{ color: c.text, fontSize: 12, fontWeight: '600' }}>공유</Text>
        </Pressable>
        <Pressable onPress={() => { setMemoDraft(memo ?? ''); setMemoOpen(true); }} style={styles.action} accessibilityRole="button">
          <Ionicons name={memo ? 'document-text' : 'document-text-outline'} size={24} color={c.text} />
          <Text style={{ color: c.text, fontSize: 12, fontWeight: '600' }}>메모</Text>
        </Pressable>
      </View>

      <Modal visible={memoOpen} transparent animationType="slide" onRequestClose={() => setMemoOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' }} onPress={() => setMemoOpen(false)} />
        <View style={[styles.sheet, { backgroundColor: c.card, paddingBottom: insets.bottom + space.lg }]}>
          <Text style={{ color: c.text, fontSize: 18, fontWeight: '800' }}>{d.name} 메모</Text>
          <Text style={{ color: c.textSub, fontSize: 12, marginTop: 2 }}>이 폰에만 저장돼요.</Text>
          <TextInput
            value={memoDraft}
            onChangeText={setMemoDraft}
            multiline
            autoFocus
            placeholder="예) 103동 남향, 주말 임장 예정"
            placeholderTextColor={c.textSub}
            style={[styles.input, { color: c.text, borderColor: c.border }]}
          />
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <Pressable onPress={() => { setMemo(d.id, ''); setMemoOpen(false); }} style={[styles.btn, { backgroundColor: c.chip }]}>
              <Text style={{ color: c.text, fontWeight: '700' }}>지우기</Text>
            </Pressable>
            <Pressable onPress={() => { setMemo(d.id, memoDraft); setMemoOpen(false); }} style={[styles.btn, { backgroundColor: c.primary, flex: 2 }]}>
              <Text style={{ color: c.primaryText, fontWeight: '700' }}>저장</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 3, borderBottomColor: 'transparent' },
  memo: { marginTop: space.md, padding: space.md, borderRadius: radius.md },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: space.sm },
  action: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: 4 },
  sheet: { padding: space.lg, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, gap: space.md },
  input: { minHeight: 110, borderWidth: 1, borderRadius: radius.md, padding: space.md, fontSize: 16, textAlignVertical: 'top' },
  btn: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: radius.md },
});
