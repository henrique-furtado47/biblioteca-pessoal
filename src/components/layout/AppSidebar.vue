<script setup>
import { computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useProfileStore } from '@/stores/profile.store'

defineProps({ open: { type: Boolean, default: false } })
defineEmits(['close'])

const profileStore = useProfileStore()
onMounted(() => profileStore.loadMe())

// Injetado pelo Vite (define) a partir do package.json
const appVersion = __APP_VERSION__

// Se ainda não houver username, leva para Configurações para defini-lo
const myProfileTo = computed(() =>
  profileStore.username
    ? { name: 'profile', params: { username: profileStore.username } }
    : { name: 'settings' },
)

const nav = [
  { to: { name: 'dashboard' }, label: 'Dashboard', icon: 'grid' },
  { to: { name: 'catalog' }, label: 'Livros', icon: 'book' },
  { to: { name: 'books' }, label: 'Meus Livros', icon: 'shelf' },
  { to: { name: 'authors' }, label: 'Autores', icon: 'users' },
  { to: { name: 'wishlist' }, label: 'Lista de Desejos', icon: 'gift' },
  { to: { name: 'favorites' }, label: 'Favoritos', icon: 'heart' },
  { to: { name: 'statistics' }, label: 'Estatísticas', icon: 'chart' },
  { to: { name: 'community' }, label: 'Comunidade', icon: 'users' },
  { to: { name: 'settings' }, label: 'Configurações', icon: 'cog' },
]

const icons = {
  grid: 'M4 5h6v6H4V5zm10 0h6v6h-6V5zM4 15h6v4H4v-4zm10 0h6v4h-6v-4z',
  book: 'M12 6.5C10.5 5.5 8.5 5 6.5 5H4v12.5h2.5c2 0 4 .5 5.5 1.5m0-12.5c1.5-1 3.5-1.5 5.5-1.5H20V17.5h-2.5c-2 0-4 .5-5.5 1.5m0-12.5V19',
  users: 'M17 20h5v-1a4 4 0 00-4-4h-1m-6 5H2v-1a4 4 0 014-4h4m1-4a4 4 0 100-8 4 4 0 000 8z',
  gift: 'M21 11.5V21H3v-9.5M1 7h22v4.5H1V7zm11 0v14M12 7S10 2.5 7 3.5 9 7 12 7zm0 0s2-4.5 5-3.5-1 3.5-5 3.5z',
  heart: 'M21 8.25c0-2.5-2-4.25-4.2-4.25-1.6 0-3 .9-3.8 2.3C12.2 4.9 10.8 4 9.2 4 7 4 5 5.75 5 8.25c0 4.4 7 9.75 7 9.75s7-5.35 7-9.75z',
  chart: 'M4 19V5m6 14V9m6 10V13m-12 6h16',
  cog: 'M12 15a3 3 0 100-6 3 3 0 000 6zm7.4-3a7.4 7.4 0 00-.1-1l2-1.6-2-3.4-2.4 1a7 7 0 00-1.7-1l-.4-2.5h-3.8L9.6 4a7 7 0 00-1.7 1l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 000 2l-2 1.6 2 3.4 2.4-1a7 7 0 001.7 1l.4 2.5h3.8l.4-2.5a7 7 0 001.7-1l2.4 1 2-3.4-2-1.6c.06-.33.1-.66.1-1z',
  user: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14c-4 0-7 2-7 5v1h14v-1c0-3-3-5-7-5z',
  shelf: 'M4 5h16M4 5v14M4 19h16M20 5v14M8 5v14m4-14v14',
}
</script>

<template>
  <!-- overlay mobile -->
  <div
    v-if="open"
    class="fixed inset-0 z-30 bg-slate-900/40 lg:hidden"
    @click="$emit('close')"
  />

  <aside
    class="fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform dark:border-slate-800 dark:bg-slate-900 lg:translate-x-0"
    :class="open ? 'translate-x-0' : '-translate-x-full'"
  >
    <div class="flex h-16 items-center gap-2 px-5 text-lg font-bold text-brand-600">
      <svg class="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.6"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.5C10.5 5.5 8.5 5 6.5 5H4v12.5h2.5c2 0 4 .5 5.5 1.5m0-12.5c1.5-1 3.5-1.5 5.5-1.5H20V17.5h-2.5c-2 0-4 .5-5.5 1.5m0-12.5V19"/></svg>
      Biblioteca
    </div>

    <nav class="flex-1 space-y-1 overflow-y-auto px-3 py-4">
      <RouterLink
        v-for="item in nav"
        :key="item.label"
        :to="item.to"
        class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        active-class="!bg-brand-50 !text-brand-700 dark:!bg-brand-900/30 dark:!text-brand-200"
        @click="$emit('close')"
      >
        <svg class="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
          <path stroke-linecap="round" stroke-linejoin="round" :d="icons[item.icon]" />
        </svg>
        {{ item.label }}
      </RouterLink>

      <RouterLink
        :to="myProfileTo"
        class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        active-class="!bg-brand-50 !text-brand-700 dark:!bg-brand-900/30 dark:!text-brand-200"
        @click="$emit('close')"
      >
        <svg class="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
          <path stroke-linecap="round" stroke-linejoin="round" :d="icons.user" />
        </svg>
        Meu Perfil
      </RouterLink>
    </nav>

    <div class="border-t border-slate-200 p-4 text-xs text-slate-400 dark:border-slate-800">
      Minha Biblioteca · v{{ appVersion }}
    </div>
  </aside>
</template>
