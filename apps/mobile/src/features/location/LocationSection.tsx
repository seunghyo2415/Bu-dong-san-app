import { Ionicons } from '@expo/vector-icons';
import { driveMinutesEstimate, formatDistance, haversineM, nearest, uniqueStops, walkMinutes } from '@ulsan/shared';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, Linking, Pressable, Text, View } from 'react-native';

import { Card, Row, SectionTitle } from '@/components/ui';
import type { ComplexDetail } from '@/data';
import { usePlaces } from '@/features/places/KakaoServices';
import { useAppStore } from '@/stores/app-store';
import { COMPANY_WORD, useCommute } from '@/stores/commute';
import { radius, space, usePalette } from '@/theme/colors';

import { KakaoView } from './KakaoView';
import { dist, useLandmarks, useNearby } from './nearby';

function kakaoRouteUrl(from: { lat: number; lng: number }, fromName: string, to: { lat: number; lng: number }, toName: string) {
  return `https://map.kakao.com/link/from/${encodeURIComponent(fromName)},${from.lat},${from.lng}/to/${encodeURIComponent(toName)},${to.lat},${to.lng}`;
}

export function LocationSection({ d }: { d: ComplexDetail }) {
  const c = usePalette();
  const places = usePlaces();
  const loc = d.location;
  const nearby = useNearby(loc);
  const landmarks = useLandmarks(loc);
  const workplaces = useAppStore((s) => s.workplaces);
  const commute = useCommute();

  const busStop = useMemo(() => {
    if (!loc || !commute.routes.length) return null;
    const stops = uniqueStops(commute.routes, COMPANY_WORD).map((name) => ({ name, location: commute.stops[name]?.location ?? null }));
    const n = nearest(loc, stops);
    if (!n) return null;
    const routes = commute.routes.filter((r) => r.stops.includes(n.name));
    return { ...n, routes };
  }, [loc, commute.routes, commute.stops]);

  if (!loc) {
    return (
      <View style={{ gap: space.md }}>
        <SectionTitle title="위치 · 주변" />
        <Card>
          <Text style={{ color: c.textSub }}>이 단지는 아직 좌표가 없어요. (수집 시 카카오 주소 검색으로 채워져요)</Text>
        </Card>
      </View>
    );
  }

  return (
    <View style={{ gap: space.md }}>
      <SectionTitle title="위치 · 주변" />

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <KakaoView location={loc} name={d.name} mode="minimap" style={{ height: 180 }} />
        <View style={{ flexDirection: 'row' }}>
          <Pressable
            onPress={() => router.push({ pathname: '/roadview', params: { lat: String(loc.lat), lng: String(loc.lng), name: d.name } })}
            style={{ flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', paddingVertical: 13 }}
            accessibilityRole="button">
            <Ionicons name="walk" size={18} color={c.primary} />
            <Text style={{ color: c.primary, fontWeight: '800' }}>로드뷰 (전체화면)</Text>
          </Pressable>
          <Pressable
            onPress={() => Linking.openURL(`https://map.kakao.com/link/map/${encodeURIComponent(d.name)},${loc.lat},${loc.lng}`)}
            style={{ flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', paddingVertical: 13 }}
            accessibilityRole="link">
            <Ionicons name="map-outline" size={18} color={c.primary} />
            <Text style={{ color: c.primary, fontWeight: '800' }}>카카오맵에서 열기</Text>
          </Pressable>
        </View>
      </Card>

      {busStop ? (
        <Card>
          <Text style={{ color: c.text, fontSize: 16, fontWeight: '800' }}>🚌 가장 가까운 통근버스 정류장</Text>
          <Text style={{ color: c.text, fontSize: 20, fontWeight: '900', marginTop: 6 }}>{busStop.name}</Text>
          <Text style={{ color: c.good, fontSize: 16, fontWeight: '800' }}>
            도보 약 {walkMinutes(busStop.distanceM)}분 · 직선 {formatDistance(busStop.distanceM)}
          </Text>
          {busStop.routes.slice(0, 4).map((r) => (
            <Text key={r.id} style={{ color: c.textSub, fontSize: 13, marginTop: 4 }}>
              [{r.region}] {r.departures.slice(0, 3).map((x) => `${x.boardAt} ${[x.shift1 && `1조 ${x.shift1}`, x.shift2 && `2조 ${x.shift2}`].filter(Boolean).join('·')}`).join(' / ')}
            </Text>
          ))}
          <Text style={{ color: c.textSub, fontSize: 12, marginTop: 6 }}>시간은 노선표의 첫 탑승지 출발 시각이에요. 도보 시간은 직선거리 기준 추정이에요.</Text>
        </Card>
      ) : commute.routes.length === 0 ? (
        <Pressable onPress={() => router.push('/commute')}>
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <Ionicons name="bus-outline" size={22} color={c.primary} />
            <Text style={{ color: c.text, flex: 1 }}>통근버스 노선 파일을 불러오면 가장 가까운 정류장과 도보 시간을 보여드려요</Text>
            <Ionicons name="chevron-forward" size={18} color={c.textSub} />
          </Card>
        </Pressable>
      ) : null}

      <Card>
        <Text style={{ color: c.text, fontSize: 16, fontWeight: '800', marginBottom: space.xs }}>주변 시설 (도보)</Text>
        {!places.available ? (
          <Text style={{ color: c.textSub, lineHeight: 20 }}>주변 시설 검색은 카카오 JavaScript 키를 넣으면 동작해요.</Text>
        ) : nearby.isPending ? (
          <ActivityIndicator color={c.primary} style={{ marginVertical: space.md }} />
        ) : nearby.isError ? (
          <Text style={{ color: c.textSub }}>주변 시설을 불러오지 못했어요.</Text>
        ) : (
          nearby.data?.map((n) => (
            <Row
              key={n.key}
              label={n.place ? `${n.label} · ${n.place.name}` : n.label}
              value={n.extra ?? (n.distanceM != null ? `${dist(n.distanceM)} · 도보 ${n.walk}분` : '근처에 없음')}
            />
          ))
        )}
        <Text style={{ color: c.textSub, fontSize: 12, marginTop: 6, lineHeight: 18 }}>
          출처: 카카오 장소 검색 · 도보 시간은 직선거리×1.3 기준 추정. 배정 초등학교(통학구역)는 학교 거리와 다를 수 있으니 교육청 「학구도 안내 서비스」로 확인하세요.
        </Text>
        <Pressable onPress={() => Linking.openURL('https://search.naver.com/search.naver?query=' + encodeURIComponent('학구도 안내 서비스'))}>
          <Text style={{ color: c.primary, fontWeight: '700', marginTop: 4 }}>학구도 안내 서비스 찾기</Text>
        </Pressable>
      </Card>

      <Card>
        <Text style={{ color: c.text, fontSize: 16, fontWeight: '800', marginBottom: space.xs }}>직장까지</Text>
        {workplaces.length === 0 ? (
          <Pressable onPress={() => router.push('/workplaces')} style={{ paddingVertical: 8 }}>
            <Text style={{ color: c.primary, fontWeight: '700' }}>+ 직장 등록하기 (현대자동차, HD현대중공업, SK에너지 등)</Text>
          </Pressable>
        ) : (
          workplaces.map((w) => {
            const m = haversineM(loc, w.location);
            return (
              <Pressable key={w.id} onPress={() => Linking.openURL(kakaoRouteUrl(loc, d.name, w.location, w.name))}>
                <Row label={w.name} value={`직선 ${formatDistance(m)} · 차로 약 ${driveMinutesEstimate(m)}분 ›`} />
              </Pressable>
            );
          })
        )}
        <Text style={{ color: c.textSub, fontSize: 12, marginTop: 6 }}>차 시간은 직선거리로 추정한 값이에요. 누르면 카카오맵 길찾기로 실제 경로를 볼 수 있어요.</Text>
      </Card>

      {places.available ? (
        <Card>
          <Text style={{ color: c.text, fontSize: 16, fontWeight: '800', marginBottom: space.xs }}>역 · 산업단지 (직선거리)</Text>
          {landmarks.isPending ? (
            <ActivityIndicator color={c.primary} />
          ) : (
            [...(landmarks.data?.station ?? []), ...(landmarks.data?.industrial ?? [])].map((l) => (
              <Row key={l.key} label={l.label} value={l.distanceM != null ? `${dist(l.distanceM)} · 차로 약 ${driveMinutesEstimate(l.distanceM)}분` : '찾지 못함'} />
            ))
          )}
          <Text style={{ color: c.textSub, fontSize: 12, marginTop: 6 }}>산업단지는 검색된 대표 위치까지의 거리예요(단지 전체 경계 아님).</Text>
        </Card>
      ) : null}

      <View style={{ borderRadius: radius.md }} />
    </View>
  );
}
