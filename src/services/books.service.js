import { supabase } from './supabase'
import { genresService } from './genres.service'
import { SORT_OPTIONS } from '@/constants'

// Embed da OBRA (catálogo) + autor + gêneros. inner: força join (p/ filtrar por
// campos da obra). genreInner: junta book_genres p/ filtrar por gênero.
function bookEmbed({ inner = false, genreInner = false } = {}) {
  const join = inner ? '!inner' : ''
  const genres = genreInner
    ? 'genres:book_genres!inner(genre:genres(id, name))'
    : 'genres:book_genres(genre:genres(id, name))'
  return `book:books${join}(*, author:authors(id, name, photo_url), ${genres})`
}

const SHELF_COLS =
  'id, user_id, status, rating, favorite, notes, review_public, start_date, finish_date, created_at'

/** Achata { ...user_book, book:{...} } no formato plano usado pelas telas. */
function flatten(ub) {
  const book = ub.book || {}
  return {
    ...book,
    id: ub.id, // id da ENTRADA de estante (usado em rotas e ações)
    book_id: book.id ?? ub.book_id,
    user_id: ub.user_id,
    status: ub.status,
    rating: ub.rating,
    favorite: ub.favorite,
    notes: ub.notes,
    review_public: ub.review_public,
    start_date: ub.start_date,
    finish_date: ub.finish_date,
    created_at: ub.created_at,
  }
}

const BOOK_META_FIELDS = [
  'title',
  'subtitle',
  'isbn',
  'description',
  'publisher',
  'publication_year',
  'pages',
  'language',
  'cover_url',
]

export const booksService = {
  /**
   * Lista paginada da ESTANTE do usuário (user_books) com filtros e busca.
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

    const select = `${SHELF_COLS}, ${bookEmbed({ inner: true, genreInner: !!genreId })}`
    let query = supabase
      .from('user_books')
      .select(select, { count: 'exact' })
      .eq('user_id', userId)

    // filtros na estante
    if (status) query = query.eq('status', status)
    if (favorite === true) query = query.eq('favorite', true)
    if (minRating) query = query.gte('rating', minRating)
    // filtros na obra
    if (authorId) query = query.eq('book.author_id', authorId)
    if (year) query = query.eq('book.publication_year', year)
    if (genreId) query = query.eq('book.genres.genre_id', genreId)
    if (search) {
      const term = `%${search}%`
      query = query.or(
        `title.ilike.${term},isbn.ilike.${term},subtitle.ilike.${term},publisher.ilike.${term},description.ilike.${term}`,
        { referencedTable: 'book' },
      )
    }

    // ordenação: título é da obra; demais (created_at, rating) são da estante
    if (sortDef.column === 'title') {
      query = query.order('title', { referencedTable: 'book', ascending: sortDef.ascending })
    } else {
      query = query.order(sortDef.column, { ascending: sortDef.ascending, nullsFirst: false })
    }

    query = query.range(from, to)

    const { data, error, count } = await query
    if (error) throw error
    return { items: (data ?? []).map(flatten), count: count ?? 0 }
  },

  /** Carrega uma entrada de estante pelo id (sujeito à RLS). */
  async getById(id) {
    const { data, error } = await supabase
      .from('user_books')
      .select(`${SHELF_COLS}, ${bookEmbed()}`)
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    return data ? flatten(data) : null
  },

  /** Encontra uma obra por ISBN ou cria uma nova. */
  async findOrCreateBook(meta, authorId) {
    const payload = {}
    for (const f of BOOK_META_FIELDS) if (meta[f] !== undefined) payload[f] = meta[f]
    payload.author_id = authorId ?? null

    if (payload.isbn) {
      const { data: existing, error } = await supabase
        .from('books')
        .select('id')
        .eq('isbn', payload.isbn)
        .maybeSingle()
      if (error) throw error
      if (existing) return { id: existing.id, created: false }
    }

    const { data, error } = await supabase.from('books').insert(payload).select('id').single()
    if (error) throw error
    return { id: data.id, created: true }
  },

  /**
   * Adiciona uma obra à estante do usuário (cria a obra no catálogo se preciso).
   * @returns entrada de estante achatada
   */
  async addToShelf({ userId, meta, authorId, genreIds = [], shelf = {} }) {
    const { id: bookId, created } = await this.findOrCreateBook(meta, authorId)
    // Só define gêneros se a obra foi criada agora (não sobrescreve catálogo alheio)
    if (created && genreIds.length) await genresService.setBookGenres(bookId, genreIds)

    const { data, error } = await supabase
      .from('user_books')
      .insert({ user_id: userId, book_id: bookId, ...shelf })
      .select('id')
      .single()
    if (error) {
      if (error.code === '23505') throw new Error('DUPLICATE_SHELF')
      throw error
    }
    return this.getById(data.id)
  },

  /** Atualiza a obra (catálogo) e a entrada de estante. */
  async update(id, { meta, authorId, genreIds, shelf = {} }) {
    const { data: ub, error: e0 } = await supabase
      .from('user_books')
      .select('book_id')
      .eq('id', id)
      .single()
    if (e0) throw e0

    if (meta) {
      const payload = {}
      for (const f of BOOK_META_FIELDS) if (meta[f] !== undefined) payload[f] = meta[f]
      payload.author_id = authorId ?? null
      const { error } = await supabase.from('books').update(payload).eq('id', ub.book_id)
      if (error) throw error
    }
    if (genreIds) await genresService.setBookGenres(ub.book_id, genreIds)

    const { error } = await supabase.from('user_books').update(shelf).eq('id', id)
    if (error) throw error
    return this.getById(id)
  },

  async remove(id) {
    const { error } = await supabase.from('user_books').delete().eq('id', id)
    if (error) throw error
  },

  async setFavorite(id, favorite) {
    const { error } = await supabase.from('user_books').update({ favorite }).eq('id', id)
    if (error) throw error
    return { id, favorite }
  },

  async setStatus(id, status) {
    const { error } = await supabase.from('user_books').update({ status }).eq('id', id)
    if (error) throw error
    return { id, status }
  },

  /** Catálogo de OBRAS compartilhadas (busca por título/ISBN). */
  async catalog({ page = 1, pageSize = 24, search = '' } = {}) {
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    let query = supabase
      .from('books')
      .select(
        '*, author:authors(id, name, photo_url), genres:book_genres(genre:genres(id, name))',
        { count: 'exact' },
      )
    if (search) {
      const term = `%${search}%`
      query = query.or(`title.ilike.${term},isbn.ilike.${term},subtitle.ilike.${term}`)
    }
    query = query.order('title', { ascending: true }).range(from, to)
    const { data, error, count } = await query
    if (error) throw error
    // book_id = id para reuso do BookCard em modo "página da obra"
    const items = (data ?? []).map((b) => ({ ...b, book_id: b.id }))
    return { items, count: count ?? 0 }
  },

  /** Uma OBRA do catálogo pelo id. */
  async getBookPage(bookId) {
    const { data, error } = await supabase
      .from('books')
      .select('*, author:authors(id, name, photo_url), genres:book_genres(genre:genres(id, name))')
      .eq('id', bookId)
      .maybeSingle()
    if (error) throw error
    return data
  },

  /** Id da entrada de estante do usuário para uma obra (ou null). */
  async myEntryForBook(userId, bookId) {
    const { data, error } = await supabase
      .from('user_books')
      .select('id, status, rating')
      .eq('user_id', userId)
      .eq('book_id', bookId)
      .maybeSingle()
    if (error) throw error
    return data
  },

  /** Adiciona uma obra existente à estante (sem reentrar metadados). */
  async addExisting(userId, bookId, shelf = {}) {
    const { data, error } = await supabase
      .from('user_books')
      .insert({ user_id: userId, book_id: bookId, ...shelf })
      .select('id')
      .single()
    if (error) {
      if (error.code === '23505') throw new Error('DUPLICATE_SHELF')
      throw error
    }
    return data.id
  },

  /** Avaliações públicas de OUTROS usuários para a mesma obra. */
  async publicReviewsByBookId(bookId, excludeUserId) {
    if (!bookId) return []
    const { data, error } = await supabase
      .from('user_books')
      .select('id, user_id, rating, notes, finish_date, status')
      .eq('book_id', bookId)
      .eq('review_public', true)
      .neq('user_id', excludeUserId)
      .not('rating', 'is', null)
      .order('finish_date', { ascending: false, nullsFirst: false })
    if (error) throw error
    return data ?? []
  },

  /** Anos de publicação distintos na estante do usuário (desc). */
  async years(userId) {
    const { data, error } = await supabase
      .from('user_books')
      .select('book:books(publication_year)')
      .eq('user_id', userId)
    if (error) throw error
    const unique = [
      ...new Set((data ?? []).map((r) => r.book?.publication_year).filter((y) => y != null)),
    ]
    return unique.sort((a, b) => b - a)
  },

  /** Dados agregados para estatísticas (estante + metadados da obra). */
  async stats(userId) {
    const { data, error } = await supabase
      .from('user_books')
      .select(
        'status, favorite, rating, finish_date, book:books(pages, publication_year, author:authors(id, name), genres:book_genres(genre:genres(id, name)))',
      )
      .eq('user_id', userId)
    if (error) throw error
    return (data ?? []).map((ub) => ({
      status: ub.status,
      favorite: ub.favorite,
      rating: ub.rating,
      finish_date: ub.finish_date,
      pages: ub.book?.pages ?? null,
      publication_year: ub.book?.publication_year ?? null,
      author: ub.book?.author ?? null,
      genres: ub.book?.genres ?? [],
    }))
  },
}
