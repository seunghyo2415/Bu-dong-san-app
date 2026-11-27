/** 관심 단지 새 실거래 → Expo 푸시 메시지 만들기 (순수 함수, 테스트 가능) */
export type Alert = { token: string; complexId: string; complexName: string; count: number; latestPrice: number; latestDate: string };
export type PushMessage = { to: string; title: string; body: string; data: { complexId: string }; sound: 'default' };

const manwon = (v: number) => {
  const eok = Math.floor(v / 10000);
  const man = v % 10000;
  return eok ? `${eok}억${man ? ` ${man.toLocaleString('ko-KR')}만` : ''}` : `${man.toLocaleString('ko-KR')}만`;
};

export function buildMessages(alerts: Alert[]): PushMessage[] {
  return alerts.map((a) => ({
    to: a.token,
    title: `${a.complexName} 새 실거래 ${a.count}건`,
    body: `최근 ${a.latestDate} ${manwon(a.latestPrice)}원 · 눌러서 확인`,
    data: { complexId: a.complexId },
    sound: 'default',
  }));
}

export function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
