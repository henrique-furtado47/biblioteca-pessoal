<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import draggable from 'vuedraggable'
import { useBooksStore } from '@/stores/books.store'
import { useAuthorsStore } from '@/stores/authors.store'
import { useGenresStore } from '@/stores/genres.store'
import { useShelvesStore } from '@/stores/shelves.store'
import { booksService } from '@/services/books.service'
import { useAuthStore } from '@/stores/auth.store'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
import BookCard from '@/components/books/BookCard.vue'
import BookGrid from '@/components/books/BookGrid.vue'
import BookFilters from '@/components/books/BookFilters.vue'
import Pagination from '@/components/ui/Pagination.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseModal from '@/components/ui/BaseModal.vue'

const GRID = 'grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6'

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

const selectedShelf = ref(null)
const shelfItems = ref([])
const shelfLoading = ref(false)

// baldes temporários por pasta para receber o livro arrastado (vuedraggable)
const dropBuckets = reactive({})
const bucket = (id) => (dropBuckets[id] ||= [])

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
    if (selectedShelf.value) selectShelf(selectedShelf.value)
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

// arrastar livro (da grade) e soltar no chip da pasta
async function onDropToShelf(shelfId, evt) {
  const arr = dropBuckets[shelfId] || []
  const book = arr[evt?.newIndex] ?? arr[0]
  arr.splice(0) // limpa o balde (o chip não guarda livros, só registra)
  if (!book) return
  try {
    await booksService.addBookToShelf(book.id, shelfId)
    toast.success('Adicionado à pasta.')
    if (selectedShelf.value === shelfId) selectShelf(shelfId)
  } catch {
    toast.error('Não foi possível adicionar à pasta.')
  }
}

async function persistShelfBooks() {
  await booksService.reorderShelfBooks(
    selectedShelf.value,
    shelfItems.value.map((b) => b.id),
  )
}

function persistChipOrder() {
  shelvesStore.reorder(shelvesStore.items.map((s) => s.id))
}

const currentShelf = () => shelvesStore.items.find((s) => s.id === selectedShelf.value)

// --- Modal "adicionar a pasta" (alternativa ao arrastar, ideal no mobile) ---
const folderModalOpen = ref(false)
const modalBook = ref(null)
const modalShelfIds = ref([])
const modalLoading = ref(false)

async function openFolderModal(book) {
  modalBook.value = book
  folderModalOpen.value = true
  modalLoading.value = true
  try {
    modalShelfIds.value = await booksService.shelvesOfBook(book.id)
  } finally {
    modalLoading.value = false
  }
}

async function toggleModalShelf(shelfId) {
  const set = new Set(modalShelfIds.value)
  set.has(shelfId) ? set.delete(shelfId) : set.add(shelfId)
  const ids = [...set]
  try {
    await booksService.setBookShelves(modalBook.value.id, ids)
    modalShelfIds.value = ids
    if (selectedShelf.value) selectShelf(selectedShelf.value)
  } catch {
    toast.error('Não foi possível atualizar as pastas.')
  }
}

async function newFolderInModal() {
  const name = window.prompt('Nome da nova pasta')
  if (!name || !name.trim()) return
  const shelf = await shelvesStore.create(name)
  toggleModalShelf(shelf.id)
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
        <font-awesome-icon :icon="['fas', 'plus']" class="h-5 w-5" />
        Adicionar livro
      </BaseButton>
    </div>

    <!-- barra de pastas (arraste um livro até um chip para adicioná-lo) -->
    <div class="flex flex-wrap items-center gap-2">
      <button
        class="rounded-full border px-3 py-1.5 text-sm font-medium transition"
        :class="!selectedShelf ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 text-slate-600 hover:border-brand-400 dark:border-slate-700 dark:text-slate-300'"
        @click="selectShelf(null)"
      >
        Todos
      </button>

      <draggable
        v-model="shelvesStore.items"
        item-key="id"
        handle=".chip-grip"
        :animation="150"
        class="flex flex-wrap items-center gap-2"
        @end="persistChipOrder"
      >
        <template #item="{ element: shelf }">
          <draggable
            :list="bucket(shelf.id)"
            :group="{ name: 'books', put: true, pull: false }"
            :sort="false"
            item-key="id"
            tag="div"
            class="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition"
            :class="selectedShelf === shelf.id ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 text-slate-600 hover:border-brand-400 dark:border-slate-700 dark:text-slate-300'"
            @add="onDropToShelf(shelf.id, $event)"
          >
            <template #header>
              <span class="chip-grip cursor-move select-none opacity-60">⠿</span>
              <button type="button" @click="selectShelf(shelf.id)">{{ shelf.name }}</button>
            </template>
            <template #item="{ element }"><span :key="element.id" class="hidden" /></template>
          </draggable>
        </template>
      </draggable>

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

      <p v-if="items.length && shelvesStore.items.length" class="text-xs text-slate-400">
        Dica: arraste um livro até uma pasta lá em cima para adicioná-lo.
      </p>

      <BookGrid v-if="loading" :books="[]" loading />
      <draggable
        v-else-if="items.length"
        :list="items"
        :group="{ name: 'books', pull: 'clone', put: false }"
        :sort="false"
        handle=".drag-handle"
        item-key="id"
        :class="GRID"
      >
        <template #item="{ element }">
          <div class="relative">
            <div class="absolute left-1.5 top-1.5 z-10 flex gap-1">
              <span class="drag-handle flex cursor-move touch-none items-center rounded-md bg-slate-900/55 p-1 text-white" title="Arraste para uma pasta">
                <font-awesome-icon :icon="['fas', 'grip']" class="h-4 w-4" />
              </span>
              <button class="flex items-center rounded-md bg-slate-900/55 p-1 text-white" title="Adicionar a pasta" @click.stop.prevent="openFolderModal(element)">
                <font-awesome-icon :icon="['fas', 'ellipsis-vertical']" class="h-4 w-4" />
              </button>
            </div>
            <BookCard :book="element" @toggle-favorite="onToggleFavorite" />
          </div>
        </template>
      </draggable>

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

      <BookGrid v-if="shelfLoading" :books="[]" loading />
      <draggable
        v-else-if="shelfItems.length"
        v-model="shelfItems"
        item-key="id"
        handle=".drag-handle"
        :animation="150"
        :class="GRID"
        @end="persistShelfBooks"
      >
        <template #item="{ element }">
          <div class="relative">
            <div class="absolute left-1.5 top-1.5 z-10 flex gap-1">
              <span class="drag-handle flex cursor-move touch-none items-center rounded-md bg-slate-900/55 p-1 text-white" title="Arraste para reordenar">
                <font-awesome-icon :icon="['fas', 'grip']" class="h-4 w-4" />
              </span>
              <button class="flex items-center rounded-md bg-slate-900/55 p-1 text-white" title="Adicionar a pasta" @click.stop.prevent="openFolderModal(element)">
                <font-awesome-icon :icon="['fas', 'ellipsis-vertical']" class="h-4 w-4" />
              </button>
            </div>
            <BookCard :book="element" @toggle-favorite="onToggleFavorite" />
          </div>
        </template>
      </draggable>
      <EmptyState
        v-else
        icon="book"
        title="Pasta vazia"
        message="Arraste livros até esta pasta (na visão Todos) ou use o botão Pastas na página do livro."
      />
    </template>

    <!-- modal: adicionar livro a pasta (sem arrastar) -->
    <BaseModal v-model="folderModalOpen" :title="modalBook ? `Pastas de “${modalBook.title}”` : 'Pastas'">
      <p v-if="modalLoading" class="text-sm text-slate-400">Carregando...</p>
      <template v-else>
        <p class="mb-3 text-sm text-slate-500 dark:text-slate-400">Toque para incluir ou remover o livro de uma pasta.</p>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="shelf in shelvesStore.items"
            :key="shelf.id"
            type="button"
            class="rounded-full border px-3 py-1.5 text-sm font-medium transition"
            :class="
              modalShelfIds.includes(shelf.id)
                ? 'border-brand-600 bg-brand-600 text-white'
                : 'border-slate-300 text-slate-600 hover:border-brand-400 dark:border-slate-700 dark:text-slate-300'
            "
            @click="toggleModalShelf(shelf.id)"
          >
            {{ shelf.name }}
          </button>
          <button
            type="button"
            class="rounded-full border border-dashed border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-500 hover:border-brand-400 hover:text-brand-600 dark:border-slate-700"
            @click="newFolderInModal"
          >
            + Nova pasta
          </button>
        </div>
      </template>
    </BaseModal>
  </div>
</template>
