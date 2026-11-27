import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

import { radius, space, usePalette } from '@/theme/colors';

/** 화면에서 예상치 못한 오류가 났을 때 (앱 전체가 하얗게 멈추지 않도록) */
export function ErrorView({ error, retry }: { error: Error; retry: () => void }) {
  const c = usePalette();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center', padding: space.xl }}>
      <Ionicons name="alert-circle-outline" size={48} color={c.warn} />
      <Text style={{ color: c.text, fontSize: 18, fontWeight: '800', marginTop: space.md, textAlign: 'center' }}>앗, 화면을 그리다 문제가 생겼어요</Text>
      <Text style={{ color: c.textSub, fontSize: 14, marginTop: space.sm, textAlign: 'center', lineHeight: 20 }}>
        다시 시도해도 계속되면 앱을 껐다 켜 주세요.{'\n'}
        <Text style={{ fontSize: 12 }}>({error.message.slice(0, 120)})</Text>
      </Text>
      <Pressable onPress={retry} style={{ marginTop: space.lg, backgroundColor: c.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: radius.md }} accessibilityRole="button">
        <Text style={{ color: c.primaryText, fontWeight: '800', fontSize: 16 }}>다시 시도</Text>
      </Pressable>
    </View>
  );
}
