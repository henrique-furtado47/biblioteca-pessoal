<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { booksService } from '@/services/books.service'
import { useAuthStore } from '@/stores/auth.store'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
import StarRating from '@/components/ui/StarRating.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import Skeleton from '@/components/ui/Skeleton.vue'

const router = useRouter()
const auth = useAuthStore()
const toast = useToast()
const confirm = useConfirm()

const items = ref([])
const loading = ref(true)

onMounted(load)

async function load() {
  loading.value = true
  try {
    const { items: data } = await booksService.list({
      userId: auth.user.id,
      status: 'wishlist',
      pageSize: 60,
    })
    items.value = data
  } finally {
    loading.value = false
  }
}

async function moveToReading(book) {
  try {
    await booksService.setStatus(book.id, 'reading')
    items.value = items.value.filter((b) => b.id !== book.id)
    toast.success(`"${book.title}" movido para leitura.`)
  } catch {
    toast.error('Erro ao mover.')
  }
}

async function remove(book) {
  const ok = await confirm({
    title: 'Remover da lista',
    message: `Remover "${book.title}" da lista de desejos?`,
    confirmText: 'Remover',
  })
  if (!ok) return
  try {
    await booksService.remove(book.id)
    items.value = items.value.filter((b) => b.id !== book.id)
    toast.success('Removido da lista de desejos.')
  } catch {
    toast.error('Erro ao remover.')
  }
}
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold">Lista de Desejos</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400">Livros que você quer ler em breve.</p>
      </div>
      <BaseButton @click="router.push({ name: 'book-new' })">Adicionar à lista</BaseButton>
    </div>

    <div v-if="loading" class="space-y-3">
      <Skeleton v-for="n in 4" :key="n" class="h-24 w-full" />
    </div>

    <div v-else-if="items.length" class="space-y-3">
      <div v-for="book in items" :key="book.id" class="card flex items-center gap-4 p-3">
        <div class="h-20 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
          <img v-if="book.cover_url" :src="book.cover_url" :alt="book.title" class="h-full w-full object-cover" />
        </div>
        <div class="min-w-0 flex-1">
          <RouterLink :to="{ name: 'book-detail', params: { id: book.id } }" class="block truncate font-semibold hover:text-brand-600">
            {{ book.title }}
          </RouterLink>
          <p class="truncate text-sm text-slate-500 dark:text-slate-400">{{ book.author?.name || 'Autor desconhecido' }}</p>
          <StarRating v-if="book.rating" :model-value="Number(book.rating)" readonly size="sm" />
        </div>
        <div class="flex shrink-0 gap-2">
          <BaseButton size="sm" @click="moveToReading(book)">Mover para leitura</BaseButton>
          <BaseButton size="sm" variant="ghost" @click="remove(book)">Remover</BaseButton>
        </div>
      </div>
    </div>

    <EmptyState v-else icon="gift" title="Lista de desejos vazia" message="Adicione livros que você quer ler no futuro.">
      <BaseButton @click="router.push({ name: 'book-new' })">Adicionar livro</BaseButton>
    </EmptyState>
  </div>
</template>
