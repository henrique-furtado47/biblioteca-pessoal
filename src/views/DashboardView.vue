<script setup>
import { onMounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { booksService } from '@/services/books.service'
import { useAuthStore } from '@/stores/auth.store'
import StatCard from '@/components/stats/StatCard.vue'
import BookCard from '@/components/books/BookCard.vue'
import Skeleton from '@/components/ui/Skeleton.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import BaseButton from '@/components/ui/BaseButton.vue'

const router = useRouter()
const auth = useAuthStore()

const loading = ref(true)
const all = ref([])
const recent = ref([])
const reading = ref([])
const favorites = ref([])

const counts = computed(() => {
  const c = { total: all.value.length, finished: 0, reading: 0, abandoned: 0, wishlist: 0 }
  for (const b of all.value) {
    if (b.status === 'finished') c.finished++
    else if (b.status === 'reading') c.reading++
    else if (b.status === 'abandoned') c.abandoned++
    else if (b.status === 'wishlist') c.wishlist++
  }
  return c
})

onMounted(async () => {
  loading.value = true
  try {
    const userId = auth.user.id
    // contagens a partir de uma leitura leve
    all.value = await booksService.stats(userId)

    const [recentRes, readingRes, favRes] = await Promise.all([
      booksService.list({ userId, page: 1, pageSize: 6, sort: 'recent' }),
      booksService.list({ userId, page: 1, pageSize: 6, status: 'reading' }),
      booksService.list({ userId, page: 1, pageSize: 6, favorite: true }),
    ])
    recent.value = recentRes.items
    reading.value = readingRes.items
    favorites.value = favRes.items
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="space-y-8">
    <div>
      <h1 class="text-2xl font-bold">Olá, {{ auth.displayName }} 👋</h1>
      <p class="text-sm text-slate-500 dark:text-slate-400">Aqui está um resumo da sua biblioteca.</p>
    </div>

    <!-- Cards -->
    <div v-if="loading" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <Skeleton v-for="n in 5" :key="n" class="h-24" />
    </div>
    <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <StatCard label="Total de livros" :value="counts.total" icon="book" accent="brand" />
      <StatCard label="Lidos" :value="counts.finished" icon="check" accent="emerald" />
      <StatCard label="Em leitura" :value="counts.reading" icon="reading" accent="blue" />
      <StatCard label="Abandonados" :value="counts.abandoned" icon="x" accent="rose" />
      <StatCard label="Desejados" :value="counts.wishlist" icon="gift" accent="amber" />
    </div>

    <!-- Em leitura -->
    <section v-if="reading.length">
      <div class="mb-3 flex items-center justify-between">
        <h2 class="text-lg font-semibold">Lendo agora</h2>
      </div>
      <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
        <BookCard v-for="b in reading" :key="b.id" :book="b" @toggle-favorite="() => {}" />
      </div>
    </section>

    <!-- Recentes -->
    <section>
      <div class="mb-3 flex items-center justify-between">
        <h2 class="text-lg font-semibold">Adicionados recentemente</h2>
        <RouterLink :to="{ name: 'books' }" class="text-sm font-medium text-brand-600 hover:underline">Ver todos</RouterLink>
      </div>
      <div v-if="recent.length" class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
        <BookCard v-for="b in recent" :key="b.id" :book="b" @toggle-favorite="() => {}" />
      </div>
      <EmptyState v-else title="Sua biblioteca está vazia" message="Adicione seu primeiro livro para começar.">
        <BaseButton @click="router.push({ name: 'book-new' })">Adicionar livro</BaseButton>
      </EmptyState>
    </section>

    <!-- Favoritos -->
    <section v-if="favorites.length">
      <div class="mb-3 flex items-center justify-between">
        <h2 class="text-lg font-semibold">Favoritos</h2>
        <RouterLink :to="{ name: 'favorites' }" class="text-sm font-medium text-brand-600 hover:underline">Ver todos</RouterLink>
      </div>
      <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
        <BookCard v-for="b in favorites" :key="b.id" :book="b" @toggle-favorite="() => {}" />
      </div>
    </section>
  </div>
</template>
