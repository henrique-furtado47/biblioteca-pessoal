<script setup>
import { onMounted, ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { profilesService } from '@/services/profiles.service'
import { followsService } from '@/services/follows.service'
import { friendshipsService } from '@/services/friendships.service'
import { booksService } from '@/services/books.service'
import { useAuthStore } from '@/stores/auth.store'
import { useToast } from '@/composables/useToast'
import { initialsOf } from '@/utils/formatters'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
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
const friendStatus = ref('none') // none | pending_outgoing | pending_incoming | friends
const friendBusy = ref(false)

// Modal de seguidores / seguindo
const listOpen = ref(false)
const listType = ref('followers')
const listItems = ref([])
const listLoading = ref(false)

async function openList(type) {
  listType.value = type
  listOpen.value = true
  listLoading.value = true
  listItems.value = []
  try {
    listItems.value =
      type === 'followers'
        ? await followsService.followersList(profile.value.id)
        : await followsService.followingList(profile.value.id)
  } finally {
    listLoading.value = false
  }
}

function goToProfile(p) {
  if (!p.username) return
  listOpen.value = false
  router.push({ name: 'profile', params: { username: p.username } })
}

const listName = (p) => p.display_name || p.username || 'Usuário'

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

// Agrupa a estante: lendo primeiro, depois biblioteca, e desejos à parte
const reading = computed(() => books.value.filter((b) => b.status === 'reading'))
const wishlist = computed(() => books.value.filter((b) => b.status === 'wishlist'))
const library = computed(() =>
  books.value.filter((b) => b.status !== 'reading' && b.status !== 'wishlist'),
)

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
      ;[isFollowing.value, friendStatus.value] = await Promise.all([
        followsService.isFollowing(auth.user.id, p.id),
        friendshipsService.getStatus(auth.user.id, p.id),
      ])
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

async function friendAction() {
  friendBusy.value = true
  const me = auth.user.id
  const other = profile.value.id
  try {
    if (friendStatus.value === 'none') {
      await friendshipsService.sendRequest(me, other)
      friendStatus.value = 'pending_outgoing'
    } else if (friendStatus.value === 'pending_incoming') {
      await friendshipsService.accept(me, other)
      friendStatus.value = 'friends'
    } else {
      // pending_outgoing (cancelar) ou friends (desfazer)
      await friendshipsService.remove(me, other)
      friendStatus.value = 'none'
    }
  } catch {
    toast.error('Não foi possível atualizar a amizade.')
  } finally {
    friendBusy.value = false
  }
}

const friendLabel = computed(
  () =>
    ({
      none: 'Adicionar amigo',
      pending_outgoing: 'Pedido enviado',
      pending_incoming: 'Aceitar pedido',
      friends: 'Amigos ✓',
    })[friendStatus.value],
)

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
              <button class="hover:text-brand-600" @click="openList('followers')">
                <strong>{{ counts.followers }}</strong> <span class="text-slate-500 dark:text-slate-400">seguidores</span>
              </button>
              <button class="hover:text-brand-600" @click="openList('following')">
                <strong>{{ counts.following }}</strong> <span class="text-slate-500 dark:text-slate-400">seguindo</span>
              </button>
            </div>
          </div>
        </div>

        <BaseButton v-if="isMe" variant="secondary" @click="router.push({ name: 'settings' })">
          Editar perfil
        </BaseButton>
        <div v-else class="flex gap-2">
          <BaseButton
            :variant="isFollowing ? 'secondary' : 'primary'"
            :loading="followBusy"
            @click="toggleFollow"
          >
            {{ isFollowing ? 'Seguindo' : 'Seguir' }}
          </BaseButton>
          <BaseButton
            :variant="friendStatus === 'pending_incoming' ? 'primary' : 'secondary'"
            :loading="friendBusy"
            @click="friendAction"
          >
            {{ friendLabel }}
          </BaseButton>
        </div>
      </div>

      <!-- bio -->
      <p v-if="profile.bio" class="mt-5 whitespace-pre-line text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        {{ profile.bio }}
      </p>

      <!-- biblioteca -->
      <div class="mt-8">
        <template v-if="canSeeLibrary">
          <!-- carregando -->
          <BookGrid v-if="booksLoading" :books="[]" loading :readonly="!isMe" />

          <template v-else-if="books.length">
            <section v-if="reading.length" class="mb-8">
              <h2 class="mb-3 font-semibold">Lendo agora</h2>
              <BookGrid :books="reading" :readonly="!isMe" :book-page="!isMe" />
            </section>

            <section v-if="library.length" class="mb-8">
              <h2 class="mb-3 font-semibold">Biblioteca</h2>
              <BookGrid :books="library" :readonly="!isMe" :book-page="!isMe" />
            </section>

            <section v-if="wishlist.length">
              <h2 class="mb-3 font-semibold">Lista de desejos</h2>
              <BookGrid :books="wishlist" :readonly="!isMe" :book-page="!isMe" />
            </section>
          </template>

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

    <!-- modal de seguidores / seguindo -->
    <BaseModal v-model="listOpen" :title="listType === 'followers' ? 'Seguidores' : 'Seguindo'">
      <p v-if="listLoading" class="text-sm text-slate-400">Carregando...</p>
      <ul v-else-if="listItems.length" class="space-y-1">
        <li v-for="p in listItems" :key="p.id">
          <button
            class="flex w-full items-center gap-3 rounded-lg p-2 text-left transition hover:bg-slate-100 dark:hover:bg-slate-800"
            @click="goToProfile(p)"
          >
            <span class="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-600 text-xs font-semibold text-white">
              <img v-if="p.avatar_url" :src="p.avatar_url" :alt="listName(p)" class="h-full w-full object-cover" />
              <template v-else>{{ initialsOf(listName(p)) }}</template>
            </span>
            <span class="min-w-0">
              <span class="block truncate text-sm font-medium">{{ listName(p) }}</span>
              <span v-if="p.username" class="block truncate text-xs text-slate-500 dark:text-slate-400">@{{ p.username }}</span>
            </span>
          </button>
        </li>
      </ul>
      <p v-else class="py-6 text-center text-sm text-slate-400">
        {{ listType === 'followers' ? 'Nenhum seguidor ainda.' : 'Não está seguindo ninguém ainda.' }}
      </p>
    </BaseModal>
  </div>
</template>
