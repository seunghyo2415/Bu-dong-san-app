import { formatArea } from '@ulsan/shared';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { Card, EmptyState, Row } from '@/components/ui';
import { DEAL_LABEL, listingPriceText } from '@/features/listings/format';
import { useListings } from '@/stores/listings';
import { radius, space, usePalette } from '@/theme/colors';

export default function ListingScreen() {
  const c = usePalette();
  const { id } = useLocalSearchParams<{ id: string }>();
  const listing = useListings((s) => s.listings.find((l) => l.id === id));
  const update = useListings((s) => s.update);
  const [memo, setMemo] = useState(listing?.memo ?? '');

  useEffect(() => {
    if (listing) setMemo(listing.memo);
  }, [listing?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!listing) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, justifyContent: 'center' }}>
        <EmptyState title="매물을 찾을 수 없어요" message="삭제되었을 수 있어요." />
      </View>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={{ padding: space.lg, gap: space.lg }} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: listing.complexName ?? '저장한 매물' }} />
      <Card>
        <Text style={{ color: c.textSub }}>{listing.dealType ? DEAL_LABEL[listing.dealType] : '거래유형 미입력'}</Text>
        <Text style={{ color: c.text, fontSize: 28, fontWeight: '900' }}>{listingPriceText(listing)}</Text>
        <Row label="전용면적" value={listing.areaM2 ? formatArea(listing.areaM2) : '-'} />
        <Row label="층" value={listing.floor ? `${listing.floor}층` : '-'} />
        <Row label="저장일" value={new Date(listing.createdAt).toLocaleString('ko-KR')} />
        <Row label="정보 출처" value={listing.parseStatus === 'preview' ? '공유 글 + 링크 미리보기' : listing.parseStatus === 'text' ? '공유 글' : '직접 입력'} />
        {listing.title ? <Text style={{ color: c.textSub, fontSize: 13, marginTop: space.sm }}>{listing.title}</Text> : null}
      </Card>

      <View style={{ flexDirection: 'row', gap: space.sm }}>
        {listing.complexId ? (
          <Pressable onPress={() => router.push(`/complex/${listing.complexId}`)} style={{ flex: 1, padding: 14, borderRadius: radius.md, backgroundColor: c.primary, alignItems: 'center' }}>
            <Text style={{ color: c.primaryText, fontWeight: '800' }}>단지 정보 보기</Text>
          </Pressable>
        ) : null}
        {listing.url ? (
          <Pressable onPress={() => Linking.openURL(listing.url!)} style={{ flex: 1, padding: 14, borderRadius: radius.md, backgroundColor: c.chip, alignItems: 'center' }}>
            <Text style={{ color: c.text, fontWeight: '800' }}>원본 글 열기</Text>
          </Pressable>
        ) : null}
      </View>

      <Card>
        <Text style={{ color: c.text, fontSize: 16, fontWeight: '800' }}>메모</Text>
        <TextInput
          value={memo}
          onChangeText={setMemo}
          onBlur={() => update(listing.id, { memo })}
          multiline
          placeholder="예) 남향, 주차장 입구 가까움, 집주인 협의 가능"
          placeholderTextColor={c.textSub}
          style={{ color: c.text, fontSize: 16, minHeight: 90, borderWidth: 1, borderColor: c.border, borderRadius: radius.md, padding: space.md, marginTop: space.sm, textAlignVertical: 'top' }}
        />
        <Text style={{ color: c.textSub, fontSize: 12, marginTop: 4 }}>입력칸을 벗어나면 자동 저장돼요. (이 폰에만)</Text>
      </Card>
    </ScrollView>
  );
}
