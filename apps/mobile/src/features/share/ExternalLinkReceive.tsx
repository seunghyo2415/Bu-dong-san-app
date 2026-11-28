import { Ionicons } from '@expo/vector-icons';
import { EXTERNAL_APPS, nameFromSharedText, type ExternalApp } from '@ulsan/shared';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { Card } from '@/components/ui';
import { dataSource } from '@/data';
import { useAppStore } from '@/stores/app-store';
import { radius, space, usePalette } from '@/theme/colors';

/** 네이버페이 부동산·호갱노노에서 공유한 단지 링크 → 어느 단지에 연결할지 고르기 */
export function ExternalLinkReceive({ app, url, text }: { app: ExternalApp; url: string; text: string }) {
  const c = usePalette();
  const setLink = useAppStore((s) => s.setExternalLink);
  const recentId = useAppStore((s) => s.recentViews[0]);
  const name = nameFromSharedText(text);
  const recent = useQuery({ queryKey: ['complex', recentId], queryFn: () => dataSource.getComplexSummary(recentId!), enabled: !!recentId });
  const cands = useQuery({ queryKey: ['link-cands', name], queryFn: () => dataSource.findCandidates({ name, address: null, dong: null }), enabled: name.length >= 2 });

  const choose = (id: string) => {
    setLink(id, app, url);
    router.replace(`/complex/${id}?linked=${app}`);
  };
  const list = [
    ...(recent.data ? [{ id: recent.data.id, name: recent.data.name, subtitle: `방금 본 단지 · ${recent.data.dongName}` }] : []),
    ...(cands.data ?? []).filter((x) => x.id !== recent.data?.id).map((x) => ({ id: x.id, name: x.name, subtitle: x.subtitle })),
  ];

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={{ padding: space.lg, gap: space.lg }}>
      <Card>
        <Text style={{ color: c.text, fontSize: 18, fontWeight: '800' }}>{EXTERNAL_APPS[app].label} 링크를 받았어요</Text>
        <Text style={{ color: c.textSub, fontSize: 14, marginTop: 6, lineHeight: 21 }}>
          어느 단지에 연결할까요? 연결하면 그 단지 화면의 「{EXTERNAL_APPS[app].label}」 버튼이 이 페이지를 바로 열어요.
        </Text>
        {name ? <Text style={{ color: c.textSub, fontSize: 12, marginTop: 6 }}>공유된 글: {name}</Text> : null}
      </Card>
      {(recent.isFetching || cands.isFetching) && !list.length ? <ActivityIndicator color={c.primary} /> : null}
      {list.map((x, i) => (
        <Pressable key={x.id} onPress={() => choose(x.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radius.lg, backgroundColor: c.card, borderWidth: 1, borderColor: i === 0 ? c.primary : c.border }}>
          <Ionicons name="link" size={20} color={c.primary} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: c.text, fontSize: 16, fontWeight: '800' }}>{x.name}</Text>
            <Text style={{ color: c.textSub, fontSize: 13 }}>{x.subtitle}</Text>
          </View>
        </Pressable>
      ))}
      {!list.length && !recent.isFetching && !cands.isFetching ? (
        <Text style={{ color: c.textSub }}>연결할 단지를 찾지 못했어요. 우리 앱에서 그 단지를 먼저 연 뒤 다시 공유해 주세요.</Text>
      ) : null}
    </ScrollView>
  );
}
