import axios from 'axios'
import { cleanIsbn } from '@/utils/validators'

const http = axios.create({ baseURL: 'https://openlibrary.org', timeout: 12000 })

/**
 * Busca dados de um livro por ISBN na Open Library.
 * Retorna um objeto parcial pronto para preencher o formulário, ou null.
 */
export const openLibraryService = {
  async lookupByIsbn(isbnRaw) {
    const isbn = cleanIsbn(isbnRaw)
    if (!isbn) return null

    // Endpoint "jscmd=data" traz autores, capa, editora e ano de forma consolidada
    const { data } = await http.get('/api/books', {
      params: { bibkeys: `ISBN:${isbn}`, format: 'json', jscmd: 'data' },
    })

    const entry = data?.[`ISBN:${isbn}`]
    if (!entry) return null

    // Descrição costuma estar apenas no endpoint do "work"; tentamos buscar.
    let description = ''
    try {
      const workKey = entry.works?.[0]?.key
      if (workKey) {
        const { data: work } = await http.get(`${workKey}.json`)
        description =
          typeof work?.description === 'string'
            ? work.description
            : work?.description?.value || ''
      }
    } catch {
      // descrição é opcional — ignora falhas
    }

    return {
      title: entry.title || '',
      subtitle: entry.subtitle || '',
      isbn,
      author: entry.authors?.map((a) => a.name).join(', ') || '',
      publisher: entry.publishers?.map((p) => p.name).join(', ') || '',
      publication_year: entry.publish_date ? extractYear(entry.publish_date) : null,
      pages: entry.number_of_pages || null,
      cover_url: entry.cover?.large || entry.cover?.medium || entry.cover?.small || '',
      description,
    }
  },
}

function extractYear(text) {
  const m = String(text).match(/\d{4}/)
  return m ? Number(m[0]) : null
}
