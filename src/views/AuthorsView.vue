<script setup>
import { onMounted } from 'vue'
import { useAuthorsStore } from '@/stores/authors.store'
import { initialsOf } from '@/utils/formatters'
import EmptyState from '@/components/ui/EmptyState.vue'
import Skeleton from '@/components/ui/Skeleton.vue'

const authorsStore = useAuthorsStore()

onMounted(() => authorsStore.fetch(true))
</script>

<template>
  <div class="space-y-5">
    <div>
      <h1 class="text-2xl font-bold">Autores</h1>
      <p class="text-sm text-slate-500 dark:text-slate-400">Catálogo de autores da plataforma. Clique para ver detalhes e editar.</p>
    </div>

    <div v-if="authorsStore.loading" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Skeleton v-for="n in 6" :key="n" class="h-20" />
    </div>

    <div v-else-if="authorsStore.items.length" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <RouterLink
        v-for="author in authorsStore.items"
        :key="author.id"
        :to="{ name: 'author-detail', params: { id: author.id } }"
        class="card flex items-center gap-3 p-4 transition hover:border-brand-400 hover:shadow-md dark:hover:border-brand-500"
      >
        <span class="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-600 text-sm font-semibold text-white">
          <img v-if="author.photo_url" :src="author.photo_url" :alt="author.name" class="h-full w-full object-cover" />
          <template v-else>{{ initialsOf(author.name) }}</template>
        </span>
        <div class="min-w-0">
          <p class="truncate font-semibold">{{ author.name }}</p>
          <p class="truncate text-sm text-slate-500 dark:text-slate-400">{{ author.biography || 'Sem biografia' }}</p>
        </div>
      </RouterLink>
    </div>

    <EmptyState v-else icon="book" title="Nenhum autor cadastrado" message="Autores são criados automaticamente ao adicionar livros." />
  </div>
</template>
