<script setup>
import { onMounted, ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useBooksStore } from '@/stores/books.store'
import { useAuthorsStore } from '@/stores/authors.store'
import { booksService } from '@/services/books.service'
import { useAuthStore } from '@/stores/auth.store'
import { useToast } from '@/composables/useToast'
import BookForm from '@/components/books/BookForm.vue'
import Skeleton from '@/components/ui/Skeleton.vue'

const route = useRoute()
const router = useRouter()
const books = useBooksStore()
const authorsStore = useAuthorsStore()
const auth = useAuthStore()
const toast = useToast()

const isEdit = computed(() => route.name === 'book-edit')
const submitting = ref(false)
const loading = ref(false)
const model = ref({})
const authorName = ref('')

onMounted(async () => {
  if (isEdit.value) {
    loading.value = true
    try {
      const book = await booksService.getById(route.params.id, auth.user.id)
      authorName.value = book.author?.name || ''
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

async function handleSubmit({ payload, authorName: name }) {
  submitting.value = true
  try {
    // Resolve autor (catálogo global): cria se não existir
    let author_id = null
    if (name) {
      const author = await authorsStore.findOrCreate(name)
      author_id = author?.id ?? null
    }

    if (isEdit.value) {
      await books.update(route.params.id, { ...payload, author_id })
      toast.success('Livro atualizado!')
      router.push({ name: 'book-detail', params: { id: route.params.id } })
    } else {
      const book = await books.create({ ...payload, author_id })
      toast.success('Livro adicionado!')
      router.push({ name: 'book-detail', params: { id: book.id } })
    }
  } catch (e) {
    toast.error('Erro ao salvar o livro.')
    console.error(e)
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
        :is-edit="isEdit"
        :submitting="submitting"
        @submit="handleSubmit"
        @cancel="router.back()"
      />
    </div>
  </div>
</template>
