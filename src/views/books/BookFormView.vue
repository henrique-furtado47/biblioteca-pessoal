<script setup>
import { onMounted, ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useBooksStore } from '@/stores/books.store'
import { useAuthorsStore } from '@/stores/authors.store'
import { booksService } from '@/services/books.service'
import { useToast } from '@/composables/useToast'
import BookForm from '@/components/books/BookForm.vue'
import Skeleton from '@/components/ui/Skeleton.vue'

const route = useRoute()
const router = useRouter()
const books = useBooksStore()
const authorsStore = useAuthorsStore()
const toast = useToast()

const isEdit = computed(() => route.name === 'book-edit')
const submitting = ref(false)
const loading = ref(false)
const model = ref({})
const authorName = ref('')
const genreIds = ref([])

onMounted(async () => {
  if (isEdit.value) {
    loading.value = true
    try {
      const book = await booksService.getById(route.params.id)
      if (!book) throw new Error('not found')
      authorName.value = book.author?.name || ''
      genreIds.value = (book.genres || []).map((g) => g.genre?.id).filter(Boolean)
      model.value = {
        title: book.title,
        subtitle: book.subtitle || '',
        isbn: book.isbn || '',
        publisher: book.publisher || '',
        publication_year: book.publication_year,
        pages: book.pages,
        language: book.language || 'pt-BR',
        description: book.description || '',
        status: book.status,
        rating: Number(book.rating) || 0,
        favorite: book.favorite,
        review_public: book.review_public,
        notes: book.notes || '',
        cover_url: book.cover_url || '',
        start_date: book.start_date || '',
        finish_date: book.finish_date || '',
      }
    } catch {
      toast.error('Livro não encontrado.')
      router.push({ name: 'books' })
    } finally {
      loading.value = false
    }
  }
})

function splitPayload(payload) {
  const meta = {
    title: payload.title,
    subtitle: payload.subtitle || null,
    isbn: payload.isbn || null,
    publisher: payload.publisher || null,
    publication_year: payload.publication_year,
    pages: payload.pages,
    language: payload.language || null,
    description: payload.description || null,
    cover_url: payload.cover_url || null,
  }
  const shelf = {
    status: payload.status,
    rating: payload.rating,
    favorite: payload.favorite,
    review_public: payload.review_public,
    notes: payload.notes || null,
    start_date: payload.start_date,
    finish_date: payload.finish_date,
  }
  return { meta, shelf }
}

async function handleSubmit({ payload, authorName: name, genreIds: selectedGenres }) {
  submitting.value = true
  try {
    // Resolve autor (catálogo global): cria se não existir
    let authorId = null
    if (name) {
      const author = await authorsStore.findOrCreate(name)
      authorId = author?.id ?? null
    }

    const { meta, shelf } = splitPayload(payload)

    if (isEdit.value) {
      await books.update(route.params.id, { meta, authorId, genreIds: selectedGenres, shelf })
      toast.success('Livro atualizado!')
      router.push({ name: 'book-detail', params: { id: route.params.id } })
    } else {
      const entry = await books.create({ meta, authorId, genreIds: selectedGenres, shelf })
      toast.success('Livro adicionado!')
      router.push({ name: 'book-detail', params: { id: entry.id } })
    }
  } catch (e) {
    if (e.message === 'DUPLICATE_SHELF') {
      toast.error('Este livro já está na sua biblioteca.')
    } else {
      toast.error('Erro ao salvar o livro.')
      console.error(e)
    }
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-4xl space-y-5">
    <div class="flex items-center gap-3">
      <button class="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800" @click="router.back()">
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
      </button>
      <h1 class="text-2xl font-bold">{{ isEdit ? 'Editar livro' : 'Adicionar livro' }}</h1>
    </div>

    <div class="card p-6">
      <div v-if="loading" class="space-y-4">
        <Skeleton class="h-40 w-28" />
        <Skeleton class="h-10 w-full" />
        <Skeleton class="h-10 w-full" />
      </div>
      <BookForm
        v-else
        :model-value="model"
        :author-name="authorName"
        :genre-ids="genreIds"
        :is-edit="isEdit"
        :submitting="submitting"
        @submit="handleSubmit"
        @cancel="router.back()"
      />
    </div>
  </div>
</template>
