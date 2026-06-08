<script setup>
defineProps({
  label: { type: String, required: true },
  value: { type: [Number, String], default: 0 },
  icon: { type: String, default: 'book' },
  accent: { type: String, default: 'brand' }, // brand | emerald | blue | rose | amber
})

const accents = {
  brand: 'bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300',
  emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300',
  blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300',
  rose: 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-300',
  amber: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300',
}

const icons = {
  book: 'M12 6.5C10.5 5.5 8.5 5 6.5 5H4v12.5h2.5c2 0 4 .5 5.5 1.5m0-12.5c1.5-1 3.5-1.5 5.5-1.5H20V17.5h-2.5c-2 0-4 .5-5.5 1.5m0-12.5V19',
  check: 'M5 13l4 4L19 7',
  reading: 'M3 5h18M3 12h18M3 19h12',
  x: 'M6 18L18 6M6 6l12 12',
  gift: 'M21 11.5V21H3v-9.5M1 7h22v4.5H1V7zm11 0v14',
}
</script>

<template>
  <div class="card flex items-center gap-4 p-5">
    <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl" :class="accents[accent]">
      <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" :d="icons[icon]" /></svg>
    </div>
    <div>
      <p class="text-2xl font-bold">{{ value }}</p>
      <p class="text-sm text-slate-500 dark:text-slate-400">{{ label }}</p>
    </div>
  </div>
</template>
