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
      <svg v-if="icon === 'search'" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.3-4.3M11 19a8 8 0 100-16 8 8 0 000 16z"/></svg>
      <svg v-else-if="icon === 'heart'" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.5-2-4.25-4.2-4.25-1.6 0-3 .9-3.8 2.3C12.2 4.9 10.8 4 9.2 4 7 4 5 5.75 5 8.25c0 4.4 7 9.75 7 9.75s7-5.35 7-9.75z"/></svg>
      <svg v-else-if="icon === 'star'" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M11.5 3.5l2.3 4.7 5.2.8-3.8 3.7.9 5.2-4.6-2.4-4.6 2.4.9-5.2L4 9l5.2-.8z"/></svg>
      <svg v-else class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.5C10.5 5.5 8.5 5 6.5 5H4v12.5h2.5c2 0 4 .5 5.5 1.5m0-12.5c1.5-1 3.5-1.5 5.5-1.5H20V17.5h-2.5c-2 0-4 .5-5.5 1.5m0-12.5V19"/></svg>
    </div>
    <h3 class="text-base font-semibold text-slate-700 dark:text-slate-200">{{ title }}</h3>
    <p v-if="message" class="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{{ message }}</p>
    <div class="mt-5">
      <slot />
    </div>
  </div>
</template>
