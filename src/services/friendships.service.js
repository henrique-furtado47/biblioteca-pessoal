import { supabase } from './supabase'
import { profilesService } from './profiles.service'

export const friendshipsService = {
  /**
   * Estado da relação entre o usuário atual (meId) e outro (otherId).
   * @returns {'none'|'pending_outgoing'|'pending_incoming'|'friends'}
   */
  async getStatus(meId, otherId) {
    const { data, error } = await supabase
      .from('friendships')
      .select('requester_id, addressee_id, status')
      .or(
        `and(requester_id.eq.${meId},addressee_id.eq.${otherId}),and(requester_id.eq.${otherId},addressee_id.eq.${meId})`,
      )
      .maybeSingle()
    if (error) throw error
    if (!data) return 'none'
    if (data.status === 'accepted') return 'friends'
    return data.requester_id === meId ? 'pending_outgoing' : 'pending_incoming'
  },

  async sendRequest(meId, otherId) {
    const { error } = await supabase
      .from('friendships')
      .insert({ requester_id: meId, addressee_id: otherId })
    if (error && error.code !== '23505') throw error
  },

  /** Aceita o pedido recebido de otherId (otherId pediu, eu aceito). */
  async accept(meId, otherId) {
    const { error } = await supabase
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('requester_id', otherId)
      .eq('addressee_id', meId)
    if (error) throw error
  },

  /** Remove/cancela/recusa o vínculo em qualquer direção. */
  async remove(meId, otherId) {
    const { error } = await supabase
      .from('friendships')
      .delete()
      .or(
        `and(requester_id.eq.${meId},addressee_id.eq.${otherId}),and(requester_id.eq.${otherId},addressee_id.eq.${meId})`,
      )
    if (error) throw error
  },

  /** Pedidos de amizade recebidos (pendentes), já com os perfis resolvidos. */
  async incomingRequests(meId) {
    const { data, error } = await supabase
      .from('friendships')
      .select('requester_id')
      .eq('addressee_id', meId)
      .eq('status', 'pending')
    if (error) throw error
    const ids = (data ?? []).map((r) => r.requester_id)
    return profilesService.getByIds(ids)
  },

  /** Lista de amigos (vínculos aceitos), com perfis resolvidos. */
  async listFriends(meId) {
    const { data, error } = await supabase
      .from('friendships')
      .select('requester_id, addressee_id')
      .eq('status', 'accepted')
      .or(`requester_id.eq.${meId},addressee_id.eq.${meId}`)
    if (error) throw error
    const ids = (data ?? []).map((r) =>
      r.requester_id === meId ? r.addressee_id : r.requester_id,
    )
    return profilesService.getByIds(ids)
  },
}
