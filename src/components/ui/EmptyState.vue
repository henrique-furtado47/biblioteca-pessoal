<script setup>
defineProps({
  title: { type: String, default: 'Nada por aqui ainda' },
  message: { type: String, default: '' },
  icon: { type: String, default: 'book' }, // book | search | heart | star
})
</script>

<template>
  <div class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 px-6 py-16 text-center dark:border-slate-700">
    <div class="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300">
      <font-awesome-icon :icon="{ search: ['fas', 'magnifying-glass'], heart: ['fas', 'heart'], star: ['fas', 'star'], users: ['fas', 'users'] }[icon] || ['fas', 'book']" class="h-8 w-8" />
    </div>
    <h3 class="text-base font-semibold text-slate-700 dark:text-slate-200">{{ title }}</h3>
    <p v-if="message" class="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{{ message }}</p>
    <div class="mt-5">
      <slot />
    </div>
  </div>
</template>
