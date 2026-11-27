import { DEFAULT_BANNED_WORDS, maskBannedWords, maskPersonalInfo } from '@ulsan/shared';

import type { BoardComment, BoardPost, CommunitySource, ExternalPostItem, Me } from '../types';

/** 목업 커뮤니티: 앱을 켜 둔 동안만 유지되는 가짜 게시판 (실제 서버 없음) */
const ME_ID = 'mock-me';
let me: Me | null = null;
let seq = 100;
const posts = new Map<string, (BoardPost & { complexId: string })[]>();
const comments = new Map<string, BoardComment[]>();
const blocked = new Set<string>();
const delay = (ms = 200) => new Promise((r) => setTimeout(r, ms));
const clean = (t: string) => maskBannedWords(maskPersonalInfo(t), DEFAULT_BANNED_WORDS);

function seed(complexId: string) {
  if (posts.has(complexId)) return;
  posts.set(complexId, [
    { complexId, id: `${complexId}-1`, category: 'review', body: '(목업 예시 글) 3년째 살고 있어요. 지하주차장이 엘리베이터랑 바로 연결돼서 비 오는 날 편해요.', createdAt: '2026-11-10T09:00:00Z', nickname: '예시주민', authorId: 'other-1', residentVerified: true, mine: false, commentCount: 1 },
    { complexId, id: `${complexId}-2`, category: 'question', body: '(목업 예시 글) 근처 초등학교까지 아이 걸음으로 몇 분 걸리나요?', createdAt: '2026-11-18T12:30:00Z', nickname: '이사예정', authorId: 'other-2', residentVerified: false, mine: false, commentCount: 0 },
  ]);
  comments.set(`${complexId}-1`, [{ id: 'c1', body: '(목업) 저도 같은 동 살아요, 공감합니다.', createdAt: '2026-11-11T10:00:00Z', nickname: '옆동', authorId: 'other-3', mine: false }]);
}

export const mockCommunity: CommunitySource = {
  async getExternalPosts(c, provider) {
    await delay(300);
    const src = { naver_blog: '네이버 블로그', naver_cafe: '네이버 카페', kakao_blog: '다음 블로그', kakao_cafe: '다음 카페', kakao_web: '웹문서', youtube: '유튜브' }[provider];
    const base: Omit<ExternalPostItem, 'provider'>[] = [
      { title: `(예시) ${c.name} 1년 살아본 솔직 후기`, summary: '학원가가 가깝고 조용한 편. 다만 퇴근 시간 이중주차가 있어요.', url: 'https://example.com/1', date: '2026-11-02', source: `${src} 예시`, thumbnail: null },
      { title: `(예시) ${c.regionName} 임장 다녀왔어요 - ${c.name} 포함`, summary: '공원 산책로가 좋고 마트가 가까움. 언덕이 조금 있어요.', url: 'https://example.com/2', date: '2026-10-21', source: `${src} 예시`, thumbnail: null },
      { title: `(예시) ${c.name} 모델하우스 방문 체험단`, summary: '소정의 원고료를 받아 작성한 광고 글입니다.', url: 'https://example.com/3', date: '2026-09-30', source: `${src} 예시`, thumbnail: null },
    ];
    return base.map((b) => ({ ...b, provider }));
  },
  async me() {
    return me;
  },
  async signIn(nickname) {
    await delay();
    me = { userId: ME_ID, nickname: nickname.trim().slice(0, 12) };
    return me;
  },
  async listPosts(complexId) {
    await delay();
    seed(complexId);
    return (posts.get(complexId) ?? []).filter((p) => !blocked.has(p.authorId)).map(({ complexId: _c, ...p }) => ({ ...p, commentCount: (comments.get(p.id) ?? []).length }));
  },
  async createPost({ complexId, category, body, residentVerified }) {
    await delay();
    if (!me?.nickname) throw new Error('닉네임을 먼저 정해 주세요');
    seed(complexId);
    posts.get(complexId)!.unshift({ complexId, id: String(++seq), category, body: clean(body), createdAt: new Date().toISOString(), nickname: me.nickname, authorId: ME_ID, residentVerified, mine: true, commentCount: 0 });
  },
  async deletePost(id) {
    for (const [k, arr] of posts) posts.set(k, arr.filter((p) => p.id !== id || !p.mine));
  },
  async listComments(postId) {
    await delay(120);
    return (comments.get(postId) ?? []).filter((c) => !blocked.has(c.authorId));
  },
  async addComment(postId, body) {
    if (!me?.nickname) throw new Error('닉네임을 먼저 정해 주세요');
    const arr = comments.get(postId) ?? [];
    arr.push({ id: String(++seq), body: clean(body), createdAt: new Date().toISOString(), nickname: me.nickname, authorId: ME_ID, mine: true });
    comments.set(postId, arr);
  },
  async report() {
    await delay();
  },
  async block(userId) {
    blocked.add(userId);
  },
  async submitParkingReview() {
    await delay();
    if (!me?.nickname) throw new Error('닉네임을 먼저 정해 주세요');
  },
};
