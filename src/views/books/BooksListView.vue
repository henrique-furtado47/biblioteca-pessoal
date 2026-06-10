<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useBooksStore } from '@/stores/books.store'
import { useAuthorsStore } from '@/stores/authors.store'
import { useGenresStore } from '@/stores/genres.store'
import { useShelvesStore } from '@/stores/shelves.store'
import { booksService } from '@/services/books.service'
import { useAuthStore } from '@/stores/auth.store'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
import BookGrid from '@/components/books/BookGrid.vue'
import BookFilters from '@/components/books/BookFilters.vue'
import Pagination from '@/components/ui/Pagination.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'

const router = useRouter()
const books = useBooksStore()
const authorsStore = useAuthorsStore()
const genresStore = useGenresStore()
const shelvesStore = useShelvesStore()
const auth = useAuthStore()
const toast = useToast()
const confirm = useConfirm()
const { items, loading, filters, page, totalPages, count } = storeToRefs(books)
const years = ref([])
const searchTerm = ref(books.filters.search || '')

// Pasta selecionada (null = todos)
const selectedShelf = ref(null)
const shelfItems = ref([])
const shelfLoading = ref(false)

onMounted(async () => {
  await Promise.all([
    books.fetch(),
    authorsStore.fetch(),
    genresStore.fetch(),
    shelvesStore.fetch(),
    booksService.years(auth.user.id).then((y) => (years.value = y)),
  ])
})

let searchTimer = null
function onSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => books.setFilter({ search: searchTerm.value.trim() }), 350)
}

async function onToggleFavorite(book) {
  try {
    await books.toggleFavorite(book)
  } catch {
    toast.error('Não foi possível atualizar o favorito.')
  }
}

// --- Pastas -----------------------------------------------------------------
async function selectShelf(id) {
  selectedShelf.value = id
  if (!id) return
  shelfLoading.value = true
  try {
    shelfItems.value = await booksService.shelfBooks(id)
  } finally {
    shelfLoading.value = false
  }
}

async function createFolder() {
  const name = window.prompt('Nome da nova pasta')
  if (!name || !name.trim()) return
  const shelf = await shelvesStore.create(name)
  selectShelf(shelf.id)
}

async function renameFolder(shelf) {
  const name = window.prompt('Renomear pasta', shelf.name)
  if (!name || !name.trim()) return
  await shelvesStore.rename(shelf.id, name)
}

async function deleteFolder(shelf) {
  const ok = await confirm({
    title: 'Excluir pasta',
    message: `Excluir a pasta "${shelf.name}"? Os livros continuam na sua estante.`,
    confirmText: 'Excluir',
  })
  if (!ok) return
  await shelvesStore.remove(shelf.id)
  if (selectedShelf.value === shelf.id) selectShelf(null)
}

async function onReorderShelfBooks(newOrder) {
  shelfItems.value = newOrder
  await booksService.reorderShelfBooks(
    selectedShelf.value,
    newOrder.map((b) => b.id),
  )
}

// Drag das pastas (chips)
const dragChip = ref(null)
function onChipDrop(to) {
  const from = dragChip.value
  dragChip.value = null
  if (from === null || from === to) return
  const arr = [...shelvesStore.items]
  const [m] = arr.splice(from, 1)
  arr.splice(to, 0, m)
  shelvesStore.reorder(arr.map((s) => s.id))
}

const currentShelf = () => shelvesStore.items.find((s) => s.id === selectedShelf.value)
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

    <!-- barra de pastas -->
    <div class="flex flex-wrap items-center gap-2">
      <button
        class="rounded-full border px-3 py-1.5 text-sm font-medium transition"
        :class="!selectedShelf ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 text-slate-600 hover:border-brand-400 dark:border-slate-700 dark:text-slate-300'"
        @click="selectShelf(null)"
      >
        Todos
      </button>
      <button
        v-for="(shelf, i) in shelvesStore.items"
        :key="shelf.id"
        draggable="true"
        class="cursor-move rounded-full border px-3 py-1.5 text-sm font-medium transition"
        :class="selectedShelf === shelf.id ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 text-slate-600 hover:border-brand-400 dark:border-slate-700 dark:text-slate-300'"
        @click="selectShelf(shelf.id)"
        @dragstart="dragChip = i"
        @dragover.prevent
        @drop="onChipDrop(i)"
      >
        {{ shelf.name }}
      </button>
      <button
        class="rounded-full border border-dashed border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-500 transition hover:border-brand-400 hover:text-brand-600 dark:border-slate-700"
        @click="createFolder"
      >
        + Nova pasta
      </button>
    </div>

    <!-- VISÃO TODOS -->
    <template v-if="!selectedShelf">
      <BaseInput
        v-model="searchTerm"
        placeholder="Buscar nos seus livros (título, ISBN, editora...)"
        @update:model-value="onSearch"
      />

      <BookFilters
        :filters="filters"
        :authors="authorsStore.items"
        :genres="genresStore.items"
        :years="years"
        @change="books.setFilter($event)"
        @reset="books.resetFilters()"
      />

      <BookGrid v-if="loading || items.length" :books="items" :loading="loading" @toggle-favorite="onToggleFavorite" />

      <EmptyState
        v-else
        title="Nenhum livro encontrado"
        message="Comece adicionando o primeiro livro da sua coleção ou ajuste os filtros."
      >
        <BaseButton @click="router.push({ name: 'book-new' })">Adicionar livro</BaseButton>
      </EmptyState>

      <Pagination :page="page" :total-pages="totalPages" @update:page="books.setPage($event)" />
    </template>

    <!-- VISÃO PASTA -->
    <template v-else>
      <div class="flex items-center justify-between">
        <h2 class="font-semibold">{{ currentShelf()?.name }}</h2>
        <div class="flex gap-2">
          <BaseButton size="sm" variant="secondary" @click="renameFolder(currentShelf())">Renomear</BaseButton>
          <BaseButton size="sm" variant="ghost" @click="deleteFolder(currentShelf())">Excluir</BaseButton>
        </div>
      </div>
      <p class="text-xs text-slate-400">Arraste os livros para reordenar dentro da pasta.</p>

      <BookGrid
        v-if="shelfLoading || shelfItems.length"
        :books="shelfItems"
        :loading="shelfLoading"
        draggable
        @toggle-favorite="onToggleFavorite"
        @reorder="onReorderShelfBooks"
      />
      <EmptyState
        v-else
        icon="book"
        title="Pasta vazia"
        message="Adicione livros a esta pasta pela página do livro (botão Pastas)."
      />
    </template>
  </div>
</template>
