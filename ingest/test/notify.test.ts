import { describe, expect, it } from 'vitest';

import { buildMessages, chunk } from '../../supabase/functions/_shared/notify.ts';

describe('새 실거래 알림 메시지', () => {
  it('제목·내용·이동할 단지', () => {
    const [m] = buildMessages([{ token: 'ExponentPushToken[x]', complexId: 'c1', complexName: '옥동 학마을', count: 2, latestPrice: 32500, latestDate: '2026-11-20' }]);
    expect(m.title).toBe('옥동 학마을 새 실거래 2건');
    expect(m.body).toBe('최근 2026-11-20 3억 2,500만원 · 눌러서 확인');
    expect(m.data.complexId).toBe('c1');
  });
  it('100개씩 나누기', () => {
    expect(chunk(Array.from({ length: 250 }), 100).map((c) => c.length)).toEqual([100, 100, 50]);
  });
});
