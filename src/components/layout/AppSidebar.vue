<script setup>
import { useProfileStore } from '@/stores/profile.store'
import { computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'

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
  { to: { name: 'dashboard' }, label: 'Dashboard',       faIcon: ['fas', 'table-cells-large'] },
  { to: { name: 'feed' },      label: 'Feed',             faIcon: ['fas', 'rss'] },
  { to: { name: 'catalog' },   label: 'Livros',           faIcon: ['fas', 'book'] },
  { to: { name: 'books' },     label: 'Meus Livros',      faIcon: ['fas', 'book-open'] },
  { to: { name: 'authors' },   label: 'Autores',          faIcon: ['fas', 'user-pen'] },
  { to: { name: 'wishlist' },  label: 'Lista de Desejos', faIcon: ['fas', 'gift'] },
  { to: { name: 'favorites' }, label: 'Favoritos',        faIcon: ['fas', 'heart'] },
  { to: { name: 'statistics' },label: 'Estatísticas',     faIcon: ['fas', 'chart-bar'] },
  { to: { name: 'community' }, label: 'Comunidade',       faIcon: ['fas', 'people-group'] },
  { to: { name: 'settings' },  label: 'Configurações',    faIcon: ['fas', 'gear'] },
]
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
        <font-awesome-icon :icon="item.faIcon" class="h-5 w-5 shrink-0" />
        {{ item.label }}
      </RouterLink>

      <RouterLink
        :to="myProfileTo"
        class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        active-class="!bg-brand-50 !text-brand-700 dark:!bg-brand-900/30 dark:!text-brand-200"
        @click="$emit('close')"
      >
        <font-awesome-icon :icon="['fas', 'user']" class="h-5 w-5 shrink-0" />
        Meu Perfil
      </RouterLink>
    </nav>

    <div class="border-t border-slate-200 p-4 text-xs text-slate-400 dark:border-slate-800">
      Minha Biblioteca · v{{ appVersion }} <br>
      Henrique Furtado
      <div class="mt-2 flex items-center gap-3">
        <a
          href="https://www.instagram.com/henrique.furtado47"
          target="_blank"
          rel="noopener noreferrer"   
          aria-label="Instagram"
          class="inline-flex items-center gap-1 transition hover:text-brand-600 dark:hover:text-brand-400"
        >
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
            <rect x="3" y="3" width="18" height="18" rx="5" ry="5" stroke-linecap="round" stroke-linejoin="round" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M17.5 6.5h.01" />
          </svg>
          Instagram
        </a>
        <a
          href="https://github.com/henrique-furtado47"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="GitHub"
          class="inline-flex items-center gap-1 transition hover:text-brand-600 dark:hover:text-brand-400"
        >
          <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 .5C5.73.5.67 5.56.67 11.83c0 5.02 3.24 9.27 7.74 10.77.57.1.78-.25.78-.55 0-.27-.01-1-.02-1.96-3.15.68-3.81-1.52-3.81-1.52-.51-1.31-1.26-1.66-1.26-1.66-1.03-.7.08-.69.08-.69 1.14.08 1.74 1.17 1.74 1.17 1.01 1.74 2.66 1.24 3.31.95.1-.74.4-1.24.72-1.52-2.51-.29-5.16-1.26-5.16-5.6 0-1.24.44-2.25 1.17-3.05-.12-.29-.51-1.45.11-3.02 0 0 .96-.31 3.14 1.17.91-.25 1.89-.38 2.86-.39.97.01 1.95.14 2.86.39 2.18-1.48 3.14-1.17 3.14-1.17.62 1.57.23 2.73.11 3.02.73.8 1.17 1.81 1.17 3.05 0 4.35-2.66 5.31-5.18 5.59.41.35.77 1.05.77 2.12 0 1.53-.01 2.76-.01 3.14 0 .3.21.66.79.55 4.49-1.5 7.73-5.75 7.73-10.77C23.33 5.56 18.27.5 12 .5z" />
          </svg>
          GitHub
        </a>
      </div>
    </div>
  </aside>
</template>
