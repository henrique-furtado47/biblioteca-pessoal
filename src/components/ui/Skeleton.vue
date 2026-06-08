<script setup>
defineProps({
  // utilitário simples: passe classes de tamanho/forma via `class`
  rounded: { type: String, default: 'rounded-lg' },
})
</script>

<template>
  <div class="animate-pulse bg-slate-200 dark:bg-slate-800" :class="rounded" />
</template>
