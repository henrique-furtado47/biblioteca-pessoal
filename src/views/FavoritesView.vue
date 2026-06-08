<script setup>
import { onMounted, ref } from 'vue'
import { booksService } from '@/services/books.service'
import { useAuthStore } from '@/stores/auth.store'
import { useToast } from '@/composables/useToast'
import BookGrid from '@/components/books/BookGrid.vue'
import EmptyState from '@/components/ui/EmptyState.vue'

const auth = useAuthStore()
const toast = useToast()
const items = ref([])
const loading = ref(true)

onMounted(load)

async function load() {
  loading.value = true
  try {
    const { items: data } = await booksService.list({
      userId: auth.user.id,
      favorite: true,
      pageSize: 60,
    })
    items.value = data
  } finally {
    loading.value = false
  }
}

async function onToggleFavorite(book) {
  try {
    await booksService.setFavorite(book.id, false)
    items.value = items.value.filter((b) => b.id !== book.id)
    toast.info('Removido dos favoritos.')
  } catch {
    toast.error('Erro ao atualizar.')
  }
}
</script>

<template>
  <div class="space-y-5">
    <div>
      <h1 class="text-2xl font-bold">Meus Favoritos</h1>
      <p class="text-sm text-slate-500 dark:text-slate-400">Os livros que você mais ama.</p>
    </div>

    <BookGrid v-if="loading || items.length" :books="items" :loading="loading" @toggle-favorite="onToggleFavorite" />
    <EmptyState v-else icon="heart" title="Nenhum favorito ainda" message="Marque livros como favoritos para vê-los aqui." />
  </div>
</template>
