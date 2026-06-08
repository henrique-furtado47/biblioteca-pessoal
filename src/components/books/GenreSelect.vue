<script setup>
import { onMounted } from 'vue'
import { useGenresStore } from '@/stores/genres.store'
import Skeleton from '@/components/ui/Skeleton.vue'

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
})
const emit = defineEmits(['update:modelValue'])

const genresStore = useGenresStore()

onMounted(() => genresStore.fetch())

function toggle(id) {
  const set = new Set(props.modelValue)
  if (set.has(id)) set.delete(id)
  else set.add(id)
  emit('update:modelValue', [...set])
}

const isSelected = (id) => props.modelValue.includes(id)
</script>

<template>
  <div>
    <span class="label-base">Gêneros</span>

    <div v-if="genresStore.loading" class="flex flex-wrap gap-2">
      <Skeleton v-for="n in 8" :key="n" class="h-8 w-24 rounded-full" />
    </div>

    <div v-else class="flex flex-wrap gap-2">
      <button
        v-for="genre in genresStore.items"
        :key="genre.id"
        type="button"
        class="rounded-full border px-3 py-1.5 text-sm font-medium transition"
        :class="
          isSelected(genre.id)
            ? 'border-brand-600 bg-brand-600 text-white'
            : 'border-slate-300 text-slate-600 hover:border-brand-400 hover:text-brand-600 dark:border-slate-700 dark:text-slate-300 dark:hover:border-brand-500'
        "
        @click="toggle(genre.id)"
      >
        {{ genre.name }}
      </button>
    </div>
  </div>
</template>
