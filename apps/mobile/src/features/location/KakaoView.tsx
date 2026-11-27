import { useMemo, useState, type ComponentType } from 'react';
import { ActivityIndicator, Platform, Text, View, type ViewStyle } from 'react-native';
import WebView, { type WebViewProps } from 'react-native-webview';

import type { LatLng } from '@/data';
import { KAKAO_JS_KEY } from '@/features/map/KakaoMap';
import { MAP_BASE_URL } from '@/map-web/kakao-map-html';
import { buildKakaoViewHtml } from '@/map-web/kakao-view-html';
import { usePalette } from '@/theme/colors';

const RNWebView = WebView as unknown as ComponentType<WebViewProps>;

/** 미니 지도 또는 로드뷰 (카카오 JS 키 필요) */
export function KakaoView({ location, name, mode, style }: { location: LatLng; name: string; mode: 'minimap' | 'roadview'; style?: ViewStyle }) {
  const c = usePalette();
  const [state, setState] = useState<'loading' | 'ready' | 'no-roadview' | 'error'>('loading');
  const html = useMemo(() => buildKakaoViewHtml({ appKey: KAKAO_JS_KEY, lat: location.lat, lng: location.lng, mode, name }), [location.lat, location.lng, mode, name]);

  if (!KAKAO_JS_KEY || Platform.OS === 'web') {
    return (
      <View style={[{ alignItems: 'center', justifyContent: 'center', backgroundColor: c.chip, padding: 16 }, style]}>
        <Text style={{ color: c.textSub, textAlign: 'center' }}>{mode === 'roadview' ? '로드뷰' : '지도'}는 카카오 JavaScript 키를 넣으면 보여요.</Text>
      </View>
    );
  }
  return (
    <View style={[{ overflow: 'hidden', backgroundColor: c.chip }, style]}>
      <RNWebView
        source={{ html, baseUrl: MAP_BASE_URL }}
        originWhitelist={['*']}
        javaScriptEnabled
        scrollEnabled={false}
        onMessage={(e) => {
          try {
            setState(JSON.parse(e.nativeEvent.data).type);
          } catch {
            /* 무시 */
          }
        }}
        style={{ flex: 1, backgroundColor: 'transparent' }}
      />
      {state !== 'ready' ? (
        <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: c.chip }} pointerEvents="none">
          {state === 'loading' ? <ActivityIndicator color={c.primary} /> : null}
          {state === 'no-roadview' ? <Text style={{ color: c.textSub }}>이 근처(100m)에는 로드뷰가 없어요</Text> : null}
          {state === 'error' ? <Text style={{ color: c.textSub }}>불러오지 못했어요. 키·인터넷을 확인하세요</Text> : null}
        </View>
      ) : null}
    </View>
  );
}
