<script setup>
import { onMounted, reactive, ref } from 'vue'
import { booksService } from '@/services/books.service'
import { useAuthorsStore } from '@/stores/authors.store'
import { useGenresStore } from '@/stores/genres.store'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BookGrid from '@/components/books/BookGrid.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import Pagination from '@/components/ui/Pagination.vue'

const authorsStore = useAuthorsStore()
const genresStore = useGenresStore()

const filters = reactive({ search: '', authorId: '', genreId: '', year: '' })
const items = ref([])
const loading = ref(true)
const page = ref(1)
const pageSize = 24
const count = ref(0)
const years = ref([])

onMounted(async () => {
  await Promise.all([
    authorsStore.fetch(),
    genresStore.fetch(),
    booksService.catalogYears().then((y) => (years.value = y)),
    load(),
  ])
})

async function load() {
  loading.value = true
  try {
    const { items: data, count: total } = await booksService.catalog({
      ...filters,
      search: filters.search.trim(),
      page: page.value,
      pageSize,
    })
    count.value = total
    // anexa média/contagem de avaliações públicas a cada obra
    const ratings = await booksService.ratingsForBooks(data.map((b) => b.id))
    items.value = data.map((b) => ({
      ...b,
      avg_rating: ratings[b.id]?.avg ?? null,
      ratings_count: ratings[b.id]?.count ?? 0,
    }))
  } finally {
    loading.value = false
  }
}

function applyFilters() {
  page.value = 1
  load()
}

function resetFilters() {
  filters.search = ''
  filters.authorId = ''
  filters.genreId = ''
  filters.year = ''
  applyFilters()
}

let timer = null
function onSearch() {
  clearTimeout(timer)
  timer = setTimeout(applyFilters, 350)
}

function setPage(p) {
  page.value = p
  load()
}

const totalPages = () => Math.max(1, Math.ceil(count.value / pageSize))
</script>

<template>
  <div class="space-y-5">
    <div>
      <h1 class="text-2xl font-bold">Livros</h1>
      <p class="text-sm text-slate-500 dark:text-slate-400">
        Catálogo de obras da comunidade. Abra um livro para ver as avaliações.
      </p>
    </div>

    <BaseInput v-model="filters.search" placeholder="Buscar por título, ISBN ou subtítulo" @update:model-value="onSearch" />

    <div class="card flex flex-wrap items-end gap-3 p-4">
      <div class="min-w-[10rem] flex-1">
        <BaseSelect
          :model-value="filters.authorId"
          label="Autor"
          placeholder="Todos os autores"
          :options="authorsStore.items.map((a) => ({ value: a.id, label: a.name }))"
          @update:model-value="(v) => { filters.authorId = v; applyFilters() }"
        />
      </div>
      <div class="min-w-[10rem] flex-1">
        <BaseSelect
          :model-value="filters.genreId"
          label="Gênero"
          placeholder="Todos os gêneros"
          :options="genresStore.items.map((g) => ({ value: g.id, label: g.name }))"
          @update:model-value="(v) => { filters.genreId = v; applyFilters() }"
        />
      </div>
      <div class="min-w-[8rem] flex-1">
        <BaseSelect
          :model-value="filters.year"
          label="Ano"
          placeholder="Todos os anos"
          :options="years.map((y) => ({ value: y, label: String(y) }))"
          @update:model-value="(v) => { filters.year = v; applyFilters() }"
        />
      </div>
      <BaseButton variant="ghost" @click="resetFilters">Limpar filtros</BaseButton>
    </div>

    <BookGrid v-if="loading || items.length" :books="items" :loading="loading" readonly book-page />

    <EmptyState
      v-else
      icon="search"
      title="Nenhuma obra encontrada"
      message="Ajuste os filtros ou adicione livros às suas estantes para alimentar o catálogo."
    />

    <Pagination :page="page" :total-pages="totalPages()" @update:page="setPage" />
  </div>
</template>
