<script setup>
import { ref, watch, onBeforeUnmount } from 'vue'
import { useBookLookup } from '@/composables/useBookLookup'
import { useToast } from '@/composables/useToast'
import { isValidIsbn } from '@/utils/validators'
import BaseButton from '@/components/ui/BaseButton.vue'
import Skeleton from '@/components/ui/Skeleton.vue'

const emit = defineEmits(['found'])
const { loading, error, source, lookup } = useBookLookup()
const toast = useToast()

const isbn = ref('')
const lastSearched = ref('')
let timer = null

async function search(auto = false) {
  const value = isbn.value.trim()
  if (loading.value) return
  // evita repetir a mesma busca
  if (value === lastSearched.value && (source.value || error.value)) return
  lastSearched.value = value

  const result = await lookup(value)
  if (result) {
    emit('found', result)
    toast.success(`Dados obtidos via ${source.value}. Revise antes de salvar.`)
  } else if (error.value && !auto) {
    // em busca automática, não incomoda com toast de "não encontrado"
    toast.error(error.value)
  }
}

// Debounce: busca automática ao digitar um ISBN válido
watch(isbn, (value) => {
  clearTimeout(timer)
  const v = value.trim()
  if (!isValidIsbn(v) || v === lastSearched.value) return
  timer = setTimeout(() => search(true), 700)
})

onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <div class="rounded-xl border border-brand-200 bg-brand-50/60 p-4 dark:border-brand-900 dark:bg-brand-950/40">
    <label class="label-base flex items-center gap-2 text-brand-700 dark:text-brand-300">
      <font-awesome-icon :icon="['fas', 'magnifying-glass']" class="h-4 w-4" />
      Buscar por ISBN
    </label>
    <div class="flex gap-2">
      <input
        v-model="isbn"
        type="text"
        inputmode="numeric"
        placeholder="Ex: 9788535914849"
        class="input-base"
        :disabled="loading"
        @keydown.enter.prevent="search(false)"
      />
      <BaseButton :loading="loading" :disabled="loading" @click="search(false)">Buscar</BaseButton>
    </div>

    <!-- loading -->
    <div v-if="loading" class="mt-3 flex items-center gap-3">
      <Skeleton class="h-14 w-10 shrink-0" />
      <div class="flex-1 space-y-2">
        <Skeleton class="h-3 w-2/3" />
        <Skeleton class="h-3 w-1/3" />
      </div>
    </div>

    <!-- indicador de fonte -->
    <p v-else-if="source" class="mt-2 flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
      <font-awesome-icon :icon="['fas', 'check']" class="h-4 w-4" />
      Dados obtidos via {{ source }}
    </p>

    <p v-else class="mt-2 text-xs text-slate-500 dark:text-slate-400">
      Preenche título, autor, capa, descrição, gêneros e mais — via Google Books ou Open Library.
    </p>
  </div>
</template>
