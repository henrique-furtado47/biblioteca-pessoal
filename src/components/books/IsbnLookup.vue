<script setup>
import { ref } from 'vue'
import { useOpenLibrary } from '@/composables/useOpenLibrary'
import { useToast } from '@/composables/useToast'
import BaseButton from '@/components/ui/BaseButton.vue'

const emit = defineEmits(['found'])
const { loading, error, lookup } = useOpenLibrary()
const toast = useToast()
const isbn = ref('')

async function search() {
  const result = await lookup(isbn.value)
  if (result) {
    emit('found', result)
    toast.success('Dados preenchidos a partir do ISBN. Revise se necessário.')
  } else if (error.value) {
    toast.error(error.value)
  }
}
</script>

<template>
  <div class="rounded-xl border border-brand-200 bg-brand-50/60 p-4 dark:border-brand-900 dark:bg-brand-950/40">
    <label class="label-base flex items-center gap-2 text-brand-700 dark:text-brand-300">
      <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.3-4.3M11 19a8 8 0 100-16 8 8 0 000 16z"/></svg>
      Buscar por ISBN (Open Library)
    </label>
    <div class="flex gap-2">
      <input
        v-model="isbn"
        type="text"
        placeholder="Ex: 9788535914849"
        class="input-base"
        @keydown.enter.prevent="search"
      />
      <BaseButton :loading="loading" @click="search">Buscar</BaseButton>
    </div>
    <p class="mt-2 text-xs text-slate-500 dark:text-slate-400">
      Preenche título, autor, capa, ano, editora e descrição automaticamente.
    </p>
  </div>
</template>
