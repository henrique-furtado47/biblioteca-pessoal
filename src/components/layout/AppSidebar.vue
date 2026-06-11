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
      <font-awesome-icon :icon="['fas', 'book']" class="h-7 w-7" />
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
          <font-awesome-icon :icon="['fab', 'instagram']" class="h-4 w-4" />
          Instagram
        </a>
        <a
          href="https://github.com/henrique-furtado47"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="GitHub"
          class="inline-flex items-center gap-1 transition hover:text-brand-600 dark:hover:text-brand-400"
        >
          <font-awesome-icon :icon="['fab', 'github']" class="h-4 w-4" />
          GitHub
        </a>
      </div>
    </div>
  </aside>
</template>
