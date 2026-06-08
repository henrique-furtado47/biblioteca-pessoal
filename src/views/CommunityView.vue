<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { profilesService } from '@/services/profiles.service'
import { friendshipsService } from '@/services/friendships.service'
import { useAuthStore } from '@/stores/auth.store'
import { useToast } from '@/composables/useToast'
import { initialsOf } from '@/utils/formatters'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import EmptyState from '@/components/ui/EmptyState.vue'

const router = useRouter()
const auth = useAuthStore()
const toast = useToast()

const term = ref('')
const results = ref([])
const searching = ref(false)
const searched = ref(false)

const requests = ref([])
const friends = ref([])
const loadingLists = ref(true)

onMounted(loadLists)

async function loadLists() {
  loadingLists.value = true
  try {
    ;[requests.value, friends.value] = await Promise.all([
      friendshipsService.incomingRequests(auth.user.id),
      friendshipsService.listFriends(auth.user.id),
    ])
  } finally {
    loadingLists.value = false
  }
}

let searchTimer = null
function onSearchInput() {
  clearTimeout(searchTimer)
  const q = term.value.trim()
  if (q.length < 2) {
    results.value = []
    searched.value = false
    return
  }
  searchTimer = setTimeout(runSearch, 350)
}

async function runSearch() {
  searching.value = true
  try {
    const all = await profilesService.search(term.value.trim())
    results.value = all.filter((p) => p.id !== auth.user.id)
    searched.value = true
  } finally {
    searching.value = false
  }
}

async function accept(profile) {
  try {
    await friendshipsService.accept(auth.user.id, profile.id)
    requests.value = requests.value.filter((r) => r.id !== profile.id)
    friends.value.push(profile)
    toast.success(`Agora você e ${profile.display_name || profile.username} são amigos.`)
  } catch {
    toast.error('Não foi possível aceitar.')
  }
}

async function decline(profile) {
  try {
    await friendshipsService.remove(auth.user.id, profile.id)
    requests.value = requests.value.filter((r) => r.id !== profile.id)
  } catch {
    toast.error('Não foi possível recusar.')
  }
}

function openProfile(profile) {
  if (profile.username) router.push({ name: 'profile', params: { username: profile.username } })
}

const nameOf = (p) => p.display_name || p.username || 'Usuário'
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-8">
    <div>
      <h1 class="text-2xl font-bold">Comunidade</h1>
      <p class="text-sm text-slate-500 dark:text-slate-400">Encontre leitores, siga e faça amizades.</p>
    </div>

    <!-- busca -->
    <div>
      <BaseInput
        v-model="term"
        label="Buscar usuários"
        placeholder="Nome ou @usuario"
        @update:model-value="onSearchInput"
      />
      <div class="mt-3 space-y-2">
        <p v-if="searching" class="text-sm text-slate-400">Buscando...</p>
        <template v-else-if="results.length">
          <button
            v-for="p in results"
            :key="p.id"
            class="card flex w-full items-center gap-3 p-3 text-left transition hover:border-brand-400 dark:hover:border-brand-500"
            @click="openProfile(p)"
          >
            <span class="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-600 text-sm font-semibold text-white">
              <img v-if="p.avatar_url" :src="p.avatar_url" :alt="nameOf(p)" class="h-full w-full object-cover" />
              <template v-else>{{ initialsOf(nameOf(p)) }}</template>
            </span>
            <div class="min-w-0">
              <p class="truncate font-medium">{{ nameOf(p) }}</p>
              <p v-if="p.username" class="truncate text-sm text-slate-500 dark:text-slate-400">@{{ p.username }}</p>
            </div>
          </button>
        </template>
        <p v-else-if="searched" class="text-sm text-slate-400">Nenhum usuário encontrado.</p>
      </div>
    </div>

    <!-- pedidos recebidos -->
    <section v-if="requests.length">
      <h2 class="mb-3 font-semibold">Pedidos de amizade</h2>
      <div class="space-y-2">
        <div v-for="p in requests" :key="p.id" class="card flex items-center gap-3 p-3">
          <span class="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-600 text-sm font-semibold text-white">
            <img v-if="p.avatar_url" :src="p.avatar_url" :alt="nameOf(p)" class="h-full w-full object-cover" />
            <template v-else>{{ initialsOf(nameOf(p)) }}</template>
          </span>
          <button class="min-w-0 flex-1 text-left" @click="openProfile(p)">
            <p class="truncate font-medium">{{ nameOf(p) }}</p>
            <p v-if="p.username" class="truncate text-sm text-slate-500 dark:text-slate-400">@{{ p.username }}</p>
          </button>
          <BaseButton size="sm" @click="accept(p)">Aceitar</BaseButton>
          <BaseButton size="sm" variant="ghost" @click="decline(p)">Recusar</BaseButton>
        </div>
      </div>
    </section>

    <!-- amigos -->
    <section>
      <h2 class="mb-3 font-semibold">Meus amigos</h2>
      <div v-if="loadingLists" class="text-sm text-slate-400">Carregando...</div>
      <div v-else-if="friends.length" class="grid gap-3 sm:grid-cols-2">
        <button
          v-for="p in friends"
          :key="p.id"
          class="card flex items-center gap-3 p-3 text-left transition hover:border-brand-400 dark:hover:border-brand-500"
          @click="openProfile(p)"
        >
          <span class="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-600 text-sm font-semibold text-white">
            <img v-if="p.avatar_url" :src="p.avatar_url" :alt="nameOf(p)" class="h-full w-full object-cover" />
            <template v-else>{{ initialsOf(nameOf(p)) }}</template>
          </span>
          <div class="min-w-0">
            <p class="truncate font-medium">{{ nameOf(p) }}</p>
            <p v-if="p.username" class="truncate text-sm text-slate-500 dark:text-slate-400">@{{ p.username }}</p>
          </div>
        </button>
      </div>
      <EmptyState
        v-else
        icon="users"
        title="Nenhum amigo ainda"
        message="Busque leitores acima e envie pedidos de amizade."
      />
    </section>
  </div>
</template>
