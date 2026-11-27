import { extractOgTags, isOgAllowed } from '@ulsan/shared';

/**
 * 공유 링크의 공개 미리보기(OG 태그: 제목·설명·이미지)만 읽는다.
 * - 허용된 사이트(당근)만, 사용자가 공유한 단건만, 6초 제한, 본문은 저장하지 않음
 * - 휴대폰에서 직접 읽음 (사용자가 방금 보던 공개 페이지)
 */
export async function fetchLinkPreview(url: string): Promise<{ title: string | null; description: string | null; image: string | null } | null> {
  if (!isOgAllowed(url)) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 6000);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'text/html' }, redirect: 'follow' });
    if (!res.ok) return null;
    const html = (await res.text()).slice(0, 300_000);
    return extractOgTags(html);
  } catch {
    return null; // 실패해도 앱은 계속 (다음 단계: 후보 직접 선택)
  } finally {
    clearTimeout(timer);
  }
}
