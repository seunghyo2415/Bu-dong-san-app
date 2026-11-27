import { Ionicons } from '@expo/vector-icons';
import { haversineM, isAdLikely, keywordStats, sigunguName } from '@ulsan/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import * as Location from 'expo-location';
import * as WebBrowser from 'expo-web-browser';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, TextInput, View } from 'react-native';

import { Card, Chip, SectionTitle } from '@/components/ui';
import { dataSource, type BoardPost, type ComplexDetail, type ExternalProvider, type PostCategory } from '@/data';
import { radius, space, usePalette } from '@/theme/colors';

import { useMe, NicknameGate } from './NicknameGate';

const PROVIDERS: { key: ExternalProvider; label: string }[] = [
  { key: 'naver_blog', label: '네이버 블로그' },
  { key: 'naver_cafe', label: '네이버 카페' },
  { key: 'kakao_blog', label: '다음 블로그' },
  { key: 'kakao_cafe', label: '다음 카페' },
  { key: 'kakao_web', label: '웹문서' },
  { key: 'youtube', label: '유튜브' },
];
const CATEGORY: Record<PostCategory, string> = { review: '거주 후기', pros_cons: '장단점', question: '질문' };
const community = dataSource.community;

export function CommunitySection({ d }: { d: ComplexDetail }) {
  const [tab, setTab] = useState<'outside' | 'ours'>('outside');
  return (
    <View style={{ gap: space.md }}>
      <SectionTitle title="이야기" />
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <Chip label="밖의 이야기" active={tab === 'outside'} onPress={() => setTab('outside')} />
        <Chip label="우리 앱 이야기" active={tab === 'ours'} onPress={() => setTab('ours')} />
      </View>
      {tab === 'outside' ? <Outside d={d} /> : <Board d={d} />}
    </View>
  );
}

function Outside({ d }: { d: ComplexDetail }) {
  const c = usePalette();
  const [provider, setProvider] = useState<ExternalProvider>('naver_blog');
  const [sort, setSort] = useState<'relevance' | 'date'>('relevance');
  const [hideAds, setHideAds] = useState(true);
  const q = useQuery({
    queryKey: ['external', d.id, provider, sort],
    queryFn: () => community.getExternalPosts({ id: d.id, name: d.name, regionName: sigunguName(d.sigunguCode) }, provider, sort),
    staleTime: 60 * 60 * 1000,
  });
  const items = useMemo(() => (q.data ?? []).map((x) => ({ ...x, isAd: isAdLikely(x.title, x.summary) })), [q.data]);
  const shown = hideAds ? items.filter((x) => !x.isAd) : items;
  const stats = useMemo(() => keywordStats(items.filter((x) => !x.isAd).map((x) => `${x.title} ${x.summary}`)), [items]);

  return (
    <>
      <Card>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {PROVIDERS.map((p) => (
            <Chip key={p.key} label={p.label} active={provider === p.key} onPress={() => setProvider(p.key)} />
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.sm, alignItems: 'center' }}>
          <Chip label="관련도순" active={sort === 'relevance'} onPress={() => setSort('relevance')} />
          <Chip label="최신순" active={sort === 'date'} onPress={() => setSort('date')} />
          <Pressable onPress={() => setHideAds((v) => !v)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 'auto' }} accessibilityRole="checkbox" accessibilityState={{ checked: hideAds }}>
            <Ionicons name={hideAds ? 'checkbox' : 'square-outline'} size={20} color={c.primary} />
            <Text style={{ color: c.text, fontSize: 13 }}>광고성 숨김</Text>
          </Pressable>
        </View>

        {stats.pros.length || stats.cons.length ? (
          <View style={{ marginTop: space.md, gap: 6 }}>
            <Text style={{ color: c.textSub, fontSize: 12 }}>많이 언급되는 말 (제목·요약 단어 기준, 참고용)</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {stats.pros.map((s) => (
                <Text key={s.word} style={{ color: c.good, backgroundColor: c.chip, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.pill, fontSize: 13, overflow: 'hidden' }}>
                  👍 {s.word} {s.count}
                </Text>
              ))}
              {stats.cons.map((s) => (
                <Text key={s.word} style={{ color: c.bad, backgroundColor: c.chip, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.pill, fontSize: 13, overflow: 'hidden' }}>
                  👎 {s.word} {s.count}
                </Text>
              ))}
            </View>
          </View>
        ) : null}

        {q.isPending ? (
          <ActivityIndicator color={c.primary} style={{ marginVertical: space.lg }} />
        ) : q.isError ? (
          <Text style={{ color: c.textSub, marginTop: space.md }}>글을 불러오지 못했어요. (검색 키가 아직 없을 수 있어요)</Text>
        ) : shown.length === 0 ? (
          <Text style={{ color: c.textSub, marginTop: space.md }}>관련 글이 없어요.</Text>
        ) : (
          shown.map((x) => (
            <Pressable key={x.url} onPress={() => WebBrowser.openBrowserAsync(x.url)} style={{ paddingVertical: 12, borderTopWidth: 1, borderTopColor: c.border, marginTop: space.sm }} accessibilityRole="link">
              <Text style={{ color: c.text, fontSize: 15, fontWeight: '700' }} numberOfLines={2}>
                {x.isAd ? '[광고성] ' : ''}
                {x.title}
              </Text>
              {x.summary ? (
                <Text style={{ color: c.textSub, fontSize: 13, marginTop: 2 }} numberOfLines={2}>
                  {x.summary}
                </Text>
              ) : null}
              <Text style={{ color: c.textSub, fontSize: 12, marginTop: 4 }}>
                {[x.source, x.date].filter(Boolean).join(' · ')} ›
              </Text>
            </Pressable>
          ))
        )}
        <Text style={{ color: c.textSub, fontSize: 11, marginTop: space.sm }}>제목·짧은 요약만 보여주고, 누르면 원문으로 이동해요. (각 사 공식 검색 API)</Text>
      </Card>

      <Card>
        <Text style={{ color: c.text, fontSize: 16, fontWeight: '800' }}>다른 커뮤니티 바로가기</Text>
        <Text style={{ color: c.textSub, fontSize: 13, marginTop: 4 }}>단지명이 복사돼요. 검색창에 붙여넣으세요.</Text>
        <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.md }}>
          {[
            { name: '호갱노노 단지 이야기', url: 'https://hogangnono.com' },
            { name: '네이버 부동산', url: `https://m.land.naver.com/search/result/${encodeURIComponent(d.name)}` },
          ].map((l) => (
            <Pressable
              key={l.name}
              onPress={async () => {
                await Clipboard.setStringAsync(d.name);
                WebBrowser.openBrowserAsync(l.url);
              }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 9, borderRadius: radius.pill, backgroundColor: c.chip }}>
              <Text style={{ color: c.text, fontWeight: '700' }}>{l.name}</Text>
              <Ionicons name="open-outline" size={14} color={c.textSub} />
            </Pressable>
          ))}
        </View>
      </Card>
    </>
  );
}

function Board({ d }: { d: ComplexDetail }) {
  const c = usePalette();
  const qc = useQueryClient();
  const me = useMe();
  const posts = useQuery({ queryKey: ['posts', d.id], queryFn: () => community.listPosts(d.id) });
  const [category, setCategory] = useState<PostCategory>('review');
  const [body, setBody] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () => community.createPost({ complexId: d.id, category, body: body.trim(), residentVerified: verified }),
    onSuccess: () => {
      setBody('');
      qc.invalidateQueries({ queryKey: ['posts', d.id] });
    },
    onError: (e) => Alert.alert('글을 올리지 못했어요', String(e instanceof Error ? e.message : e)),
  });

  const verify = async () => {
    if (!d.location) return;
    setVerifying(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const pos = await Location.getCurrentPositionAsync({});
      const m = haversineM({ lat: pos.coords.latitude, lng: pos.coords.longitude }, d.location);
      if (m <= 300) setVerified(true);
      else Alert.alert('단지 근처가 아니에요', `지금 위치가 단지에서 약 ${Math.round(m)}m 떨어져 있어요. 300m 안에서 확인할 수 있어요.`);
    } finally {
      setVerifying(false);
    }
  };

  const menu = (p: BoardPost) => {
    const buttons = p.mine
      ? [{ text: '삭제', style: 'destructive' as const, onPress: () => community.deletePost(p.id).then(() => qc.invalidateQueries({ queryKey: ['posts', d.id] })) }]
      : [
          { text: '신고', onPress: () => askReason((r) => community.report('post', p.id, r).then(() => Alert.alert('신고했어요', '신고가 3건 쌓이면 자동으로 가려져요.'))) },
          { text: `${p.nickname} 차단`, style: 'destructive' as const, onPress: () => community.block(p.authorId).then(() => qc.invalidateQueries({ queryKey: ['posts', d.id] })) },
        ];
    Alert.alert('글 메뉴', undefined, [...buttons, { text: '닫기', style: 'cancel' }]);
  };

  return (
    <>
      <Card>
        <NicknameGate>
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            {(Object.keys(CATEGORY) as PostCategory[]).map((k) => (
              <Chip key={k} label={CATEGORY[k]} active={category === k} onPress={() => setCategory(k)} />
            ))}
          </View>
          <TextInput
            value={body}
            onChangeText={setBody}
            multiline
            maxLength={2000}
            placeholder={`${d.name} 이야기를 남겨 주세요. 전화번호 등 개인정보는 자동으로 가려져요.`}
            placeholderTextColor={c.textSub}
            style={{ color: c.text, fontSize: 15, minHeight: 90, borderWidth: 1, borderColor: c.border, borderRadius: radius.md, padding: space.md, marginTop: space.md, textAlignVertical: 'top' }}
          />
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: space.sm, gap: space.sm }}>
            <Pressable onPress={verify} disabled={verified || verifying} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              {verifying ? <ActivityIndicator color={c.primary} /> : <Ionicons name={verified ? 'shield-checkmark' : 'shield-outline'} size={18} color={verified ? c.good : c.textSub} />}
              <Text style={{ color: verified ? c.good : c.textSub, fontSize: 13 }}>{verified ? '거주 위치 확인됨' : '거주자 확인(선택, 300m 안)'}</Text>
            </Pressable>
            <Pressable
              onPress={() => create.mutate()}
              disabled={body.trim().length < 2 || create.isPending}
              style={{ marginLeft: 'auto', backgroundColor: body.trim().length >= 2 ? c.primary : c.chip, paddingHorizontal: 18, paddingVertical: 10, borderRadius: radius.md }}>
              <Text style={{ color: body.trim().length >= 2 ? c.primaryText : c.textSub, fontWeight: '800' }}>{create.isPending ? '올리는 중' : '올리기'}</Text>
            </Pressable>
          </View>
        </NicknameGate>
      </Card>

      {posts.isPending ? (
        <ActivityIndicator color={c.primary} />
      ) : (posts.data ?? []).length === 0 ? (
        <Card>
          <Text style={{ color: c.textSub }}>아직 글이 없어요. 첫 이야기를 남겨 주세요.</Text>
        </Card>
      ) : (
        posts.data!.map((p) => (
          <Card key={p.id}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ color: c.primary, fontSize: 12, fontWeight: '800' }}>{CATEGORY[p.category]}</Text>
              <Text style={{ color: c.text, fontWeight: '700' }}>{p.nickname}</Text>
              {p.residentVerified ? <Ionicons name="shield-checkmark" size={14} color={c.good} accessibilityLabel="거주 위치 확인" /> : null}
              <Text style={{ color: c.textSub, fontSize: 12 }}>{new Date(p.createdAt).toLocaleDateString('ko-KR')}</Text>
              <Pressable onPress={() => menu(p)} hitSlop={10} style={{ marginLeft: 'auto' }} accessibilityLabel="글 메뉴">
                <Ionicons name="ellipsis-horizontal" size={18} color={c.textSub} />
              </Pressable>
            </View>
            <Text style={{ color: c.text, fontSize: 15, lineHeight: 22, marginTop: space.sm }}>{p.body}</Text>
            <Pressable onPress={() => setOpen(open === p.id ? null : p.id)} style={{ marginTop: space.sm }}>
              <Text style={{ color: c.textSub, fontSize: 13 }}>💬 댓글 {p.commentCount}</Text>
            </Pressable>
            {open === p.id ? <Comments postId={p.id} complexId={d.id} /> : null}
          </Card>
        ))
      )}
      <Text style={{ color: c.textSub, fontSize: 11 }}>욕설·광고·개인정보는 신고해 주세요. 신고 3건이면 자동으로 가려지고 운영자가 확인해요.</Text>
    </>
  );
}

function askReason(cb: (reason: string) => void) {
  Alert.alert('신고 사유', undefined, [
    { text: '욕설·비방', onPress: () => cb('욕설·비방') },
    { text: '광고·홍보', onPress: () => cb('광고·홍보') },
    { text: '개인정보 노출', onPress: () => cb('개인정보 노출') },
    { text: '취소', style: 'cancel' },
  ]);
}

function Comments({ postId, complexId }: { postId: string; complexId: string }) {
  const c = usePalette();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['comments', postId], queryFn: () => community.listComments(postId) });
  const [text, setText] = useState('');
  const add = useMutation({
    mutationFn: () => community.addComment(postId, text.trim()),
    onSuccess: () => {
      setText('');
      qc.invalidateQueries({ queryKey: ['comments', postId] });
      qc.invalidateQueries({ queryKey: ['posts', complexId] });
    },
    onError: (e) => Alert.alert('댓글을 달지 못했어요', String(e instanceof Error ? e.message : e)),
  });
  return (
    <View style={{ marginTop: space.sm, borderTopWidth: 1, borderTopColor: c.border, paddingTop: space.sm, gap: 6 }}>
      {(q.data ?? []).map((cm) => (
        <Pressable
          key={cm.id}
          onLongPress={() => !cm.mine && askReason((r) => community.report('comment', cm.id, r))}
          accessibilityHint="길게 누르면 신고">
          <Text style={{ color: c.text, fontSize: 14 }}>
            <Text style={{ fontWeight: '700' }}>{cm.nickname}</Text> {cm.body}
          </Text>
        </Pressable>
      ))}
      <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
        <TextInput value={text} onChangeText={setText} placeholder="댓글" placeholderTextColor={c.textSub} maxLength={1000} style={{ flex: 1, color: c.text, borderWidth: 1, borderColor: c.border, borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: 8 }} />
        <Pressable onPress={() => add.mutate()} disabled={!text.trim()} hitSlop={8} accessibilityLabel="댓글 달기">
          <Ionicons name="send" size={20} color={text.trim() ? c.primary : c.textSub} />
        </Pressable>
      </View>
    </View>
  );
}
