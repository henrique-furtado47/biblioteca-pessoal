<script setup>
import { STATUS_OPTIONS, SORT_OPTIONS } from '@/constants'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseButton from '@/components/ui/BaseButton.vue'

const props = defineProps({
  filters: { type: Object, required: true },
  authors: { type: Array, default: () => [] },
})
const emit = defineEmits(['change', 'reset'])

const ratingOptions = [
  { value: '', label: 'Qualquer nota' },
  { value: '4', label: '4+ estrelas' },
  { value: '3', label: '3+ estrelas' },
  { value: '2', label: '2+ estrelas' },
]

function update(key, value) {
  emit('change', { [key]: value })
}
</script>

<template>
  <div class="card flex flex-wrap items-end gap-3 p-4">
    <div class="min-w-[10rem] flex-1">
      <BaseSelect
        :model-value="filters.status"
        label="Status"
        placeholder="Todos os status"
        :options="STATUS_OPTIONS"
        @update:model-value="(v) => update('status', v)"
      />
    </div>
    <div class="min-w-[10rem] flex-1">
      <BaseSelect
        :model-value="filters.authorId"
        label="Autor"
        placeholder="Todos os autores"
        :options="authors.map((a) => ({ value: a.id, label: a.name }))"
        @update:model-value="(v) => update('authorId', v)"
      />
    </div>
    <div class="min-w-[8rem] flex-1">
      <BaseSelect
        :model-value="filters.minRating"
        label="Nota mínima"
        :options="ratingOptions"
        @update:model-value="(v) => update('minRating', v)"
      />
    </div>
    <div class="min-w-[10rem] flex-1">
      <BaseSelect
        :model-value="filters.sort"
        label="Ordenar por"
        :options="SORT_OPTIONS"
        @update:model-value="(v) => update('sort', v)"
      />
    </div>
    <BaseButton variant="ghost" @click="$emit('reset')">Limpar filtros</BaseButton>
  </div>
</template>
