import { supabase } from './supabase'

export const profilesService = {
  async getById(id) {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single()
    if (error) throw error
    return data
  },

  /** Busca perfil por username (case-insensitive). */
  async getByUsername(username) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .ilike('username', username)
      .maybeSingle()
    if (error) throw error
    return data
  },

  async update(id, payload) {
    const { data, error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  /** Verifica se um username está disponível (ignora o próprio usuário). */
  async isUsernameAvailable(username, selfId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .ilike('username', username)
      .maybeSingle()
    if (error) throw error
    return !data || data.id === selfId
  },

  /** Busca usuários por nome ou username. */
  async search(term, limit = 20) {
    const like = `%${term}%`
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .or(`username.ilike.${like},display_name.ilike.${like}`)
      .limit(limit)
    if (error) throw error
    return data ?? []
  },
}
