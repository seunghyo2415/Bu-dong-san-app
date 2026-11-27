/**
 * 공유하기로 앱이 열릴 때 들어오는 주소(myrealestate://dataUrl=...)는 화면 주소가 아니므로
 * 홈으로 보내고, 실제 공유 내용은 ShareIntentProvider 가 받아 /share/receive 로 넘긴다.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  try {
    if (path.includes('dataUrl=')) return '/';
    return path;
  } catch {
    return '/';
  }
}
