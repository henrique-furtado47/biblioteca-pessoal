import { supabase } from './supabase'
import { SORT_OPTIONS } from '@/constants'

const SELECT_WITH_AUTHOR = '*, author:authors(id, name, photo_url)'

export const booksService = {
  /**
   * Lista paginada com filtros, busca e ordenação.
   * @returns {{ items: object[], count: number }}
   */
  async list({
    userId,
    page = 1,
    pageSize = 12,
    search = '',
    status = '',
    authorId = '',
    genreId = '',
    year = '',
    minRating = '',
    favorite = null,
    sort = 'recent',
  } = {}) {
    const sortDef = SORT_OPTIONS.find((s) => s.value === sort) || SORT_OPTIONS[0]
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    // Filtrar por gênero exige join interno com a tabela N:N book_genres.
    const selectStr = genreId
      ? `${SELECT_WITH_AUTHOR}, book_genres!inner(genre_id)`
      : SELECT_WITH_AUTHOR

    let query = supabase
      .from('books')
      .select(selectStr, { count: 'exact' })
      .eq('user_id', userId)

    if (status) query = query.eq('status', status)
    if (authorId) query = query.eq('author_id', authorId)
    if (genreId) query = query.eq('book_genres.genre_id', genreId)
    if (year) query = query.eq('publication_year', year)
    if (minRating) query = query.gte('rating', minRating)
    if (favorite === true) query = query.eq('favorite', true)
    if (search) {
      const term = `%${search}%`
      query = query.or(
        `title.ilike.${term},isbn.ilike.${term},subtitle.ilike.${term},publisher.ilike.${term},description.ilike.${term}`,
      )
    }

    query = query
      .order(sortDef.column, { ascending: sortDef.ascending, nullsFirst: false })
      .range(from, to)

    const { data, error, count } = await query
    if (error) throw error
    return { items: data ?? [], count: count ?? 0 }
  },

  async getById(id, userId) {
    const { data, error } = await supabase
      .from('books')
      .select(`${SELECT_WITH_AUTHOR}, genres:book_genres(genre:genres(id, name))`)
      .eq('id', id)
      .eq('user_id', userId)
      .single()
    if (error) throw error
    return data
  },

  async create(payload) {
    const { data, error } = await supabase
      .from('books')
      .insert(payload)
      .select(SELECT_WITH_AUTHOR)
      .single()
    if (error) throw error
    return data
  },

  async update(id, payload) {
    const { data, error } = await supabase
      .from('books')
      .update(payload)
      .eq('id', id)
      .select(SELECT_WITH_AUTHOR)
      .single()
    if (error) throw error
    return data
  },

  async remove(id) {
    const { error } = await supabase.from('books').delete().eq('id', id)
    if (error) throw error
  },

  async setFavorite(id, favorite) {
    const { data, error } = await supabase
      .from('books')
      .update({ favorite })
      .eq('id', id)
      .select(SELECT_WITH_AUTHOR)
      .single()
    if (error) throw error
    return data
  },

  async setStatus(id, status) {
    const { data, error } = await supabase
      .from('books')
      .update({ status })
      .eq('id', id)
      .select(SELECT_WITH_AUTHOR)
      .single()
    if (error) throw error
    return data
  },

  /** Anos de publicação distintos na coleção do usuário (desc). */
  async years(userId) {
    const { data, error } = await supabase
      .from('books')
      .select('publication_year')
      .eq('user_id', userId)
      .not('publication_year', 'is', null)
    if (error) throw error
    const unique = [...new Set((data ?? []).map((r) => r.publication_year))]
    return unique.sort((a, b) => b - a)
  },

  /** Estatísticas agregadas (contagens por status, favoritos, etc.). */
  async stats(userId) {
    const { data, error } = await supabase
      .from('books')
      .select('status, favorite, pages, rating, finish_date, author_id')
      .eq('user_id', userId)
    if (error) throw error
    return data ?? []
  },
}
