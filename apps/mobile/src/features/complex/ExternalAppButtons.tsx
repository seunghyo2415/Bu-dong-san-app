import { Ionicons } from '@expo/vector-icons';
import { detectExternalLink, EXTERNAL_APPS, externalSearchUrl, type ExternalApp } from '@ulsan/shared';
import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Alert, Linking, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { ComplexDetail } from '@/data';
import { useAppStore } from '@/stores/app-store';
import { radius, space, usePalette } from '@/theme/colors';

/**
 * 네이버페이 부동산·호갱노노로 바로 가기.
 * 한 번 연결해 두면(그 앱에서 단지를 공유 → 이 앱) 다음부터 그 단지 화면이 바로 열린다.
 * 링크로만 연결하고, 다른 서비스의 정보를 가져오지 않는다.
 */
export function ExternalAppButtons({ d }: { d: ComplexDetail }) {
  const links = useAppStore((s) => s.externalLinks[d.id]);
  const [guide, setGuide] = useState<ExternalApp | null>(null);

  const open = async (app: ExternalApp) => {
    const saved = links?.[app];
    if (saved) {
      Linking.openURL(saved).catch(() => Alert.alert('열지 못했어요', '앱이 설치돼 있는지 확인해 주세요.'));
      return;
    }
    setGuide(app);
  };

  return (
    <View style={{ flexDirection: 'row', gap: space.sm }}>
      {(['naver', 'hogangnono'] as const).map((app) => {
        const linked = !!links?.[app];
        return (
          <Pressable
            key={app}
            onPress={() => open(app)}
            onLongPress={() => setGuide(app)}
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: radius.md, backgroundColor: app === 'naver' ? '#03C75A' : '#3B5BDB' }}
            accessibilityRole="link"
            accessibilityHint={linked ? '연결된 단지 화면을 엽니다. 길게 누르면 연결을 바꿉니다' : '이름으로 검색합니다'}>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>{EXTERNAL_APPS[app].label}</Text>
            <Ionicons name={linked ? 'flash' : 'search'} size={14} color="#fff" />
          </Pressable>
        );
      })}
      <LinkGuide d={d} app={guide} onClose={() => setGuide(null)} />
    </View>
  );
}

function LinkGuide({ d, app, onClose }: { d: ComplexDetail; app: ExternalApp | null; onClose: () => void }) {
  const c = usePalette();
  const insets = useSafeAreaInsets();
  const saved = useAppStore((s) => (app ? s.externalLinks[d.id]?.[app] : undefined));
  const setLink = useAppStore((s) => s.setExternalLink);
  const [paste, setPaste] = useState('');
  if (!app) return null;
  const label = EXTERNAL_APPS[app].label;

  const savePaste = () => {
    const found = detectExternalLink(paste);
    if (!found || found.app !== app) return Alert.alert('링크가 아니에요', `${label} 앱에서 '공유 → 링크 복사'한 주소를 붙여넣어 주세요.`);
    setLink(d.id, app, found.url);
    setPaste('');
    onClose();
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' }} onPress={onClose} />
      <View style={{ backgroundColor: c.card, padding: space.lg, paddingBottom: insets.bottom + space.lg, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, gap: space.md }}>
        <Text style={{ color: c.text, fontSize: 18, fontWeight: '800' }}>{label}에서 바로 열기</Text>
        <Text style={{ color: c.text, fontSize: 15, lineHeight: 23 }}>
          {`① 아래 버튼으로 ${label}을(를) 열어 「${d.name}」을 찾아요 (이름은 복사돼 있어요)\n② 그 단지 화면에서 공유 → 「내가 만든 부동산 앱」 선택\n③ 다음부터는 버튼 한 번에 그 단지 화면이 바로 열려요`}
        </Text>
        <Pressable
          onPress={async () => {
            await Clipboard.setStringAsync(d.name);
            Linking.openURL(externalSearchUrl(app, d.name));
          }}
          style={{ paddingVertical: 13, borderRadius: radius.md, alignItems: 'center', backgroundColor: c.primary }}>
          <Text style={{ color: c.primaryText, fontWeight: '800', fontSize: 16 }}>{label}에서 찾기</Text>
        </Pressable>
        <Text style={{ color: c.textSub, fontSize: 13 }}>또는 그 앱에서 복사한 링크를 붙여넣기</Text>
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <TextInput value={paste} onChangeText={setPaste} placeholder="https://…" placeholderTextColor={c.textSub} autoCapitalize="none" style={{ flex: 1, color: c.text, borderWidth: 1, borderColor: c.border, borderRadius: radius.md, padding: space.md }} />
          <Pressable onPress={savePaste} style={{ justifyContent: 'center', paddingHorizontal: 16, borderRadius: radius.md, backgroundColor: c.chip }}>
            <Text style={{ color: c.text, fontWeight: '800' }}>연결</Text>
          </Pressable>
        </View>
        {saved ? (
          <Pressable onPress={() => { setLink(d.id, app, null); onClose(); }}>
            <Text style={{ color: c.bad, fontWeight: '700' }}>연결 지우기</Text>
          </Pressable>
        ) : null}
      </View>
    </Modal>
  );
}
