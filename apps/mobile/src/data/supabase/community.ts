import { supabase } from './client';
import type { BoardComment, BoardPost, CommunitySource, ExternalPostItem, Me } from '../types';

/** 실제 커뮤니티: Supabase 익명 로그인 + 닉네임, 글·댓글은 RLS 로 보호 */
async function requireUser() {
  const { data } = await supabase().auth.getUser();
  if (!data.user) throw new Error('닉네임을 먼저 정해 주세요');
  return data.user;
}

const ok = <T>(r: { data: T; error: { message: string } | null }) => {
  if (r.error) throw new Error(r.error.message);
  return r.data;
};

export const supabaseCommunity: CommunitySource = {
  async getExternalPosts(c, provider, sort) {
    const { data, error } = await supabase().functions.invoke('community', {
      body: { complexId: c.id, query: `${c.name.replace(/\(.*?\)/g, '').trim()} 울산 ${c.regionName}`, provider, sort },
    });
    if (error) throw new Error('외부 글을 불러오지 못했어요');
    return (data?.items ?? []) as ExternalPostItem[];
  },
  async me() {
    const { data } = await supabase().auth.getUser();
    if (!data.user) return null;
    const p = await supabase().from('profiles').select('nickname').eq('user_id', data.user.id).maybeSingle();
    return { userId: data.user.id, nickname: p.data?.nickname ?? null } as Me;
  },
  async signIn(nickname) {
    let { data } = await supabase().auth.getUser();
    if (!data.user) {
      const r = await supabase().auth.signInAnonymously();
      if (r.error) throw new Error('로그인 실패: ' + r.error.message);
      data = { user: r.data.user! };
    }
    const nick = nickname.trim().slice(0, 12);
    const r = await supabase().from('profiles').upsert({ user_id: data.user!.id, nickname: nick });
    if (r.error) throw new Error(r.error.code === '23505' ? '이미 쓰는 닉네임이에요' : r.error.message);
    return { userId: data.user!.id, nickname: nick };
  },
  async listPosts(complexId) {
    return ok(await supabase().rpc('list_posts', { p_complex: complexId })).map((p: BoardPost) => ({ ...p, id: String(p.id) }));
  },
  async createPost({ complexId, category, body, residentVerified }) {
    await requireUser();
    ok(await supabase().from('posts').insert({ complex_id: complexId, category, body, resident_verified: residentVerified }));
  },
  async deletePost(id) {
    ok(await supabase().from('posts').delete().eq('id', Number(id)));
  },
  async listComments(postId) {
    return ok(await supabase().rpc('list_comments', { p_post: Number(postId) })).map((c: BoardComment) => ({ ...c, id: String(c.id) }));
  },
  async addComment(postId, body) {
    await requireUser();
    ok(await supabase().from('comments').insert({ post_id: Number(postId), body }));
  },
  async report(type, id, reason) {
    await requireUser();
    const r = await supabase().from('reports').insert({ target_type: type, target_id: Number(id), reason });
    if (r.error && r.error.code !== '23505') throw new Error(r.error.message); // 이미 신고함은 무시
  },
  async block(userId) {
    await requireUser();
    const r = await supabase().from('blocks').insert({ blocked_id: userId });
    if (r.error && r.error.code !== '23505') throw new Error(r.error.message);
  },
  async submitParkingReview(complexId, score, comment) {
    const u = await requireUser();
    ok(await supabase().from('parking_reviews').upsert({ complex_id: complexId, user_id: u.id, score, comment: comment || null }, { onConflict: 'complex_id,user_id' }));
  },
};
