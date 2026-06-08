import { supabase } from './supabase'

export const genresService = {
  async list() {
    const { data, error } = await supabase
      .from('genres')
      .select('*')
      .order('name', { ascending: true })
    if (error) throw error
    return data ?? []
  },

  /** Substitui o conjunto de gêneros de um livro. */
  async setBookGenres(bookId, genreIds = []) {
    const { error: delErr } = await supabase
      .from('book_genres')
      .delete()
      .eq('book_id', bookId)
    if (delErr) throw delErr

    if (!genreIds.length) return
    const rows = genreIds.map((genre_id) => ({ book_id: bookId, genre_id }))
    const { error } = await supabase.from('book_genres').insert(rows)
    if (error) throw error
  },
}
