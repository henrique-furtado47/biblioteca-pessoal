import { supabase } from './supabase'

export const authorsService = {
  async list() {
    const { data, error } = await supabase
      .from('authors')
      .select('*')
      .order('name', { ascending: true })
    if (error) throw error
    return data ?? []
  },

  async getById(id) {
    const { data, error } = await supabase.from('authors').select('*').eq('id', id).single()
    if (error) throw error
    return data
  },

  async create(payload) {
    const { data, error } = await supabase.from('authors').insert(payload).select().single()
    if (error) throw error
    return data
  },

  async update(id, payload) {
    const { data, error } = await supabase
      .from('authors')
      .update(payload)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  /** Retorna autor existente pelo nome ou cria um novo. */
  async findOrCreateByName(name) {
    const trimmed = name.trim()
    if (!trimmed) return null

    const { data: existing, error: findErr } = await supabase
      .from('authors')
      .select('*')
      .ilike('name', trimmed)
      .limit(1)
    if (findErr) throw findErr
    if (existing && existing.length) return existing[0]

    return this.create({ name: trimmed })
  },
}
