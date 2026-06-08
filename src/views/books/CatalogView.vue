<script setup>
import { onMounted, ref } from 'vue'
import { booksService } from '@/services/books.service'
import BaseInput from '@/components/ui/BaseInput.vue'
import BookGrid from '@/components/books/BookGrid.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import Pagination from '@/components/ui/Pagination.vue'

const term = ref('')
const items = ref([])
const loading = ref(true)
const page = ref(1)
const pageSize = 24
const count = ref(0)

onMounted(load)

async function load() {
  loading.value = true
  try {
    const { items: data, count: total } = await booksService.catalog({
      search: term.value.trim(),
      page: page.value,
      pageSize,
    })
    items.value = data
    count.value = total
  } finally {
    loading.value = false
  }
}

let timer = null
function onSearch() {
  clearTimeout(timer)
  timer = setTimeout(() => {
    page.value = 1
    load()
  }, 350)
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

    <BaseInput v-model="term" placeholder="Buscar por título, ISBN ou subtítulo" @update:model-value="onSearch" />

    <BookGrid v-if="loading || items.length" :books="items" :loading="loading" readonly book-page />

    <EmptyState
      v-else
      icon="search"
      title="Nenhuma obra encontrada"
      message="O catálogo cresce conforme as pessoas adicionam livros às suas estantes."
    />

    <Pagination :page="page" :total-pages="totalPages()" @update:page="setPage" />
  </div>
</template>
