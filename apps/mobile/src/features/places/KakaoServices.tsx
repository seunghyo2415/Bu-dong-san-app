import { createContext, useCallback, useContext, useMemo, useRef, useState, type ComponentType, type ReactNode, type RefAttributes } from 'react';
import { Platform, View } from 'react-native';
import WebView, { type WebViewMessageEvent, type WebViewProps } from 'react-native-webview';

import type { LatLng } from '@/data';
import { KAKAO_JS_KEY } from '@/features/map/KakaoMap';
import { MAP_BASE_URL } from '@/map-web/kakao-map-html';
import { buildKakaoServicesHtml } from '@/map-web/kakao-services-html';

export type Place = {
  id: string;
  name: string;
  address: string;
  category: string;
  group: string;
  lat: number;
  lng: number;
  distance: number | null;
  url: string;
};

type Req = { kind: 'keyword'; query: string } | { kind: 'category'; code: string };
type Opts = { near?: LatLng; radius?: number; size?: number; sort?: 'distance' | 'accuracy' };
export type PlacesResult = { places: Place[]; total: number };

type Ctx = {
  available: boolean;
  status: 'loading' | 'ready' | 'error' | 'no-key';
  search: (req: Req, opts?: Opts) => Promise<PlacesResult>;
};

const PlacesContext = createContext<Ctx>({
  available: false,
  status: 'no-key',
  search: () => Promise.reject(new Error('카카오 JavaScript 키가 필요해요')),
});

type WebViewRef = WebView<object>;
const RNWebView = WebView as unknown as ComponentType<WebViewProps & RefAttributes<WebViewRef>>;

/** 앱 전체에서 하나만: 보이지 않는 WebView 로 카카오 장소 검색 */
export function KakaoServicesProvider({ children }: { children: ReactNode }) {
  const enabled = !!KAKAO_JS_KEY && Platform.OS !== 'web';
  const ref = useRef<WebViewRef>(null);
  const pending = useRef(new Map<string, { resolve: (r: PlacesResult) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> }>());
  const cache = useRef(new Map<string, PlacesResult>());
  const [status, setStatus] = useState<Ctx['status']>(enabled ? 'loading' : 'no-key');
  const seq = useRef(0);

  const search = useCallback(
    (req: Req, opts: Opts = {}) => {
      if (!enabled) return Promise.reject(new Error('카카오 JavaScript 키가 필요해요'));
      const payload = {
        ...req,
        lat: opts.near?.lat,
        lng: opts.near?.lng,
        radius: opts.radius,
        size: opts.size,
        sort: opts.sort,
      };
      const key = JSON.stringify(payload);
      const hit = cache.current.get(key);
      if (hit) return Promise.resolve(hit);
      const id = String(++seq.current);
      return new Promise<PlacesResult>((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.current.delete(id);
          reject(new Error('장소 검색 시간 초과'));
        }, 12000);
        pending.current.set(id, {
          resolve: (r) => {
            cache.current.set(key, r);
            resolve(r);
          },
          reject,
          timer,
        });
        ref.current?.injectJavaScript(`window.__req && window.__req(${JSON.stringify({ id, ...payload })}); true;`);
      });
    },
    [enabled],
  );

  const onMessage = (e: WebViewMessageEvent) => {
    let m: { type: string; id?: string; ok?: boolean; places?: Place[]; total?: number; error?: string; message?: string };
    try {
      m = JSON.parse(e.nativeEvent.data);
    } catch {
      return;
    }
    if (m.type === 'ready') setStatus('ready');
    else if (m.type === 'error') setStatus('error');
    else if (m.type === 'res' && m.id) {
      const p = pending.current.get(m.id);
      if (!p) return;
      clearTimeout(p.timer);
      pending.current.delete(m.id);
      if (m.ok) p.resolve({ places: m.places ?? [], total: m.total ?? 0 });
      else p.reject(new Error(m.error ?? '검색 실패'));
    }
  };

  const html = useMemo(() => (enabled ? buildKakaoServicesHtml(KAKAO_JS_KEY) : ''), [enabled]);
  const value = useMemo(() => ({ available: enabled, status, search }), [enabled, status, search]);

  return (
    <PlacesContext.Provider value={value}>
      {children}
      {enabled ? (
        <View style={{ width: 0, height: 0, position: 'absolute', opacity: 0 }} pointerEvents="none">
          <RNWebView ref={ref} source={{ html, baseUrl: MAP_BASE_URL }} originWhitelist={['*']} onMessage={onMessage} javaScriptEnabled style={{ width: 1, height: 1 }} />
        </View>
      ) : null}
    </PlacesContext.Provider>
  );
}

export function usePlaces() {
  return useContext(PlacesContext);
}
