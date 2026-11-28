import * as Updates from 'expo-updates';
import { useEffect, useState } from 'react';
import { ActivityIndicator, AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * EAS Update(OTA): 앱을 켜거나 다시 열 때 새 업데이트가 있으면 아래에 배너를 띄운다.
 * 누르면 내려받아 바로 다시 시작. 실패해도 조용히 넘어간다.
 */
export function UpdateBanner() {
  const enabled = Updates.isEnabled && !__DEV__;
  const { isUpdateAvailable, isUpdatePending, isDownloading } = Updates.useUpdates();
  const [hidden, setHidden] = useState(false);
  const [busy, setBusy] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!enabled) return;
    const check = () => void Updates.checkForUpdateAsync().catch(() => {});
    check();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && check());
    return () => sub.remove();
  }, [enabled]);

  if (!enabled || hidden || !(isUpdateAvailable || isUpdatePending)) return null;

  const apply = async () => {
    setBusy(true);
    try {
      if (!isUpdatePending) await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
    } catch {
      setBusy(false);
    }
  };

  const working = busy || isDownloading;
  return (
    <View style={[styles.wrap, { bottom: insets.bottom + 72 }]} pointerEvents="box-none">
      <View style={styles.card}>
        <Text style={styles.text}>🎉 새 업데이트가 있어요</Text>
        {working ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Pressable onPress={() => setHidden(true)} hitSlop={8}>
              <Text style={styles.later}>나중에</Text>
            </Pressable>
            <Pressable onPress={apply} style={styles.btn} hitSlop={8}>
              <Text style={styles.btnText}>지금 적용</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#1f2937', borderRadius: 14,
    paddingVertical: 12, paddingHorizontal: 16, width: '100%', maxWidth: 480,
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 6,
  },
  text: { flex: 1, color: '#fff', fontSize: 15, fontWeight: '600' },
  later: { color: '#cbd5e1', fontSize: 14 },
  btn: { backgroundColor: '#3b82f6', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12 },
  btnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
