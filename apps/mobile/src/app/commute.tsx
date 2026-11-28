import { Ionicons } from '@expo/vector-icons';
import { CSV_TEMPLATE, listSheets, parseRouteCsv, parseRouteTable, parseStopLocationCsv, readXlsx, uniqueStops, type CommuteRoute } from '@ulsan/shared';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, Row, KeyboardSheet } from '@/components/ui';
import { geocodeStops } from '@/features/commute/geocode';
import { usePlaces, type Place } from '@/features/places/KakaoServices';
import { naverSearch } from '@/features/places/naver';
import { useAppStore } from '@/stores/app-store';
import { COMPANY_WORD, useCommute, type StopGeo } from '@/stores/commute';
import { radius, space, usePalette } from '@/theme/colors';

async function readRoutes(asset: DocumentPicker.DocumentPickerAsset): Promise<CommuteRoute[]> {
  const file = new File(asset.uri);
  if (/\.csv$/i.test(asset.name) || asset.mimeType?.includes('csv')) return parseRouteCsv(await file.text());
  const bytes = await file.bytes();
  // 시트가 여러 개면 '운행노선' 머리글이 있는 시트를 모두 읽어 합친다
  const out: CommuteRoute[] = [];
  for (const name of listSheets(bytes)) out.push(...parseRouteTable(readXlsx(bytes, name)));
  return out.map((r, i) => ({ ...r, id: `r${i + 1}` }));
}

export default function CommuteScreen() {
  const c = usePalette();
  const insets = useSafeAreaInsets();
  const places = usePlaces();
  const { routes, stops, fileName, importedAt, company, setImport, setStop, setStops, setCompany, clear } = useCommute();
  const focusMap = useAppStore((s) => s.focusMap);
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [fixing, setFixing] = useState<string | null>(null);

  const stopNames = useMemo(() => uniqueStops(routes, COMPANY_WORD), [routes]);
  const found = stopNames.filter((s) => stops[s]?.location).length;
  const missing = stopNames.filter((s) => stops[s]?.status === 'notfound');

  const pick = async () => {
    const res = await DocumentPicker.getDocumentAsync({
      type: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv', 'text/comma-separated-values', '*/*'],
      copyToCacheDirectory: true,
    });
    if (res.canceled || !res.assets?.[0]) return;
    setBusy('파일을 읽는 중…');
    try {
      // 정류장 위치 보정 파일(정류장명,위도,경도…)이면 위치만 적용
      if (/\.csv$/i.test(res.assets[0].name) || res.assets[0].mimeType?.includes('csv')) {
        const locs = parseStopLocationCsv(await new File(res.assets[0].uri).text());
        if (locs.length) {
          if (!routes.length) {
            Alert.alert('노선표를 먼저 불러와 주세요', '위치 보정 파일은 노선표(엑셀)를 불러온 뒤에 넣어요.');
            return;
          }
          const names = new Set(uniqueStops(routes, COMPANY_WORD));
          const patch: Record<string, StopGeo> = {};
          for (const l of locs) {
            if (names.has(l.name)) patch[l.name] = { location: { lat: l.lat, lng: l.lng }, status: l.estimated ? 'estimated' : 'manual', placeName: l.place || (l.estimated ? '추정 위치' : undefined) };
          }
          setStops(patch);
          Alert.alert('위치를 넣었어요', `정류장 ${Object.keys(patch).length}곳 위치를 적용했어요.${locs.length > Object.keys(patch).length ? ` (노선표에 없는 이름 ${locs.length - Object.keys(patch).length}곳은 건너뜀)` : ''}`);
          return;
        }
      }
      const parsed = await readRoutes(res.assets[0]);
      if (!parsed.length) {
        Alert.alert('노선을 찾지 못했어요', '표에 "운행노선" 머리글이 있는 엑셀이거나, 아래 CSV 양식이어야 해요.');
        return;
      }
      setImport(parsed, res.assets[0].name);
    } catch (e) {
      Alert.alert('파일을 읽지 못했어요', String(e instanceof Error ? e.message : e));
    } finally {
      setBusy(null);
    }
  };

  const locateAll = async () => {
    if (!places.available) {
      Alert.alert('카카오 키가 필요해요', '정류장 위치 찾기는 카카오 JavaScript 키(.env)가 있어야 해요.');
      return;
    }
    setBusy('정류장 위치를 찾는 중…');
    try {
      if (!company.location) {
        const r = await places.search({ kind: 'keyword', query: company.name }, { size: 1 });
        if (r.places[0]) setCompany({ name: company.name, location: { lat: r.places[0].lat, lng: r.places[0].lng } });
      }
      await geocodeStops(
        routes,
        useCommute.getState().stops,
        places.search,
        (name, geo, done, total) => {
          setStop(name, geo);
          setProgress({ done, total });
        },
        naverSearch,
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: 40 + insets.bottom }}>
        <Card>
          <Text style={{ color: c.text, fontSize: 17, fontWeight: '800' }}>통근버스 노선 불러오기</Text>
          <Text style={{ color: c.textSub, fontSize: 14, marginTop: 4, lineHeight: 21 }}>
            회사 통근버스 노선표(엑셀 .xlsx 또는 CSV)를 고르면 정류장을 지도에 표시하고, 단지에서 가장 가까운 정류장과 도보 시간을 알려드려요.
          </Text>
          <Text style={{ color: c.good, fontSize: 13, marginTop: 6 }}>🔒 파일 내용은 이 폰에만 저장되고 서버로 보내지 않아요.</Text>
          <Text style={{ color: c.textSub, fontSize: 13, marginTop: 4 }}>정류장 위치 보정 파일(CSV: 정류장명,위도,경도)도 같은 버튼으로 넣을 수 있어요.</Text>
          <Pressable onPress={pick} style={[styles.btn, { backgroundColor: c.primary }]} accessibilityRole="button" disabled={!!busy}>
            <Ionicons name="document-attach" size={18} color={c.primaryText} />
            <Text style={{ color: c.primaryText, fontWeight: '800', fontSize: 16 }}>{routes.length ? '다른 파일로 바꾸기' : '파일 선택'}</Text>
          </Pressable>
          <Pressable onPress={() => Clipboard.setStringAsync(CSV_TEMPLATE).then(() => Alert.alert('CSV 양식을 복사했어요', CSV_TEMPLATE))} style={{ marginTop: space.sm }}>
            <Text style={{ color: c.primary, fontWeight: '700' }}>다른 회사 노선은 CSV 양식으로 (양식 복사)</Text>
          </Pressable>
        </Card>

        {busy ? (
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <ActivityIndicator color={c.primary} />
            <Text style={{ color: c.text, flex: 1 }}>
              {busy}
              {progress ? ` ${progress.done}/${progress.total}` : ''}
            </Text>
          </Card>
        ) : null}

        {routes.length ? (
          <Card>
            <Row label="파일" value={fileName ?? '-'} />
            <Row label="불러온 날" value={importedAt ? new Date(importedAt).toLocaleDateString('ko-KR') : '-'} />
            <Row label="노선 / 정류장" value={`${routes.length}개 / ${stopNames.length}곳`} />
            <Row label="위치 찾은 정류장" value={`${found}곳${missing.length ? ` · 못 찾음 ${missing.length}` : ''}`} strong />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.md }}>
              <Text style={{ color: c.textSub }}>도착지(회사)</Text>
              <TextInput
                value={company.name}
                onChangeText={(name) => setCompany({ name, location: null })}
                style={{ flex: 1, color: c.text, borderWidth: 1, borderColor: c.border, borderRadius: radius.sm, padding: 8 }}
                accessibilityLabel="도착지 이름"
              />
              <Ionicons name={company.location ? 'checkmark-circle' : 'help-circle-outline'} size={20} color={company.location ? c.good : c.textSub} />
            </View>
            <Pressable onPress={locateAll} disabled={!!busy} style={[styles.btn, { backgroundColor: c.chip }]}>
              <Ionicons name="locate" size={18} color={c.text} />
              <Text style={{ color: c.text, fontWeight: '800' }}>{found ? '못 찾은 정류장 다시 찾기' : '정류장 위치 찾기'}</Text>
            </Pressable>
            {found ? (
              <Pressable
                onPress={() => {
                  const first = stopNames.map((s) => stops[s]?.location).find(Boolean);
                  if (first) focusMap(first, 8);
                  router.navigate('/map?bus=1');
                }}
                style={[styles.btn, { backgroundColor: c.primary }]}>
                <Ionicons name="map" size={18} color={c.primaryText} />
                <Text style={{ color: c.primaryText, fontWeight: '800' }}>지도에서 노선 보기</Text>
              </Pressable>
            ) : null}
          </Card>
        ) : null}

        {routes.length ? (
          <Card>
            <Text style={{ color: c.text, fontSize: 16, fontWeight: '800', marginBottom: space.xs }}>정류장 ({stopNames.length})</Text>
            <Text style={{ color: c.textSub, fontSize: 13, marginBottom: space.sm }}>위치가 틀리거나 못 찾은 정류장은 눌러서 직접 고를 수 있어요.</Text>
            {[...missing, ...stopNames.filter((s) => !missing.includes(s))].map((s) => {
              const g = stops[s];
              return (
                <Pressable key={s} onPress={() => setFixing(s)} style={[styles.stop, { borderTopColor: c.border }]}>
                  <Ionicons
                    name={g?.status === 'notfound' ? 'alert-circle' : g?.status === 'estimated' ? 'help-circle' : g?.location ? 'location' : 'ellipse-outline'}
                    size={18}
                    color={g?.status === 'notfound' ? c.bad : g?.status === 'estimated' ? c.warn : g?.location ? c.good : c.textSub}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: c.text, fontSize: 15 }}>{s}</Text>
                    {g?.placeName ? (
                      <Text style={{ color: c.textSub, fontSize: 12 }}>
                        → {g.placeName} {g.status === 'manual' ? '(직접 지정)' : g.status === 'estimated' ? '(앞뒤 정류장으로 추정)' : ''}
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
            <Pressable
              onPress={() => Alert.alert('노선 지우기', '불러온 통근버스 노선을 이 폰에서 지울까요?', [{ text: '취소', style: 'cancel' }, { text: '지우기', style: 'destructive', onPress: clear }])}
              style={{ marginTop: space.lg, alignItems: 'center' }}>
              <Text style={{ color: c.bad, fontWeight: '700' }}>불러온 노선 모두 지우기</Text>
            </Pressable>
          </Card>
        ) : null}
      </ScrollView>

      <FixStopModal name={fixing} onClose={() => setFixing(null)} />
    </View>
  );
}

function FixStopModal({ name, onClose }: { name: string | null; onClose: () => void }) {
  const c = usePalette();
  const insets = useSafeAreaInsets();
  const places = usePlaces();
  const setStop = useCommute((s) => s.setStop);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);

  const run = async (query: string) => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const t = query.trim();
      const full = /울산|부산|경주|양산|기장|정관|웅상|포항/.test(t) ? t : `울산 ${t}`;
      // 카카오 + 네이버 결과를 함께 (네이버에만 있는 작은 가게·정류장 이름 보충)
      const [k, n] = await Promise.all([places.search({ kind: 'keyword', query: full }, { size: 10 }).then((r) => r.places).catch(() => []), naverSearch(full)]);
      setResults([...k, ...n.filter((x) => !k.some((y) => y.name === x.name))]);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={!!name} animationType="slide" transparent onRequestClose={onClose} onShow={() => { setQ(name ?? ''); setResults([]); run(name ?? ''); }}>
      <KeyboardSheet onClose={onClose}>
      <View style={{ backgroundColor: c.card, padding: space.lg, paddingBottom: insets.bottom + space.lg, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, maxHeight: '75%' }}>
        <Text style={{ color: c.text, fontSize: 17, fontWeight: '800' }}>「{name}」 위치 고르기</Text>
        <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.md }}>
          <TextInput value={q} onChangeText={setQ} onSubmitEditing={() => run(q)} returnKeyType="search" style={{ flex: 1, color: c.text, borderWidth: 1, borderColor: c.border, borderRadius: radius.md, padding: space.md }} />
          <Pressable onPress={() => run(q)} style={{ justifyContent: 'center', paddingHorizontal: space.md }}>
            {loading ? <ActivityIndicator color={c.primary} /> : <Ionicons name="search" size={22} color={c.primary} />}
          </Pressable>
        </View>
        <ScrollView style={{ marginTop: space.sm }}>
          {results.map((p) => (
            <Pressable
              key={p.id}
              onPress={() => {
                if (name) setStop(name, { location: { lat: p.lat, lng: p.lng }, status: 'manual', placeName: p.name, address: p.address });
                onClose();
              }}
              style={{ paddingVertical: 12, borderTopWidth: 1, borderTopColor: c.border }}>
              <Text style={{ color: c.text, fontSize: 15, fontWeight: '700' }}>{p.name}</Text>
              <Text style={{ color: c.textSub, fontSize: 12 }}>
                {p.address} · {p.category}
              </Text>
            </Pressable>
          ))}
          {!loading && !results.length ? <Text style={{ color: c.textSub, marginTop: space.md }}>검색 결과가 없어요. 근처 건물·가게 이름으로 찾아보세요.</Text> : null}
        </ScrollView>
      </View>
      </KeyboardSheet>
    </Modal>
  );
}

const styles = StyleSheet.create({
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 13, borderRadius: radius.md, marginTop: space.md },
  stop: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth },
});
