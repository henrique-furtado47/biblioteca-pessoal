import { supabase } from './supabase'
import { profilesService } from './profiles.service'
import { followsService } from './follows.service'
import { friendshipsService } from './friendships.service'

export const activitiesService = {
  /**
   * Feed de atividades de quem o usuário segue + amigos (exclui o próprio).
   * @returns lista de atividades com `actor` (perfil) e `book` resolvidos.
   */
  async feed(userId, { limit = 50 } = {}) {
    const [following, friends] = await Promise.all([
      followsService.followingIds(userId),
      friendshipsService.listFriends(userId),
    ])
    const ids = [...new Set([...following, ...friends.map((f) => f.id)])].filter(
      (id) => id !== userId,
    )
    if (!ids.length) return []

    const { data, error } = await supabase
      .from('activities')
      .select('id, user_id, type, data, created_at, book:books(id, title, cover_url, author:authors(name))')
      .in('user_id', ids)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw error

    const rows = data ?? []
    const profiles = await profilesService.getByIds([...new Set(rows.map((r) => r.user_id))])
    const pMap = Object.fromEntries(profiles.map((p) => [p.id, p]))
    return rows
      .map((r) => ({ ...r, actor: pMap[r.user_id] }))
      .filter((r) => r.actor)
  },
}
