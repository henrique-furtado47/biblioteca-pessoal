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

const faIcons = {
  book:    ['fas', 'book'],
  check:   ['fas', 'check'],
  reading: ['fas', 'list'],
  x:       ['fas', 'xmark'],
  gift:    ['fas', 'gift'],
  star:    ['fas', 'star'],
}
</script>

<template>
  <div class="card flex items-center gap-4 p-5">
    <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl" :class="accents[accent]">
      <font-awesome-icon :icon="faIcons[icon] || ['fas', 'book']" class="h-6 w-6" />
    </div>
    <div>
      <p class="text-2xl font-bold">{{ value }}</p>
      <p class="text-sm text-slate-500 dark:text-slate-400">{{ label }}</p>
    </div>
  </div>
</template>
