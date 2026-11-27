import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { Card, Chip } from '@/components/ui';
import { usePlaces, type Place } from '@/features/places/KakaoServices';
import { useAppStore } from '@/stores/app-store';
import { radius, space, usePalette } from '@/theme/colors';

const PRESETS = ['현대자동차 울산공장', 'HD현대중공업', 'SK에너지 울산CLX', 'S-OIL 온산공장', '울산시청', '롯데케미칼 울산공장'];

/** 직장 등록 (이 폰에만 저장). 단지 상세에서 거리·길찾기에 사용 */
export default function WorkplacesScreen() {
  const c = usePalette();
  const places = usePlaces();
  const { workplaces, addWorkplace, removeWorkplace } = useAppStore();
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);

  const run = async (query: string) => {
    if (!query.trim()) return;
    if (!places.available) {
      Alert.alert('카카오 키가 필요해요', '직장 위치 검색은 카카오 JavaScript 키(.env)가 있어야 해요.');
      return;
    }
    setQ(query);
    setLoading(true);
    try {
      setResults((await places.search({ kind: 'keyword', query }, { size: 8 })).places);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={{ padding: space.lg, gap: space.lg }} keyboardShouldPersistTaps="handled">
      <Card>
        <Text style={{ color: c.text, fontSize: 16, fontWeight: '800' }}>등록한 직장</Text>
        {workplaces.length === 0 ? <Text style={{ color: c.textSub, marginTop: space.sm }}>아직 없어요. 아래에서 찾아 등록하세요.</Text> : null}
        {workplaces.map((w) => (
          <View key={w.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: c.border, marginTop: space.sm }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: c.text, fontWeight: '700' }}>{w.name}</Text>
              <Text style={{ color: c.textSub, fontSize: 12 }}>{w.address}</Text>
            </View>
            <Pressable onPress={() => removeWorkplace(w.id)} hitSlop={8} accessibilityLabel={`${w.name} 삭제`}>
              <Ionicons name="trash-outline" size={20} color={c.textSub} />
            </Pressable>
          </View>
        ))}
      </Card>

      <Card>
        <Text style={{ color: c.text, fontSize: 16, fontWeight: '800' }}>직장 찾기</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.sm }}>
          {PRESETS.map((p) => (
            <Chip key={p} label={p} onPress={() => run(p)} />
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.md }}>
          <TextInput
            value={q}
            onChangeText={setQ}
            onSubmitEditing={() => run(q)}
            placeholder="회사·건물 이름"
            placeholderTextColor={c.textSub}
            returnKeyType="search"
            style={{ flex: 1, color: c.text, borderWidth: 1, borderColor: c.border, borderRadius: radius.md, padding: space.md, fontSize: 16 }}
          />
          <Pressable onPress={() => run(q)} style={{ justifyContent: 'center', paddingHorizontal: space.sm }} accessibilityLabel="검색">
            {loading ? <ActivityIndicator color={c.primary} /> : <Ionicons name="search" size={22} color={c.primary} />}
          </Pressable>
        </View>
        {results.map((p) => (
          <Pressable
            key={p.id}
            onPress={() => {
              addWorkplace({ name: p.name, address: p.address, location: { lat: p.lat, lng: p.lng } });
              setResults([]);
              setQ('');
            }}
            style={{ paddingVertical: 12, borderTopWidth: 1, borderTopColor: c.border }}>
            <Text style={{ color: c.text, fontWeight: '700' }}>+ {p.name}</Text>
            <Text style={{ color: c.textSub, fontSize: 12 }}>{p.address}</Text>
          </Pressable>
        ))}
      </Card>
    </ScrollView>
  );
}
