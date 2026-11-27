import { Ionicons } from '@expo/vector-icons';
import { Directory, File, Paths } from 'expo-file-system';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';

import { Card } from '@/components/ui';
import { useListings, type SavedListing } from '@/stores/listings';
import { radius, space, usePalette } from '@/theme/colors';

/** 임장 때 확인할 것 (필요하면 항목만 추가) */
export const CHECK_ITEMS = [
  { key: 'light', label: '채광 (남향·햇빛)' },
  { key: 'noise', label: '소음 (도로·층간)' },
  { key: 'parking', label: '퇴근 시간 주차' },
  { key: 'smell', label: '냄새 (하수구·공단)' },
  { key: 'leak', label: '누수·곰팡이·결로' },
  { key: 'water', label: '수압·온수' },
  { key: 'elevator', label: '엘리베이터·지하 연결' },
  { key: 'view', label: '조망·사생활 (앞 동 거리)' },
  { key: 'manage', label: '관리 상태 (복도·분리수거)' },
  { key: 'around', label: '주변 (경사·유해시설·밤길)' },
] as const;

async function savePhoto(uri: string) {
  const dir = new Directory(Paths.document, 'inspection');
  dir.create({ intermediates: true, idempotent: true });
  const ext = uri.split('?')[0].split('.').pop()?.toLowerCase() || 'jpg';
  const dest = new File(dir, `${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`);
  await new File(uri).copy(dest);
  return dest.uri;
}

export function Checklist({ listing }: { listing: SavedListing }) {
  const c = usePalette();
  const update = useListings((s) => s.update);
  const list = listing.checklist ?? {};
  const photos = listing.photos ?? [];
  const [noteOpen, setNoteOpen] = useState<string | null>(null);
  const done = CHECK_ITEMS.filter((i) => list[i.key]?.state).length;
  const bad = CHECK_ITEMS.filter((i) => list[i.key]?.state === 'bad').length;

  const setItem = (key: string, patch: Partial<{ state: 'good' | 'bad' | null; note: string }>) => {
    const prev = list[key] ?? { state: null, note: '' };
    update(listing.id, { checklist: { ...list, [key]: { ...prev, ...patch } } });
  };

  const addPhoto = async (from: 'camera' | 'library') => {
    const perm = from === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert('권한이 필요해요', '설정에서 카메라·사진 권한을 허용해 주세요.');
    const r = from === 'camera'
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.6 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6, allowsMultipleSelection: true, selectionLimit: 10 });
    if (r.canceled) return;
    try {
      const saved = await Promise.all(r.assets.map((a) => savePhoto(a.uri)));
      update(listing.id, { photos: [...photos, ...saved] });
    } catch (e) {
      Alert.alert('사진을 저장하지 못했어요', String(e));
    }
  };

  const removePhoto = (uri: string) =>
    Alert.alert('사진 삭제', '이 사진을 지울까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => {
          try {
            new File(uri).delete();
          } catch {
            /* 이미 없음 */
          }
          update(listing.id, { photos: photos.filter((p) => p !== uri) });
        },
      },
    ]);

  return (
    <Card>
      <Text style={{ color: c.text, fontSize: 16, fontWeight: '800' }}>임장 체크리스트</Text>
      <Text style={{ color: c.textSub, fontSize: 13, marginTop: 2 }}>
        {done}/{CHECK_ITEMS.length} 확인 {bad ? `· 아쉬운 점 ${bad}개` : ''} · 이 폰에만 저장
      </Text>
      {CHECK_ITEMS.map((it) => {
        const v = list[it.key];
        return (
          <View key={it.key} style={{ borderTopWidth: 1, borderTopColor: c.border, paddingVertical: 10, marginTop: it.key === 'light' ? space.sm : 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
              <Text style={{ color: c.text, fontSize: 15, flex: 1 }}>{it.label}</Text>
              <Pressable onPress={() => setItem(it.key, { state: v?.state === 'good' ? null : 'good' })} hitSlop={6} accessibilityLabel={`${it.label} 좋음`} accessibilityState={{ selected: v?.state === 'good' }}>
                <Ionicons name={v?.state === 'good' ? 'thumbs-up' : 'thumbs-up-outline'} size={22} color={v?.state === 'good' ? c.good : c.textSub} />
              </Pressable>
              <Pressable onPress={() => setItem(it.key, { state: v?.state === 'bad' ? null : 'bad' })} hitSlop={6} accessibilityLabel={`${it.label} 아쉬움`} accessibilityState={{ selected: v?.state === 'bad' }}>
                <Ionicons name={v?.state === 'bad' ? 'thumbs-down' : 'thumbs-down-outline'} size={22} color={v?.state === 'bad' ? c.bad : c.textSub} />
              </Pressable>
              <Pressable onPress={() => setNoteOpen(noteOpen === it.key ? null : it.key)} hitSlop={6} accessibilityLabel={`${it.label} 메모`}>
                <Ionicons name={v?.note ? 'chatbox' : 'chatbox-outline'} size={20} color={v?.note ? c.primary : c.textSub} />
              </Pressable>
            </View>
            {noteOpen === it.key || v?.note ? (
              <TextInput
                defaultValue={v?.note ?? ''}
                onEndEditing={(e) => setItem(it.key, { note: e.nativeEvent.text })}
                placeholder="메모"
                placeholderTextColor={c.textSub}
                style={{ color: c.text, borderWidth: 1, borderColor: c.border, borderRadius: radius.sm, padding: 8, marginTop: 6 }}
              />
            ) : null}
          </View>
        );
      })}

      <Text style={{ color: c.text, fontSize: 15, fontWeight: '800', marginTop: space.md }}>사진 ({photos.length})</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: space.sm }}>
        {photos.map((p) => (
          <Pressable key={p} onLongPress={() => removePhoto(p)} accessibilityHint="길게 누르면 삭제">
            <Image source={{ uri: p }} style={{ width: 96, height: 96, borderRadius: radius.sm }} contentFit="cover" />
          </Pressable>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.sm }}>
        <Pressable onPress={() => addPhoto('camera')} style={{ flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: radius.md, backgroundColor: c.chip }}>
          <Ionicons name="camera" size={18} color={c.text} />
          <Text style={{ color: c.text, fontWeight: '700' }}>사진 찍기</Text>
        </Pressable>
        <Pressable onPress={() => addPhoto('library')} style={{ flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: radius.md, backgroundColor: c.chip }}>
          <Ionicons name="images" size={18} color={c.text} />
          <Text style={{ color: c.text, fontWeight: '700' }}>앨범에서</Text>
        </Pressable>
      </View>
    </Card>
  );
}
