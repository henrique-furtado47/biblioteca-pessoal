import axios from 'axios'
import { cleanIsbn } from '@/utils/validators'

// APIs externas
const google = axios.create({ baseURL: 'https://www.googleapis.com/books/v1', timeout: 12000 })
const ol = axios.create({ baseURL: 'https://openlibrary.org', timeout: 12000 })

// Cache simples em memória por ISBN (evita chamadas duplicadas)
const cache = new Map()

// Chave opcional da Google Books (aumenta a cota). Defina VITE_GOOGLE_BOOKS_API_KEY no .env
const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY || ''

// Circuit breaker: ao tomar 429 (cota), desliga a Google pelo resto da sessão
// e usa direto a Open Library.
let googleAvailable = true

function extractYear(text) {
  const m = String(text || '').match(/\d{4}/)
  return m ? Number(m[0]) : null
}

const LANG_OPTIONS = ['pt-BR', 'pt-PT', 'en', 'es', 'fr', 'de', 'it', 'ja']
const LANG_MAP = { pt: 'pt-BR', 'pt-br': 'pt-BR', 'pt-pt': 'pt-PT' }
function mapLanguage(code) {
  if (!code) return ''
  const c = String(code).toLowerCase()
  if (LANG_MAP[c]) return LANG_MAP[c]
  if (LANG_OPTIONS.includes(c)) return c
  return 'other'
}

function httpsCover(url) {
  return url ? String(url).replace(/^http:/, 'https:') : ''
}

/**
 * Serviço de busca de metadados de livros por ISBN.
 * Ordem: Google Books -> Open Library. Retorna sempre um objeto padronizado
 * (ou null se nenhuma API encontrar).
 */
export const bookLookupService = {
  async searchByISBN(isbnRaw) {
    const isbn = cleanIsbn(isbnRaw)
    if (!isbn) return null
    if (cache.has(isbn)) return cache.get(isbn)

    let result = null
    try {
      result = await this.searchGoogleBooks(isbn)
    } catch {
      // erro na Google Books: tenta o fallback
    }
    if (!result) {
      result = await this.searchOpenLibrary(isbn) // pode lançar -> tratado no chamador
    }

    cache.set(isbn, result)
    return result
  },

  async searchGoogleBooks(isbn) {
    const { data } = await google.get('/volumes', { params: { q: `isbn:${isbn}` } })
    const vi = data?.items?.[0]?.volumeInfo
    if (!vi) return null
    return this.normalizeBookData('google', vi, isbn)
  },

  async searchOpenLibrary(isbn) {
    const { data } = await ol.get('/api/books', {
      params: { bibkeys: `ISBN:${isbn}`, format: 'json', jscmd: 'data' },
    })
    const entry = data?.[`ISBN:${isbn}`]
    if (!entry) return null

    // A descrição costuma estar no "work"
    let description = ''
    try {
      const workKey = entry.works?.[0]?.key
      if (workKey) {
        const { data: work } = await ol.get(`${workKey}.json`)
        description =
          typeof work?.description === 'string' ? work.description : work?.description?.value || ''
      }
    } catch {
      // descrição é opcional
    }
    return this.normalizeBookData('openlibrary', { entry, description }, isbn)
  },

  /** Padroniza o retorno de qualquer fonte no formato do sistema. */
  normalizeBookData(source, raw, isbn) {
    if (source === 'google') {
      const vi = raw
      return {
        source: 'google',
        sourceLabel: 'Google Books',
        isbn,
        title: vi.title || '',
        subtitle: vi.subtitle || '',
        author: (vi.authors || []).join(', '),
        description: vi.description || '',
        publisher: vi.publisher || '',
        publication_year: extractYear(vi.publishedDate),
        pages: vi.pageCount || null,
        language: mapLanguage(vi.language),
        categories: vi.categories || [],
        cover_url: httpsCover(vi.imageLinks?.thumbnail || vi.imageLinks?.smallThumbnail || ''),
      }
    }

    // openlibrary
    const { entry, description } = raw
    return {
      source: 'openlibrary',
      sourceLabel: 'Open Library',
      isbn,
      title: entry.title || '',
      subtitle: entry.subtitle || '',
      author: (entry.authors || []).map((a) => a.name).join(', '),
      description: description || '',
      publisher: (entry.publishers || []).map((p) => p.name).join(', '),
      publication_year: extractYear(entry.publish_date),
      pages: entry.number_of_pages || null,
      language: '',
      categories: (entry.subjects || []).map((s) => s.name).slice(0, 6),
      cover_url: httpsCover(entry.cover?.large || entry.cover?.medium || entry.cover?.small || ''),
    }
  },
}
