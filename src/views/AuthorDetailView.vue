<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { authorsService } from '@/services/authors.service'
import { booksService } from '@/services/books.service'
import { useAuthorsStore } from '@/stores/authors.store'
import { useToast } from '@/composables/useToast'
import { initialsOf, pluralize } from '@/utils/formatters'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import Skeleton from '@/components/ui/Skeleton.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import BookGrid from '@/components/books/BookGrid.vue'
import AuthorForm from '@/components/authors/AuthorForm.vue'

const route = useRoute()
const router = useRouter()
const authorsStore = useAuthorsStore()
const toast = useToast()

const author = ref(null)
const books = ref([])
const loading = ref(true)
const booksLoading = ref(true)
const editing = ref(false)
const submitting = ref(false)

onMounted(load)

async function load() {
  loading.value = true
  try {
    author.value = await authorsService.getById(route.params.id)
  } catch {
    toast.error('Autor não encontrado.')
    router.push({ name: 'authors' })
    return
  } finally {
    loading.value = false
  }
  loadBooks()
}

async function loadBooks() {
  booksLoading.value = true
  try {
    const { items } = await booksService.catalog({
      authorId: route.params.id,
      pageSize: 100,
    })
    books.value = items
  } finally {
    booksLoading.value = false
  }
}

async function handleSubmit(payload) {
  submitting.value = true
  try {
    const updated = await authorsStore.update(author.value.id, payload)
    author.value = { ...author.value, ...updated }
    editing.value = false
    toast.success('Autor atualizado!')
  } catch {
    toast.error('Erro ao salvar o autor.')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-5xl">
    <button class="mb-4 flex items-center gap-2 text-sm text-slate-500 hover:text-brand-600" @click="router.push({ name: 'authors' })">
      <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
      Autores
    </button>

    <!-- loading do autor -->
    <div v-if="loading" class="flex items-center gap-5">
      <Skeleton class="h-24 w-24 rounded-full" />
      <div class="space-y-3">
        <Skeleton class="h-7 w-48" />
        <Skeleton class="h-4 w-64" />
      </div>
    </div>

    <template v-else-if="author">
      <!-- cabeçalho -->
      <div class="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div class="flex items-center gap-5">
          <span class="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-600 text-2xl font-semibold text-white">
            <img v-if="author.photo_url" :src="author.photo_url" :alt="author.name" class="h-full w-full object-cover" />
            <template v-else>{{ initialsOf(author.name) }}</template>
          </span>
          <div>
            <h1 class="text-3xl font-bold leading-tight">{{ author.name }}</h1>
            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {{ pluralize(books.length, 'livro no catálogo', 'livros no catálogo') }}
            </p>
          </div>
        </div>
        <BaseButton variant="secondary" @click="editing = true">Editar</BaseButton>
      </div>

      <!-- biografia -->
      <div class="mt-6">
        <h3 class="mb-2 font-semibold">Biografia</h3>
        <p v-if="author.biography" class="whitespace-pre-line text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          {{ author.biography }}
        </p>
        <p v-else class="text-sm text-slate-400">Sem biografia cadastrada.</p>
      </div>

      <!-- livros do autor -->
      <div class="mt-8">
        <h3 class="mb-3 font-semibold">Livros</h3>
        <BookGrid
          v-if="booksLoading || books.length"
          :books="books"
          :loading="booksLoading"
          readonly
          book-page
        />
        <EmptyState
          v-else
          icon="book"
          title="Nenhum livro deste autor"
          message="Ainda não há livros deste autor no catálogo."
        />
      </div>
    </template>

    <!-- modal de edição -->
    <BaseModal v-model="editing" title="Editar autor" size="lg">
      <AuthorForm
        v-if="author"
        :author="author"
        :submitting="submitting"
        @submit="handleSubmit"
        @cancel="editing = false"
      />
    </BaseModal>
  </div>
</template>
