import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Card, Chip } from '@/components/ui';
import { dataSource } from '@/data';
import { usePlaces } from '@/features/places/KakaoServices';
import { useAppStore } from '@/stores/app-store';
import { useCommute } from '@/stores/commute';
import { space, usePalette } from '@/theme/colors';

type IconName = ComponentProps<typeof Ionicons>['name'];

function Item({ icon, title, sub, href }: { icon: IconName; title: string; sub?: string; href: Href }) {
  const c = usePalette();
  return (
    <Pressable onPress={() => router.push(href)} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 14 }} accessibilityRole="button">
      <Ionicons name={icon} size={22} color={c.primary} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: c.text, fontSize: 16, fontWeight: '700' }}>{title}</Text>
        {sub ? <Text style={{ color: c.textSub, fontSize: 13, marginTop: 2 }}>{sub}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={c.textSub} />
    </Pressable>
  );
}

export default function SettingsScreen() {
  const c = usePalette();
  const workplaces = useAppStore((s) => s.workplaces);
  const priceLabel = useAppStore((s) => s.priceLabel);
  const cycle = useAppStore((s) => s.cyclePriceLabel);
  const routes = useCommute((s) => s.routes.length);
  const places = usePlaces();

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={{ padding: space.lg, gap: space.lg }}>
      <Card>
        <Item icon="briefcase-outline" title="내 직장" sub={workplaces.length ? workplaces.map((w) => w.name).join(', ') : '등록하면 단지마다 거리·길찾기 표시'} href="/workplaces" />
        <Item icon="bus-outline" title="통근버스 노선" sub={routes ? `노선 ${routes}개 불러옴` : '회사 노선표 파일을 불러와 지도에 표시'} href="/commute" />
        <Item icon="calculator-outline" title="계산기" sub="취득세 · 대출 이자 · 전세가율/갭" href="/calculators" />
      </Card>

      <Card>
        <Text style={{ color: c.text, fontSize: 16, fontWeight: '800' }}>지도 표시</Text>
        <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.sm }}>
          {(['price', 'pyeong', 'none'] as const).map((k) => (
            <Chip key={k} label={{ price: '가격', pyeong: '평당가', none: '이름만' }[k]} active={priceLabel === k} onPress={() => priceLabel !== k && cycle()} />
          ))}
        </View>
      </Card>

      <Card>
        <Item icon="document-text-outline" title="데이터 출처 안내" href="/about" sub="공공데이터 출처·기준일, 이용 조건" />
        <Item icon="shield-checkmark-outline" title="개인정보처리방침" href="/about?tab=privacy" />
        <Text style={{ color: c.textSub, fontSize: 12, marginTop: space.sm, lineHeight: 18 }}>
          데이터: {dataSource.mode === 'mock' ? '목업(가짜) 데이터' : '실제 데이터 (Supabase)'} · 카카오 장소 검색: {places.available ? (places.status === 'ready' ? '연결됨' : places.status === 'error' ? '오류' : '연결 중') : '키 없음'}
        </Text>
      </Card>
    </ScrollView>
  );
}
