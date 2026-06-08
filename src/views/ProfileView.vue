<script setup>
import { onMounted, ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { profilesService } from '@/services/profiles.service'
import { followsService } from '@/services/follows.service'
import { booksService } from '@/services/books.service'
import { useAuthStore } from '@/stores/auth.store'
import { useToast } from '@/composables/useToast'
import { initialsOf } from '@/utils/formatters'
import BaseButton from '@/components/ui/BaseButton.vue'
import BookGrid from '@/components/books/BookGrid.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import Skeleton from '@/components/ui/Skeleton.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const toast = useToast()

const loading = ref(true)
const profile = ref(null)
const books = ref([])
const booksLoading = ref(false)
const counts = ref({ followers: 0, following: 0 })
const isFollowing = ref(false)
const followBusy = ref(false)

const isMe = computed(() => profile.value && profile.value.id === auth.user?.id)

// Pode ver a biblioteca? (própria sempre; pública sempre; seguidores só se seguir)
const canSeeLibrary = computed(() => {
  if (!profile.value) return false
  if (isMe.value) return true
  const v = profile.value.library_visibility
  return v === 'public' || (v === 'followers' && isFollowing.value)
})

const visibilityMessage = computed(() => {
  if (!profile.value || canSeeLibrary.value) return ''
  return profile.value.library_visibility === 'followers'
    ? 'Esta biblioteca é visível apenas para seguidores. Siga para ver os livros.'
    : 'Esta biblioteca é privada.'
})

onMounted(load)
watch(() => route.params.username, load)

async function load() {
  loading.value = true
  profile.value = null
  try {
    const p = await profilesService.getByUsername(route.params.username)
    if (!p) {
      toast.error('Perfil não encontrado.')
      router.push({ name: 'dashboard' })
      return
    }
    profile.value = p
    counts.value = await followsService.counts(p.id)
    if (!isMe.value) {
      isFollowing.value = await followsService.isFollowing(auth.user.id, p.id)
    }
  } catch {
    toast.error('Erro ao carregar o perfil.')
    router.push({ name: 'dashboard' })
    return
  } finally {
    loading.value = false
  }
  if (canSeeLibrary.value) loadBooks()
}

async function loadBooks() {
  booksLoading.value = true
  try {
    const { items } = await booksService.list({
      userId: profile.value.id,
      pageSize: 60,
      sort: 'recent',
    })
    books.value = items
  } finally {
    booksLoading.value = false
  }
}

async function toggleFollow() {
  followBusy.value = true
  try {
    if (isFollowing.value) {
      await followsService.unfollow(auth.user.id, profile.value.id)
      isFollowing.value = false
      counts.value.followers = Math.max(0, counts.value.followers - 1)
    } else {
      await followsService.follow(auth.user.id, profile.value.id)
      isFollowing.value = true
      counts.value.followers += 1
      if (profile.value.library_visibility === 'followers' && !books.value.length) loadBooks()
    }
  } catch {
    toast.error('Não foi possível atualizar.')
  } finally {
    followBusy.value = false
  }
}

const displayName = computed(
  () => profile.value?.display_name || profile.value?.username || 'Usuário',
)
</script>

<template>
  <div class="mx-auto max-w-5xl">
    <!-- loading -->
    <div v-if="loading" class="flex items-center gap-5">
      <Skeleton class="h-24 w-24 rounded-full" />
      <div class="space-y-3">
        <Skeleton class="h-7 w-48" />
        <Skeleton class="h-4 w-64" />
      </div>
    </div>

    <template v-else-if="profile">
      <!-- cabeçalho -->
      <div class="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div class="flex items-center gap-5">
          <span class="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-600 text-2xl font-semibold text-white">
            <img v-if="profile.avatar_url" :src="profile.avatar_url" :alt="displayName" class="h-full w-full object-cover" />
            <template v-else>{{ initialsOf(displayName) }}</template>
          </span>
          <div>
            <h1 class="text-3xl font-bold leading-tight">{{ displayName }}</h1>
            <p v-if="profile.username" class="text-sm text-slate-500 dark:text-slate-400">@{{ profile.username }}</p>
            <div class="mt-2 flex gap-4 text-sm">
              <span><strong>{{ counts.followers }}</strong> <span class="text-slate-500 dark:text-slate-400">seguidores</span></span>
              <span><strong>{{ counts.following }}</strong> <span class="text-slate-500 dark:text-slate-400">seguindo</span></span>
            </div>
          </div>
        </div>

        <BaseButton v-if="isMe" variant="secondary" @click="router.push({ name: 'settings' })">
          Editar perfil
        </BaseButton>
        <BaseButton
          v-else
          :variant="isFollowing ? 'secondary' : 'primary'"
          :loading="followBusy"
          @click="toggleFollow"
        >
          {{ isFollowing ? 'Seguindo' : 'Seguir' }}
        </BaseButton>
      </div>

      <!-- bio -->
      <p v-if="profile.bio" class="mt-5 whitespace-pre-line text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        {{ profile.bio }}
      </p>

      <!-- biblioteca -->
      <div class="mt-8">
        <h2 class="mb-3 font-semibold">Biblioteca</h2>

        <template v-if="canSeeLibrary">
          <BookGrid
            v-if="booksLoading || books.length"
            :books="books"
            :loading="booksLoading"
            @toggle-favorite="() => {}"
          />
          <EmptyState
            v-else
            icon="book"
            title="Nenhum livro público"
            message="Esta pessoa ainda não tem livros para mostrar."
          />
        </template>

        <div
          v-else
          class="card flex flex-col items-center gap-2 p-10 text-center text-sm text-slate-500 dark:text-slate-400"
        >
          <svg class="h-10 w-10 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.4"><path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
          {{ visibilityMessage }}
        </div>
      </div>
    </template>
  </div>
</template>
