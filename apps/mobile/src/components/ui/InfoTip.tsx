import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { radius, space, usePalette } from '@/theme/colors';

/** 어려운 용어 설명. 키를 추가하면 어디서든 <InfoTip term="..."/> 로 쓸 수 있다. */
export const GLOSSARY = {
  전세가율: '전세 보증금이 매매가의 몇 %인지 나타내요. 높을수록 매매가와 전세가 차이(갭)가 작아요. 너무 높으면(80%↑) 집값이 내려갈 때 보증금을 돌려받기 어려울 수 있어 주의가 필요해요.',
  세대당주차: '총 주차대수 ÷ 세대수예요. 1.5대 이상이면 여유, 1.0~1.5대는 보통, 1.0대 미만이면 부족한 편으로 표시해요. 실제 체감은 방문차량·2대 보유 세대 비율에 따라 달라요.',
  자주식기계식: '자주식: 운전자가 직접 주차면에 대는 방식.\n기계식: 리프트·회전식 기계에 차를 올려 보관하는 방식. 대기 시간이 있고 큰 차(SUV)는 못 들어가는 경우가 많아요.',
  옥내옥외: '옥내: 지붕이 있는 주차장(아파트는 대부분 지하주차장).\n옥외: 지상 주차장.',
  전용면적: '현관문 안쪽, 우리 집만 쓰는 면적이에요. 실거래가 신고 기준이에요. 흔히 말하는 "33평형"은 공급면적(전용+계단·복도 등) 기준이라 전용면적보다 커요.',
  평당가: '전용면적 1평(3.3㎡)당 가격이에요. 크기가 다른 집끼리 가격을 비교할 때 써요.',
  직거래: '공인중개사 없이 사고판 거래예요. 가족 간 거래 등이 섞여 있어 시세보다 낮거나 높을 수 있어요.',
  해제: '계약 후 취소된 거래예요. 시세 통계(최고가·중간값)에서는 빼고 계산해요.',
  출처차이: '공동주택 관리정보(K-apt)와 건축물대장은 집계 시점과 방식이 달라 주차대수가 다를 수 있어요. 차이가 10% 이상이면 표시해요. 정확한 값은 관리사무소에 확인하세요.',
  최고가대비: '같은 평형 역대 최고 거래가와 비교해 지금 가격이 몇 % 수준인지예요.',
} as const;

export type GlossaryTerm = keyof typeof GLOSSARY;

export function InfoTip({ term, label }: { term: GlossaryTerm; label?: string }) {
  const c = usePalette();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable onPress={() => setOpen(true)} hitSlop={10} accessibilityRole="button" accessibilityLabel={`${label ?? term} 설명 보기`}>
        <Ionicons name="information-circle-outline" size={18} color={c.textSub} />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={[styles.box, { backgroundColor: c.card }]}>
            <Text style={{ color: c.text, fontSize: 17, fontWeight: '800', marginBottom: space.sm }}>{label ?? term}</Text>
            <Text style={{ color: c.text, fontSize: 15, lineHeight: 23 }}>{GLOSSARY[term]}</Text>
            <Text style={{ color: c.primary, fontWeight: '700', marginTop: space.lg, textAlign: 'right' }}>닫기</Text>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: space.xl },
  box: { padding: space.xl, borderRadius: radius.lg },
});
