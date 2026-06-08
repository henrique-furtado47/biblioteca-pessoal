<script setup>
import { reactive, ref } from 'vue'
import { storageService } from '@/services/storage.service'
import { useAuthStore } from '@/stores/auth.store'
import { useToast } from '@/composables/useToast'
import { initialsOf } from '@/utils/formatters'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'

const props = defineProps({
  author: { type: Object, required: true },
  submitting: { type: Boolean, default: false },
})
const emit = defineEmits(['submit', 'cancel'])

const auth = useAuthStore()
const toast = useToast()
const uploading = ref(false)
const fileInput = ref(null)
const errors = ref({})

const form = reactive({
  name: props.author.name || '',
  biography: props.author.biography || '',
  photo_url: props.author.photo_url || '',
})

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
    form.photo_url = await storageService.uploadCover(file, auth.user.id)
    toast.success('Foto enviada!')
  } catch {
    toast.error('Falha no upload da foto.')
  } finally {
    uploading.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}

function submit() {
  errors.value = {}
  if (!form.name.trim()) errors.value.name = 'O nome é obrigatório.'
  if (Object.keys(errors.value).length) return
  emit('submit', {
    name: form.name.trim(),
    biography: form.biography.trim() || null,
    photo_url: form.photo_url || null,
  })
}
</script>

<template>
  <form class="space-y-5" @submit.prevent="submit">
    <div class="flex items-center gap-4">
      <span class="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-600 text-lg font-semibold text-white">
        <img v-if="form.photo_url" :src="form.photo_url" :alt="form.name" class="h-full w-full object-cover" />
        <template v-else>{{ initialsOf(form.name) }}</template>
      </span>
      <div class="space-y-2">
        <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="onSelect" />
        <button
          type="button"
          class="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium transition hover:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:hover:bg-slate-800"
          :disabled="uploading"
          @click="fileInput?.click()"
        >
          {{ uploading ? 'Enviando...' : 'Enviar foto' }}
        </button>
        <button
          v-if="form.photo_url"
          type="button"
          class="block text-sm text-rose-600 hover:underline"
          @click="form.photo_url = ''"
        >
          Remover foto
        </button>
      </div>
    </div>

    <BaseInput v-model="form.name" label="Nome" :error="errors.name" required />

    <div>
      <label class="label-base">Biografia</label>
      <textarea
        v-model="form.biography"
        rows="6"
        class="input-base resize-y"
        placeholder="Biografia do autor..."
      />
    </div>

    <div class="flex justify-end gap-3 border-t border-slate-200 pt-5 dark:border-slate-800">
      <BaseButton variant="secondary" type="button" @click="$emit('cancel')">Cancelar</BaseButton>
      <BaseButton type="submit" :loading="submitting">Salvar</BaseButton>
    </div>
  </form>
</template>
