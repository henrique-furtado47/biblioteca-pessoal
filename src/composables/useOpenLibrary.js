import { ref } from 'vue'
import { openLibraryService } from '@/services/openLibrary.service'
import { isValidIsbn } from '@/utils/validators'

export function useOpenLibrary() {
  const loading = ref(false)
  const error = ref('')

  async function lookup(isbn) {
    error.value = ''
    if (!isValidIsbn(isbn)) {
      error.value = 'ISBN inválido. Use 10 ou 13 dígitos.'
      return null
    }
    loading.value = true
    try {
      const result = await openLibraryService.lookupByIsbn(isbn)
      if (!result) error.value = 'Nenhum livro encontrado para este ISBN.'
      return result
    } catch (e) {
      error.value = 'Falha ao consultar a Open Library.'
      return null
    } finally {
      loading.value = false
    }
  }

  return { loading, error, lookup }
}
