import { Ionicons } from '@expo/vector-icons';
import { compareToRecentTrades, formatArea } from '@ulsan/shared';
import { useQuery } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';

import { Card, SectionTitle } from '@/components/ui';
import { dataSource, type ComplexDetail } from '@/data';
import { MOCK_AS_OF } from '@/data/mock/complexes';
import { listingPriceText } from '@/features/listings/format';
import { useListings } from '@/stores/listings';
import { radius, space, usePalette } from '@/theme/colors';

/**
 * 외부 매물은 크롤링·복사하지 않고 "링크로만" 연결 (이용약관 준수).
 * 단지명을 복사한 뒤 각 서비스 웹사이트를 열어 바로 붙여넣어 검색할 수 있게 한다.
 */
const EXTERNAL: { name: string; url: (q: string) => string }[] = [
  { name: '네이버 부동산', url: (q) => `https://m.land.naver.com/search/result/${encodeURIComponent(q)}` },
  { name: '호갱노노', url: () => 'https://hogangnono.com' },
  { name: '직방', url: () => 'https://www.zigbang.com' },
  { name: '다방', url: () => 'https://www.dabangapp.com' },
  { name: '당근 부동산', url: () => 'https://www.daangn.com/kr/realty/' },
];

export function ListingsSection({ d }: { d: ComplexDetail }) {
  const c = usePalette();
  // 선택자에서 filter 하면 매번 새 배열 → 무한 렌더링. 전체 목록을 고르고 여기서 거른다
  const all = useListings((s) => s.listings);
  const listings = useMemo(() => all.filter((l) => l.complexId === d.id), [all, d.id]);
  const trades = useQuery({ queryKey: ['trades', d.id], queryFn: () => dataSource.getTrades(d.id), enabled: listings.length > 0 });
  const today = dataSource.mode === 'mock' ? MOCK_AS_OF : new Date().toISOString().slice(0, 10);
  const query = `울산 ${d.name}`;

  return (
    <View style={{ gap: space.md }}>
      <SectionTitle title="매물" />
      <Card>
        <Text style={{ color: c.text, fontSize: 16, fontWeight: '800' }}>내가 저장한 매물 ({listings.length})</Text>
        {listings.length === 0 ? (
          <Text style={{ color: c.textSub, marginTop: space.sm, lineHeight: 20 }}>당근마켓에서 이 단지 매물을 공유하면 여기에 모여요.</Text>
        ) : (
          listings.map((l) => {
            const cmp = l.price && l.dealType && trades.data ? compareToRecentTrades({ price: l.price, dealType: l.dealType, areaM2: l.areaM2 }, trades.data, today) : null;
            return (
              <Pressable key={l.id} onPress={() => router.push(`/listing/${l.id}`)} style={{ borderTopWidth: 1, borderTopColor: c.border, paddingVertical: 12, marginTop: space.sm }}>
                <Text style={{ color: c.text, fontSize: 16, fontWeight: '800' }}>{listingPriceText(l)}</Text>
                <Text style={{ color: c.textSub, fontSize: 13 }}>
                  {[l.areaM2 && formatArea(l.areaM2), l.floor && `${l.floor}층`, new Date(l.createdAt).toLocaleDateString('ko-KR')].filter(Boolean).join(' · ')}
                </Text>
                {cmp ? (
                  <Text style={{ color: cmp.ratio > 0 ? c.bad : c.good, fontWeight: '800', marginTop: 2 }}>
                    최근 실거래 대비 {cmp.ratio > 0 ? '+' : ''}
                    {(cmp.ratio * 100).toFixed(1)}% {cmp.ratio > 0 ? '비쌈' : '저렴'}
                  </Text>
                ) : null}
              </Pressable>
            );
          })
        )}
      </Card>
      <Card>
        <Text style={{ color: c.text, fontSize: 16, fontWeight: '800' }}>다른 곳 매물 보기</Text>
        <Text style={{ color: c.textSub, fontSize: 13, marginTop: 4, lineHeight: 19 }}>
          누르면 단지명이 복사되고 해당 사이트가 열려요. 검색창에 붙여넣으세요. (다른 서비스의 매물을 앱에 가져오지 않아요)
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.md }}>
          {EXTERNAL.map((e) => (
            <Pressable
              key={e.name}
              onPress={async () => {
                await Clipboard.setStringAsync(d.name);
                Linking.openURL(e.url(query));
              }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 9, borderRadius: radius.pill, backgroundColor: c.chip }}
              accessibilityRole="link">
              <Text style={{ color: c.text, fontWeight: '700' }}>{e.name}</Text>
              <Ionicons name="open-outline" size={14} color={c.textSub} />
            </Pressable>
          ))}
        </View>
      </Card>
    </View>
  );
}
