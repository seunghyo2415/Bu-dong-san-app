import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Pressable } from 'react-native';

/**
 * 아래에서 올라오는 시트(모달) 틀. 키보드가 올라오면 시트도 같이 올라가 입력칸이 가려지지 않는다.
 * (안드로이드 edge-to-edge 에서도 동작하도록 두 플랫폼 모두 padding 방식)
 */
export function KeyboardSheet({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' }} onPress={onClose} accessibilityLabel="닫기" />
      {children}
    </KeyboardAvoidingView>
  );
}
