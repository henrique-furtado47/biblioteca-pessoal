<script setup>
import { computed } from 'vue'

const props = defineProps({
  page: { type: Number, required: true },
  totalPages: { type: Number, required: true },
})
const emit = defineEmits(['update:page'])

const pages = computed(() => {
  const total = props.totalPages
  const cur = props.page
  const arr = []
  const start = Math.max(1, cur - 2)
  const end = Math.min(total, start + 4)
  for (let i = Math.max(1, end - 4); i <= end; i++) arr.push(i)
  return arr
})

function go(p) {
  if (p < 1 || p > props.totalPages || p === props.page) return
  emit('update:page', p)
}
</script>

<template>
  <nav v-if="totalPages > 1" class="flex items-center justify-center gap-1.5">
    <button
      class="rounded-lg border border-slate-200 px-3 py-1.5 text-sm transition hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800"
      :disabled="page === 1"
      @click="go(page - 1)"
    >
      Anterior
    </button>
    <button
      v-for="p in pages"
      :key="p"
      class="min-w-[2.25rem] rounded-lg border px-3 py-1.5 text-sm transition"
      :class="
        p === page
          ? 'border-brand-600 bg-brand-600 text-white'
          : 'border-slate-200 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800'
      "
      @click="go(p)"
    >
      {{ p }}
    </button>
    <button
      class="rounded-lg border border-slate-200 px-3 py-1.5 text-sm transition hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800"
      :disabled="page === totalPages"
      @click="go(page + 1)"
    >
      Próxima
    </button>
  </nav>
</template>
