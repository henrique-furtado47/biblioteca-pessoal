import { ref } from 'vue'
import { bookLookupService } from '@/services/bookLookupService'
import { isValidIsbn } from '@/utils/validators'

export function useBookLookup() {
  const loading = ref(false)
  const error = ref('')
  const source = ref('') // rótulo da fonte (ex: "Google Books")

  async function lookup(isbn) {
    error.value = ''
    source.value = ''
    if (!isValidIsbn(isbn)) {
      error.value = 'ISBN inválido. Use 10 ou 13 dígitos.'
      return null
    }
    loading.value = true
    try {
      const result = await bookLookupService.searchByISBN(isbn)
      if (!result) {
        error.value = 'Livro não encontrado. Preencha os dados manualmente.'
        return null
      }
      source.value = result.sourceLabel
      return result
    } catch (e) {
      error.value =
        e?.code === 'ECONNABORTED'
          ? 'Tempo de consulta esgotado. Tente novamente.'
          : 'Erro de conexão ao buscar o ISBN. Tente novamente.'
      return null
    } finally {
      loading.value = false
    }
  }

  return { loading, error, source, lookup }
}
