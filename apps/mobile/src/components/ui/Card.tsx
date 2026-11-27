import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { radius, space, usePalette } from '@/theme/colors';

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const c = usePalette();
  return <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }, style]}>{children}</View>;
}

export function SectionTitle({ title, right }: { title: string; right?: ReactNode }) {
  const c = usePalette();
  return (
    <View style={styles.titleRow}>
      <Text style={{ color: c.text, fontSize: 20, fontWeight: '800' }} accessibilityRole="header">
        {title}
      </Text>
      {right}
    </View>
  );
}

/** 왼쪽 라벨 · 오른쪽 값 한 줄 */
export function Row({ label, value, tip, strong }: { label: string; value: ReactNode; tip?: ReactNode; strong?: boolean }) {
  const c = usePalette();
  return (
    <View style={[styles.row, { borderTopColor: c.border }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 }}>
        <Text style={{ color: c.textSub, fontSize: 15 }}>{label}</Text>
        {tip}
      </View>
      {typeof value === 'string' || typeof value === 'number' ? (
        <Text style={{ color: c.text, fontSize: 15, fontWeight: strong ? '800' : '600', textAlign: 'right', flexShrink: 1 }}>{value}</Text>
      ) : (
        value
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: space.lg, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.md },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: 11,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
