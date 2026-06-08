import { supabase } from './supabase'

export const followsService = {
  async follow(followerId, followingId) {
    const { error } = await supabase
      .from('follows')
      .insert({ follower_id: followerId, following_id: followingId })
    if (error && error.code !== '23505') throw error // ignora duplicata
  },

  async unfollow(followerId, followingId) {
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', followingId)
    if (error) throw error
  },

  /** True se followerId já segue followingId. */
  async isFollowing(followerId, followingId) {
    const { data, error } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('follower_id', followerId)
      .eq('following_id', followingId)
      .maybeSingle()
    if (error) throw error
    return !!data
  },

  /** Contagens de seguidores e seguindo de um usuário. */
  async counts(userId) {
    const [followers, following] = await Promise.all([
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', userId),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId),
    ])
    if (followers.error) throw followers.error
    if (following.error) throw following.error
    return { followers: followers.count ?? 0, following: following.count ?? 0 }
  },
}
