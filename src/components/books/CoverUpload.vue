<script setup>
import { ref } from 'vue'
import { storageService } from '@/services/storage.service'
import { useAuthStore } from '@/stores/auth.store'
import { useToast } from '@/composables/useToast'

const props = defineProps({
  modelValue: { type: String, default: '' },
})
const emit = defineEmits(['update:modelValue'])

const auth = useAuthStore()
const toast = useToast()
const uploading = ref(false)
const fileInput = ref(null)

async function onSelect(e) {
  const file = e.target.files?.[0]
  if (!file) return
  if (!file.type.startsWith('image/')) {
    toast.error('Selecione um arquivo de imagem.')
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    toast.error('Imagem muito grande (máx. 5MB).')
    return
  }
  uploading.value = true
  try {
    const url = await storageService.uploadCover(file, auth.user.id)
    emit('update:modelValue', url)
    toast.success('Capa enviada!')
  } catch {
    toast.error('Falha no upload da capa.')
  } finally {
    uploading.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}

function clear() {
  emit('update:modelValue', '')
}
</script>

<template>
  <div>
    <span class="label-base">Capa</span>
    <div class="flex items-start gap-4">
      <div class="relative h-40 w-28 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
        <img v-if="modelValue" :src="modelValue" alt="Capa" class="h-full w-full object-cover" />
        <div v-else class="flex h-full w-full items-center justify-center text-slate-300 dark:text-slate-600">
          <font-awesome-icon :icon="['fas', 'image']" class="h-10 w-10" />
        </div>
      </div>

      <div class="space-y-2">
        <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="onSelect" />
        <button
          type="button"
          class="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium transition hover:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:hover:bg-slate-800"
          :disabled="uploading"
          @click="fileInput?.click()"
        >
          {{ uploading ? 'Enviando...' : 'Enviar imagem' }}
        </button>
        <button
          v-if="modelValue"
          type="button"
          class="block text-sm text-rose-600 hover:underline"
          @click="clear"
        >
          Remover capa
        </button>
        <p class="text-xs text-slate-400">JPG, PNG ou WebP. Máx. 5MB.</p>
      </div>
    </div>
  </div>
</template>
