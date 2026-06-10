<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { postsService } from '@/services/posts.service'
import { useAuthStore } from '@/stores/auth.store'
import PostCard from '@/components/social/PostCard.vue'
import CreatePostModal from '@/components/social/CreatePostModal.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import Skeleton from '@/components/ui/Skeleton.vue'

const router = useRouter()
const auth = useAuthStore()
const items = ref([])
const loading = ref(true)
const createOpen = ref(false)
const scope = ref('following')

const SCOPES = [
  { value: 'following', label: 'Seguindo' },
  { value: 'friends', label: 'Amigos' },
  { value: 'public', label: 'Públicas' },
]

onMounted(load)

async function load() {
  loading.value = true
  try {
    items.value = await postsService.feed(auth.user.id, { scope: scope.value })
  } finally {
    loading.value = false
  }
}

function setScope(s) {
  if (scope.value === s) return
  scope.value = s
  load()
}

function onCreated() {
  load()
}

function onRemoved(id) {
  items.value = items.value.filter((p) => p.id !== id)
}
</script>

<template>
  <div class="mx-auto max-w-2xl space-y-5">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">Feed</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400">Publicações de quem você segue e seus amigos.</p>
      </div>
      <BaseButton @click="createOpen = true">
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
        Publicar
      </BaseButton>
    </div>

    <!-- escopo do feed -->
    <div class="flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
      <button
        v-for="s in SCOPES"
        :key="s.value"
        class="flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition"
        :class="scope === s.value ? 'bg-white text-brand-700 shadow-sm dark:bg-slate-900 dark:text-brand-300' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'"
        @click="setScope(s.value)"
      >
        {{ s.label }}
      </button>
    </div>

    <div v-if="loading" class="space-y-3">
      <Skeleton v-for="n in 4" :key="n" class="h-40 w-full" />
    </div>

    <div v-else-if="items.length" class="space-y-4">
      <PostCard v-for="post in items" :key="post.id" :post="post" @removed="onRemoved" />
    </div>

    <EmptyState
      v-else
      icon="users"
      title="Seu feed está vazio"
      message="Publique algo ou siga leitores e faça amizades para ver publicações aqui."
    >
      <BaseButton @click="createOpen = true">Criar publicação</BaseButton>
    </EmptyState>

    <CreatePostModal v-model="createOpen" @created="onCreated" />
  </div>
</template>
