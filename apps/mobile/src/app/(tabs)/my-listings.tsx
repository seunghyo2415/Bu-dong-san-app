import { Ionicons } from '@expo/vector-icons';
import { formatArea } from '@ulsan/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, FlatList, Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Card, EmptyState } from '@/components/ui';
import { DEAL_LABEL, listingPriceText } from '@/features/listings/format';
import { useListings } from '@/stores/listings';
import { radius, space, usePalette } from '@/theme/colors';

export default function MyListingsScreen() {
  const c = usePalette();
  const { listings, remove } = useListings();
  const [paste, setPaste] = useState('');

  return (
    <FlatList
      style={{ backgroundColor: c.bg }}
      contentContainerStyle={{ padding: space.lg, gap: space.md, paddingBottom: 40 }}
      data={listings}
      keyExtractor={(l) => l.id}
      ListHeaderComponent={
        <Card style={{ marginBottom: space.sm }}>
          <Text style={{ color: c.text, fontSize: 16, fontWeight: '800' }}>당근마켓 매물 분석하기</Text>
          <Text style={{ color: c.textSub, fontSize: 13, marginTop: 4, lineHeight: 19 }}>
            당근마켓 매물 → 공유 → 「내가 만든 부동산 앱」을 고르면 자동으로 열려요. 또는 공유 문구·링크를 아래에 붙여넣으세요.
          </Text>
          <View style={[styles.paste, { borderColor: c.border }]}>
            <TextInput
              value={paste}
              onChangeText={setPaste}
              placeholder="여기에 붙여넣기"
              placeholderTextColor={c.textSub}
              multiline
              style={{ flex: 1, color: c.text, fontSize: 15, minHeight: 44, textAlignVertical: 'top' }}
              accessibilityLabel="공유 문구 붙여넣기"
            />
            <Pressable
              disabled={!paste.trim()}
              onPress={() => {
                router.push({ pathname: '/share/receive', params: { text: paste.trim() } });
                setPaste('');
              }}
              style={[styles.go, { backgroundColor: paste.trim() ? c.primary : c.chip }]}
              accessibilityRole="button">
              <Text style={{ color: paste.trim() ? c.primaryText : c.textSub, fontWeight: '800' }}>분석</Text>
            </Pressable>
          </View>
        </Card>
      }
      ListEmptyComponent={<EmptyState title="저장한 매물이 없어요" message="공유받은 매물을 저장하면 여기에 모여요. 메모·임장 체크리스트도 남길 수 있어요." />}
      renderItem={({ item: l }) => (
        <Pressable
          onPress={() => router.push(`/listing/${l.id}`)}
          style={({ pressed }) => [styles.item, { backgroundColor: c.card, borderColor: c.border, opacity: pressed ? 0.75 : 1 }]}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: c.text, fontSize: 16, fontWeight: '800' }} numberOfLines={1}>
              {l.complexName ?? l.title ?? '이름 없는 매물'}
            </Text>
            <Text style={{ color: c.text, fontSize: 17, fontWeight: '800', marginTop: 2 }}>
              {l.dealType ? `${DEAL_LABEL[l.dealType]} ` : ''}
              {listingPriceText(l)}
            </Text>
            <Text style={{ color: c.textSub, fontSize: 13, marginTop: 2 }}>
              {[l.areaM2 && formatArea(l.areaM2), l.floor && `${l.floor}층`, new Date(l.createdAt).toLocaleDateString('ko-KR')].filter(Boolean).join(' · ')}
            </Text>
            {l.memo ? (
              <Text style={{ color: c.textSub, fontSize: 13, marginTop: 4 }} numberOfLines={2}>
                📝 {l.memo}
              </Text>
            ) : null}
          </View>
          <View style={{ gap: space.md, alignItems: 'center' }}>
            {l.url ? (
              <Pressable onPress={() => Linking.openURL(l.url!)} hitSlop={8} accessibilityLabel="원본 링크 열기">
                <Ionicons name="open-outline" size={20} color={c.primary} />
              </Pressable>
            ) : null}
            <Pressable
              onPress={() =>
                Alert.alert('매물 삭제', '이 매물을 매물함에서 지울까요?', [
                  { text: '취소', style: 'cancel' },
                  { text: '삭제', style: 'destructive', onPress: () => remove(l.id) },
                ])
              }
              hitSlop={8}
              accessibilityLabel="삭제">
              <Ionicons name="trash-outline" size={20} color={c.textSub} />
            </Pressable>
          </View>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  paste: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm, borderWidth: 1, borderRadius: radius.md, padding: space.sm, marginTop: space.md },
  go: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: radius.md },
  item: { flexDirection: 'row', gap: space.md, padding: space.lg, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth },
});
