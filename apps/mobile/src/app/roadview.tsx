import { Stack, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { KakaoView } from '@/features/location/KakaoView';

/** 로드뷰 전체 화면 (단지 입구 쪽을 바라보는 시점) */
export default function RoadviewScreen() {
  const { lat, lng, name } = useLocalSearchParams<{ lat: string; lng: string; name?: string }>();
  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: name ? `${name} 로드뷰` : '로드뷰' }} />
      <KakaoView location={{ lat: Number(lat), lng: Number(lng) }} name={name ?? ''} mode="roadview" style={{ flex: 1 }} />
    </View>
  );
}
