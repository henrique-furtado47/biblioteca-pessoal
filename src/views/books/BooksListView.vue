<script setup>
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useBooksStore } from '@/stores/books.store'
import { useAuthorsStore } from '@/stores/authors.store'
import { useGenresStore } from '@/stores/genres.store'
import { booksService } from '@/services/books.service'
import { useAuthStore } from '@/stores/auth.store'
import { useToast } from '@/composables/useToast'
import BookGrid from '@/components/books/BookGrid.vue'
import BookFilters from '@/components/books/BookFilters.vue'
import Pagination from '@/components/ui/Pagination.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import BaseButton from '@/components/ui/BaseButton.vue'

const route = useRoute()
const router = useRouter()
const books = useBooksStore()
const authorsStore = useAuthorsStore()
const genresStore = useGenresStore()
const auth = useAuthStore()
const toast = useToast()
const { items, loading, filters, page, totalPages, count } = storeToRefs(books)
const years = ref([])

onMounted(async () => {
  if (route.query.q) books.filters.search = String(route.query.q)
  await Promise.all([
    books.fetch(),
    authorsStore.fetch(),
    genresStore.fetch(),
    booksService.years(auth.user.id).then((y) => (years.value = y)),
  ])
})

// Reage à busca global vinda da navbar
watch(
  () => route.query.q,
  (q) => {
    books.setFilter({ search: q ? String(q) : '' })
  },
)

async function onToggleFavorite(book) {
  try {
    await books.toggleFavorite(book)
  } catch {
    toast.error('Não foi possível atualizar o favorito.')
  }
}
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold">Meus Livros</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400">{{ count }} livro(s) na coleção</p>
      </div>
      <BaseButton @click="router.push({ name: 'book-new' })">
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
        Adicionar livro
      </BaseButton>
    </div>

    <BookFilters
      :filters="filters"
      :authors="authorsStore.items"
      :genres="genresStore.items"
      :years="years"
      @change="books.setFilter($event)"
      @reset="books.resetFilters()"
    />

    <BookGrid
      v-if="loading || items.length"
      :books="items"
      :loading="loading"
      @toggle-favorite="onToggleFavorite"
    />

    <EmptyState
      v-else
      title="Nenhum livro encontrado"
      message="Comece adicionando o primeiro livro da sua coleção ou ajuste os filtros."
    >
      <BaseButton @click="router.push({ name: 'book-new' })">Adicionar livro</BaseButton>
    </EmptyState>

    <Pagination :page="page" :total-pages="totalPages" @update:page="books.setPage($event)" />
  </div>
</template>
