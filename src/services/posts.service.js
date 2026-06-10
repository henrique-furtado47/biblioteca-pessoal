import { supabase } from './supabase'
import { profilesService } from './profiles.service'
import { followsService } from './follows.service'
import { friendshipsService } from './friendships.service'

const POST_SELECT =
  'id, user_id, caption, kind, visibility, book_id, user_book_id, rating, status, created_at, book:books(id, title, cover_url, author:authors(name))'

/** Anexa autor, contagens de curtida/comentário e se EU curti. */
async function enrich(rows, meId) {
  if (!rows.length) return []
  const ids = rows.map((r) => r.id)
  const userIds = [...new Set(rows.map((r) => r.user_id))]
  const [profiles, likes, comments] = await Promise.all([
    profilesService.getByIds(userIds),
    supabase.from('post_likes').select('post_id, user_id').in('post_id', ids),
    supabase.from('post_comments').select('post_id').in('post_id', ids),
  ])
  const pMap = Object.fromEntries(profiles.map((p) => [p.id, p]))
  const likeRows = likes.data ?? []
  const commentRows = comments.data ?? []
  return rows.map((r) => {
    const myLikes = likeRows.filter((l) => l.post_id === r.id)
    return {
      ...r,
      author: pMap[r.user_id] || null,
      like_count: myLikes.length,
      liked: myLikes.some((l) => l.user_id === meId),
      comment_count: commentRows.filter((c) => c.post_id === r.id).length,
    }
  })
}

export const postsService = {
  async create({ userId, caption, kind = 'text', visibility = 'public', bookId = null, userBookId = null, rating = null, status = null }) {
    const { data, error } = await supabase
      .from('posts')
      .insert({
        user_id: userId,
        caption: caption?.trim() || null,
        kind,
        visibility,
        book_id: bookId,
        user_book_id: userBookId,
        rating,
        status,
      })
      .select('id')
      .single()
    if (error) throw error
    return data.id
  },

  async remove(id) {
    const { error } = await supabase.from('posts').delete().eq('id', id)
    if (error) throw error
  },

  /**
   * Feed por escopo:
   *  - 'following' (padrão): eu + quem sigo
   *  - 'friends': eu + amigos
   *  - 'public': publicações públicas de qualquer pessoa (descoberta)
   * A RLS ainda garante que você só veja o que tem permissão.
   */
  async feed(userId, { scope = 'following', limit = 50 } = {}) {
    let query = supabase
      .from('posts')
      .select(POST_SELECT)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (scope === 'public') {
      query = query.eq('visibility', 'public')
    } else if (scope === 'friends') {
      const friends = await friendshipsService.listFriends(userId)
      query = query.in('user_id', [userId, ...friends.map((f) => f.id)])
    } else {
      const following = await followsService.followingIds(userId)
      query = query.in('user_id', [userId, ...following])
    }

    const { data, error } = await query
    if (error) throw error
    return enrich(data ?? [], userId)
  },

  /** Publicações de um usuário (para a aba do perfil; sujeito à RLS). */
  async byUser(userId, meId) {
    const { data, error } = await supabase
      .from('posts')
      .select(POST_SELECT)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return enrich(data ?? [], meId)
  },

  async toggleLike(postId, userId, liked) {
    if (liked) {
      const { error } = await supabase
        .from('post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', userId)
      if (error) throw error
    } else {
      const { error } = await supabase
        .from('post_likes')
        .insert({ post_id: postId, user_id: userId })
      if (error && error.code !== '23505') throw error
    }
  },

  /** Mapa userBookId -> {postId, likeCount, liked, commentCount} para avaliações. */
  async reviewPostsMap(userBookIds, meId) {
    if (!userBookIds.length) return {}
    const { data: posts, error } = await supabase
      .from('posts')
      .select('id, user_book_id')
      .in('user_book_id', userBookIds)
    if (error) throw error
    const map = {}
    const postIds = (posts ?? []).map((p) => p.id)
    let likeRows = []
    let commentRows = []
    if (postIds.length) {
      const [l, c] = await Promise.all([
        supabase.from('post_likes').select('post_id, user_id').in('post_id', postIds),
        supabase.from('post_comments').select('post_id').in('post_id', postIds),
      ])
      likeRows = l.data ?? []
      commentRows = c.data ?? []
    }
    for (const p of posts ?? []) {
      const lk = likeRows.filter((x) => x.post_id === p.id)
      map[p.user_book_id] = {
        postId: p.id,
        likeCount: lk.length,
        liked: lk.some((x) => x.user_id === meId),
        commentCount: commentRows.filter((x) => x.post_id === p.id).length,
      }
    }
    return map
  },

  async listComments(postId, meId) {
    const { data, error } = await supabase
      .from('post_comments')
      .select('id, user_id, body, parent_id, created_at')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
    if (error) throw error
    const rows = data ?? []
    const commentIds = rows.map((r) => r.id)
    const [profiles, likes] = await Promise.all([
      profilesService.getByIds([...new Set(rows.map((r) => r.user_id))]),
      commentIds.length
        ? supabase.from('comment_likes').select('comment_id, user_id').in('comment_id', commentIds)
        : Promise.resolve({ data: [] }),
    ])
    const pMap = Object.fromEntries(profiles.map((p) => [p.id, p]))
    const likeRows = likes.data ?? []
    return rows.map((r) => {
      const lk = likeRows.filter((l) => l.comment_id === r.id)
      return {
        ...r,
        author: pMap[r.user_id] || null,
        like_count: lk.length,
        liked: lk.some((l) => l.user_id === meId),
      }
    })
  },

  async toggleCommentLike(commentId, userId, liked) {
    if (liked) {
      const { error } = await supabase
        .from('comment_likes')
        .delete()
        .eq('comment_id', commentId)
        .eq('user_id', userId)
      if (error) throw error
    } else {
      const { error } = await supabase
        .from('comment_likes')
        .insert({ comment_id: commentId, user_id: userId })
      if (error && error.code !== '23505') throw error
    }
  },

  async addComment(postId, userId, body, parentId = null) {
    const { data, error } = await supabase
      .from('post_comments')
      .insert({ post_id: postId, user_id: userId, body: body.trim(), parent_id: parentId })
      .select('id, user_id, body, parent_id, created_at')
      .single()
    if (error) throw error
    return data
  },

  async removeComment(id) {
    const { error } = await supabase.from('post_comments').delete().eq('id', id)
    if (error) throw error
  },
}
