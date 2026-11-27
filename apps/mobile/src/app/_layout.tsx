import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { requireOptionalNativeModule } from 'expo';
import { DarkTheme, DefaultTheme, router, Stack, ThemeProvider } from 'expo-router';
import { ShareIntentProvider, useShareIntentContext } from 'expo-share-intent';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Platform, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { KakaoServicesProvider } from '@/features/places/KakaoServices';
import * as Notifications from 'expo-notifications';
import '@/features/alerts/push';

// 공유 수신 네이티브 모듈은 개발용 앱(APK)·정식 앱에만 있고 Expo Go 에는 없다 → 없으면 끔
const isExpoGo = !requireOptionalNativeModule('ExpoShareIntentModule');

/** 다른 앱에서 공유하기로 들어온 글/링크를 분석 화면으로 넘김 */
function ShareIntentRouter() {
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntentContext();
  useEffect(() => {
    if (!hasShareIntent) return;
    const text = [shareIntent.text, shareIntent.webUrl].filter(Boolean).join('\n').trim();
    if (text) router.push({ pathname: '/share/receive', params: { text } });
    resetShareIntent();
  }, [hasShareIntent, shareIntent, resetShareIntent]);
  return null;
}

/** 새 실거래 알림을 누르면 그 단지 상세로 */
function NotificationRouter() {
  const last = Notifications.useLastNotificationResponse();
  useEffect(() => {
    const id = last?.notification.request.content.data?.complexId;
    if (typeof id === 'string') router.push(`/complex/${id}`);
  }, [last]);
  return null;
}

export default function RootLayout() {
  const scheme = useColorScheme();
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 5 * 60 * 1000, retry: 1 } } }),
  );
  return (
    <ShareIntentProvider options={{ disabled: isExpoGo, resetOnBackground: true }}>
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <KakaoServicesProvider>
        {isExpoGo ? null : <ShareIntentRouter />}
        {Platform.OS === 'web' ? null : <NotificationRouter />}
        <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
          <StatusBar style="auto" />
          <Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal' }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="search" options={{ headerShown: false, animation: 'fade' }} />
            <Stack.Screen name="complex/[id]" options={{ title: '' }} />
            <Stack.Screen name="share/receive" options={{ title: '공유받은 매물' }} />
            <Stack.Screen name="listing/[id]" options={{ title: '저장한 매물' }} />
            <Stack.Screen name="roadview" options={{ title: '로드뷰' }} />
            <Stack.Screen name="commute" options={{ title: '통근버스 노선' }} />
            <Stack.Screen name="workplaces" options={{ title: '내 직장' }} />
            <Stack.Screen name="calculators" options={{ title: '계산기' }} />
            <Stack.Screen name="about" options={{ title: '안내' }} />
          </Stack>
        </ThemeProvider>
        </KakaoServicesProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
    </ShareIntentProvider>
  );
}
