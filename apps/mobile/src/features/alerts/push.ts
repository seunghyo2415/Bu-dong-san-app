import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { dataSource } from '@/data';

/** 앱이 켜져 있을 때도 알림 배너 표시 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

/**
 * 관심 단지 새 실거래 푸시 등록. 실데이터 모드 + 개발용/정식 앱에서만 동작
 * (Expo Go 안드로이드는 원격 푸시를 지원하지 않음, EAS 프로젝트 ID 필요)
 */
export async function enableTradeAlerts(complexId: string): Promise<'ok' | 'denied' | 'unsupported'> {
  if (dataSource.mode !== 'supabase' || Platform.OS === 'web') return 'unsupported';
  const projectId = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId;
  if (!projectId) return 'unsupported';
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('trades', { name: '관심 단지 실거래', importance: Notifications.AndroidImportance.DEFAULT });
  }
  const perm = await Notifications.requestPermissionsAsync();
  if (!perm.granted) return 'denied';
  try {
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    await dataSource.registerPushToken(token, Platform.OS);
    await dataSource.setTradeAlert(complexId, true);
    return 'ok';
  } catch {
    return 'unsupported';
  }
}

export async function disableTradeAlerts(complexId: string) {
  if (dataSource.mode === 'supabase') await dataSource.setTradeAlert(complexId, false).catch(() => {});
}
