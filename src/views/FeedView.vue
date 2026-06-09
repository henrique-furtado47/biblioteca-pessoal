<script setup>
import BaseButton from '@/components/ui/BaseButton.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import Skeleton from '@/components/ui/Skeleton.vue'
import StarRating from '@/components/ui/StarRating.vue'
import { STATUS_LABELS } from '@/constants'
import { activitiesService } from '@/services/activities.service'
import { useAuthStore } from '@/stores/auth.store'
import { formatDateTime, initialsOf } from '@/utils/formatters'
import { onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'

const router = useRouter()
const auth = useAuthStore()
const items = ref([])
const loading = ref(true)

onMounted(async () => {
  loading.value = true
  try {
    items.value = await activitiesService.feed(auth.user.id)
  } finally {
    loading.value = false
  }
})

const actorName = (a) => a.actor?.display_name || a.actor?.username || 'Usuário'

// Frase do evento conforme o tipo
function verb(a) {
  if (a.type === 'added') return ' adicionou à estante '
  if (a.type === 'favorite') return ' favoritou '
  if (a.type === 'rating') return ' avaliou '
  if (a.type === 'status') {
    return (
      {
        reading: ' começou a ler ',
        finished: ' terminou de ler ',
        abandoned: ' abandonou ',
        wishlist: ' adicionou à lista de desejos ',
        unread: ' marcou como não lido ',
      }[a.data?.status] || ` mudou o status para ${STATUS_LABELS[a.data?.status] || '—'} `
    )
  }
  return 'atualizou'
}
</script>

<template>
  <div class="mx-auto max-w-2xl space-y-5">
    <div>
      <h1 class="text-2xl font-bold">Feed</h1>
      <p class="text-sm text-slate-500 dark:text-slate-400">O que quem você segue e seus amigos andam lendo.</p>
    </div>

    <div v-if="loading" class="space-y-3">
      <Skeleton v-for="n in 5" :key="n" class="h-20 w-full" />
    </div>

    <div v-else-if="items.length" class="space-y-3">
      <div v-for="a in items" :key="a.id" class="card flex items-center gap-3 p-4">
        <RouterLink
          :to="a.actor.username ? { name: 'profile', params: { username: a.actor.username } } : {}"
          class="shrink-0"
        >
          <span class="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-brand-600 text-sm font-semibold text-white">
            <img v-if="a.actor.avatar_url" :src="a.actor.avatar_url" :alt="actorName(a)" class="h-full w-full object-cover" />
            <template v-else>{{ initialsOf(actorName(a)) }}</template>
          </span>
        </RouterLink>

        <div class="min-w-0 flex-1">
          <p class="text-sm">
            <RouterLink
              :to="a.actor.username ? { name: 'profile', params: { username: a.actor.username } } : {}"
              class="font-semibold hover:text-brand-600"
            >{{ actorName(a) }}</RouterLink>
            <span class="text-slate-500 dark:text-slate-400"> {{ verb(a) }} </span>
            <RouterLink
              v-if="a.book"
              :to="{ name: 'book-page', params: { id: a.book.id } }"
              class="font-medium hover:text-brand-600"
            >«{{ a.book.title }}»</RouterLink>
          </p>
          <div class="mt-1 flex items-center gap-2">
            <StarRating v-if="a.type === 'rating' && a.data?.rating" :model-value="Number(a.data.rating)" readonly size="sm" />
            <span class="text-xs text-slate-400">{{ formatDateTime(a.created_at) }}</span>
          </div>
        </div>

        <RouterLink
          v-if="a.book"
          :to="{ name: 'book-page', params: { id: a.book.id } }"
          class="h-16 w-11 shrink-0 overflow-hidden rounded-md bg-slate-100 dark:bg-slate-800"
        >
          <img v-if="a.book.cover_url" :src="a.book.cover_url" :alt="a.book.title" class="h-full w-full object-cover" />
        </RouterLink>
      </div>
    </div>

    <EmptyState
      v-else
      icon="users"
      title="Seu feed está vazio"
      message="Siga leitores e faça amizades para acompanhar as leituras deles aqui."
    >
      <BaseButton @click="router.push({ name: 'community' })">Encontrar leitores</BaseButton>
    </EmptyState>
  </div>
</template>
