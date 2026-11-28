import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { dataSource } from '@/data';
import { KeyboardSheet } from '@/components/ui';
import { radius, space, usePalette } from '@/theme/colors';

import { NicknameGate } from './NicknameGate';

const LABEL = ['', '매일 전쟁', '자주 힘듦', '보통', '대체로 여유', '항상 여유'];

/** 퇴근 시간(저녁) 주차 체감 1~5점 + 한줄평 */
export function ParkingReviewModal({ complexId, visible, onClose }: { complexId: string; visible: boolean; onClose: () => void }) {
  const c = usePalette();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState('');
  const save = useMutation({
    mutationFn: () => dataSource.community.submitParkingReview(complexId, score, comment.trim()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['complex-detail', complexId] });
      Alert.alert('평가를 남겼어요', dataSource.mode === 'mock' ? '(목업 모드라 저장되지 않아요)' : '고마워요!');
      onClose();
    },
    onError: (e) => Alert.alert('저장하지 못했어요', String(e instanceof Error ? e.message : e)),
  });
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardSheet onClose={onClose}>
      <View style={{ backgroundColor: c.card, padding: space.lg, paddingBottom: insets.bottom + space.lg, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, gap: space.md }}>
        <Text style={{ color: c.text, fontSize: 18, fontWeight: '800' }}>퇴근 시간 주차, 어떤가요?</Text>
        <NicknameGate>
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: space.sm }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Pressable key={i} onPress={() => setScore(i)} hitSlop={6} accessibilityLabel={`${i}점`}>
                <Ionicons name={score >= i ? 'star' : 'star-outline'} size={38} color={c.warn} />
              </Pressable>
            ))}
          </View>
          <Text style={{ color: c.textSub, textAlign: 'center', marginTop: 4 }}>{LABEL[score] || '별을 눌러 주세요'}</Text>
          <TextInput
            value={comment}
            onChangeText={setComment}
            maxLength={100}
            placeholder="한줄평 (선택, 100자) 예) 밤 9시 넘으면 지하 2층까지 내려가야 해요"
            placeholderTextColor={c.textSub}
            style={{ color: c.text, borderWidth: 1, borderColor: c.border, borderRadius: radius.md, padding: space.md, marginTop: space.md }}
          />
          <Pressable onPress={() => save.mutate()} disabled={!score || save.isPending} style={{ marginTop: space.md, paddingVertical: 14, alignItems: 'center', borderRadius: radius.md, backgroundColor: score ? c.primary : c.chip }}>
            <Text style={{ color: score ? c.primaryText : c.textSub, fontWeight: '800', fontSize: 16 }}>평가 남기기</Text>
          </Pressable>
        </NicknameGate>
      </View>
      </KeyboardSheet>
    </Modal>
  );
}
