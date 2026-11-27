import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';

import { dataSource } from '@/data';
import { radius, space, usePalette } from '@/theme/colors';

export function useMe() {
  return useQuery({ queryKey: ['me'], queryFn: () => dataSource.community.me(), staleTime: Infinity });
}

/** 글쓰기·평가 전에 닉네임 정하기 (이메일·전화번호 없이 익명 로그인) */
export function NicknameGate({ children }: { children: ReactNode }) {
  const c = usePalette();
  const qc = useQueryClient();
  const me = useMe();
  const [nick, setNick] = useState('');
  const sign = useMutation({
    mutationFn: () => dataSource.community.signIn(nick),
    onSuccess: (m) => qc.setQueryData(['me'], m),
    onError: (e) => Alert.alert('닉네임을 정하지 못했어요', String(e instanceof Error ? e.message : e)),
  });

  if (me.data?.nickname) return <>{children}</>;
  const valid = nick.trim().length >= 2 && nick.trim().length <= 12;
  return (
    <View>
      <Text style={{ color: c.text, fontWeight: '800', fontSize: 15 }}>글을 쓰려면 닉네임을 정해 주세요</Text>
      <Text style={{ color: c.textSub, fontSize: 13, marginTop: 4 }}>이메일·전화번호 없이 닉네임만 사용해요. (2~12자)</Text>
      <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.md }}>
        <TextInput
          value={nick}
          onChangeText={setNick}
          maxLength={12}
          placeholder="예) 삼산동주민"
          placeholderTextColor={c.textSub}
          style={{ flex: 1, color: c.text, borderWidth: 1, borderColor: c.border, borderRadius: radius.md, padding: space.md, fontSize: 16 }}
          accessibilityLabel="닉네임"
        />
        <Pressable onPress={() => sign.mutate()} disabled={!valid || sign.isPending} style={{ justifyContent: 'center', paddingHorizontal: 16, borderRadius: radius.md, backgroundColor: valid ? c.primary : c.chip }}>
          <Text style={{ color: valid ? c.primaryText : c.textSub, fontWeight: '800' }}>시작</Text>
        </Pressable>
      </View>
    </View>
  );
}
