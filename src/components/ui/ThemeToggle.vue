<script setup>
import { useThemeStore } from '@/stores/ui.store'
const theme = useThemeStore()
</script>

<template>
  <button
    class="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
    :title="theme.theme === 'dark' ? 'Tema claro' : 'Tema escuro'"
    @click="theme.toggle()"
  >
    <font-awesome-icon v-if="theme.theme === 'dark'" :icon="['fas', 'sun']" class="h-5 w-5" />
    <font-awesome-icon v-else :icon="['fas', 'moon']" class="h-5 w-5" />
  </button>
</template>
