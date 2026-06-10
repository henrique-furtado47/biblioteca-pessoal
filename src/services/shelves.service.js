import { supabase } from './supabase'

export const shelvesService = {
  /** Pastas do usuário, na ordem definida. */
  async list(userId) {
    const { data, error } = await supabase
      .from('shelves')
      .select('*')
      .eq('user_id', userId)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true })
    if (error) throw error
    return data ?? []
  },

  async create(userId, name) {
    // nova pasta vai para o fim
    const { data: last } = await supabase
      .from('shelves')
      .select('position')
      .eq('user_id', userId)
      .order('position', { ascending: false })
      .limit(1)
      .maybeSingle()
    const position = (last?.position ?? -1) + 1

    const { data, error } = await supabase
      .from('shelves')
      .insert({ user_id: userId, name: name.trim(), position })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async rename(id, name) {
    const { data, error } = await supabase
      .from('shelves')
      .update({ name: name.trim() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async remove(id) {
    const { error } = await supabase.from('shelves').delete().eq('id', id)
    if (error) throw error
  },

  /** Persiste a nova ordem das pastas (array de ids na ordem desejada). */
  async reorder(orderedIds) {
    await Promise.all(
      orderedIds.map((id, i) =>
        supabase.from('shelves').update({ position: i }).eq('id', id),
      ),
    )
  },
}
