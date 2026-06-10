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

  /** Livros (entradas de estante) dentro de uma pasta, na ordem definida. */
  async shelfBooks(shelfId) {
    const { data, error } = await supabase
      .from('user_book_shelves')
      .select(`position, user_book:user_books(${SHELF_COLS}, ${bookEmbed()})`)
      .eq('shelf_id', shelfId)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true })
    if (error) throw error
    return (data ?? []).map((r) => flatten(r.user_book)).filter((b) => b.id)
  },

  /** Ids das pastas em que uma entrada de estante está. */
  async shelvesOfBook(userBookId) {
    const { data, error } = await supabase
      .from('user_book_shelves')
      .select('shelf_id')
      .eq('user_book_id', userBookId)
    if (error) throw error
    return (data ?? []).map((r) => r.shelf_id)
  },

  /** Define em quais pastas a entrada está (adiciona/remove conforme a lista). */
  async setBookShelves(userBookId, shelfIds) {
    const current = await this.shelvesOfBook(userBookId)
    const toAdd = shelfIds.filter((id) => !current.includes(id))
    const toRemove = current.filter((id) => !shelfIds.includes(id))

    if (toRemove.length) {
      const { error } = await supabase
        .from('user_book_shelves')
        .delete()
        .eq('user_book_id', userBookId)
        .in('shelf_id', toRemove)
      if (error) throw error
    }
    if (toAdd.length) {
      const rows = toAdd.map((shelf_id) => ({ shelf_id, user_book_id: userBookId }))
      const { error } = await supabase.from('user_book_shelves').insert(rows)
      if (error) throw error
    }
  },

  /** Adiciona uma entrada de estante a uma pasta (ignora se já estiver). */
  async addBookToShelf(userBookId, shelfId) {
    const { error } = await supabase
      .from('user_book_shelves')
      .insert({ shelf_id: shelfId, user_book_id: userBookId })
    if (error && error.code !== '23505') throw error
  },

  /** Persiste a ordem dos livros dentro de uma pasta. */
  async reorderShelfBooks(shelfId, orderedUserBookIds) {
    await Promise.all(
      orderedUserBookIds.map((ubId, i) =>
        supabase
          .from('user_book_shelves')
          .update({ position: i })
          .eq('shelf_id', shelfId)
          .eq('user_book_id', ubId),
      ),
    )
  },

  /** Catálogo de OBRAS compartilhadas (busca + filtros por autor/gênero/ano). */
  async catalog({ page = 1, pageSize = 24, search = '', authorId = '', genreId = '', year = '' } = {}) {
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    const genres = genreId
      ? 'genres:book_genres!inner(genre:genres(id, name))'
      : 'genres:book_genres(genre:genres(id, name))'
    let query = supabase
      .from('books')
      .select(`*, author:authors(id, name, photo_url), ${genres}`, { count: 'exact' })

    if (authorId) query = query.eq('author_id', authorId)
    if (year) query = query.eq('publication_year', year)
    if (genreId) query = query.eq('genres.genre_id', genreId)
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

  /**
   * Média e contagem de avaliações PÚBLICAS por obra (para uma lista de ids).
   * @returns { [bookId]: { avg: number, count: number } }
   */
  async ratingsForBooks(bookIds) {
    if (!bookIds.length) return {}
    const { data, error } = await supabase
      .from('user_books')
      .select('book_id, rating')
      .in('book_id', bookIds)
      .eq('review_public', true)
      .not('rating', 'is', null)
    if (error) throw error
    const agg = {}
    for (const r of data ?? []) {
      const a = agg[r.book_id] || (agg[r.book_id] = { sum: 0, count: 0 })
      a.sum += Number(r.rating)
      a.count += 1
    }
    const out = {}
    for (const [id, a] of Object.entries(agg)) out[id] = { avg: a.sum / a.count, count: a.count }
    return out
  },

  /** Anos de publicação distintos no catálogo (desc). */
  async catalogYears() {
    const { data, error } = await supabase
      .from('books')
      .select('publication_year')
      .not('publication_year', 'is', null)
    if (error) throw error
    const unique = [...new Set((data ?? []).map((r) => r.publication_year))]
    return unique.sort((a, b) => b - a)
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

  /**
   * Quem tem esta obra na estante (apenas entradas visíveis ao usuário atual,
   * conforme RLS: bibliotecas públicas, de quem você segue, ou avaliações públicas).
   * Retorna entradas com o perfil resolvido.
   */
  async readersOfBook(bookId) {
    if (!bookId) return []
    const { data, error } = await supabase
      .from('user_books')
      .select('id, user_id, status, rating')
      .eq('book_id', bookId)
    if (error) throw error
    const rows = data ?? []
    if (!rows.length) return []
    const { profilesService } = await import('./profiles.service')
    const profiles = await profilesService.getByIds([...new Set(rows.map((r) => r.user_id))])
    const pMap = Object.fromEntries(profiles.map((p) => [p.id, p]))
    return rows.map((r) => ({ ...r, profile: pMap[r.user_id] })).filter((r) => r.profile)
  },

  /** Avaliações públicas de OUTROS usuários para a mesma obra. */
  async publicReviewsByBookId(bookId, currentUserId) {
    if (!bookId) return []
    // avaliações públicas dos outros + a minha (mesmo que ainda não pública)
    const { data, error } = await supabase
      .from('user_books')
      .select('id, user_id, rating, notes, finish_date, status')
      .eq('book_id', bookId)
      .or(`review_public.eq.true,user_id.eq.${currentUserId}`)
      .not('rating', 'is', null)
      .order('finish_date', { ascending: false, nullsFirst: false })
    if (error) throw error
    return data ?? []
  },

  /** Atualiza campos da entrada de estante (notes, rating, review_public, etc.). */
  async updateShelfEntry(userBookId, patch) {
    const { error } = await supabase.from('user_books').update(patch).eq('id', userBookId)
    if (error) throw error
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
