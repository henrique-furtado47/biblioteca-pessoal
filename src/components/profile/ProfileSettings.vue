<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useProfileStore } from '@/stores/profile.store'
import { profilesService } from '@/services/profiles.service'
import { storageService } from '@/services/storage.service'
import { useAuthStore } from '@/stores/auth.store'
import { useToast } from '@/composables/useToast'
import { initialsOf } from '@/utils/formatters'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseButton from '@/components/ui/BaseButton.vue'

const profileStore = useProfileStore()
const auth = useAuthStore()
const toast = useToast()

const VISIBILITY_OPTIONS = [
  { value: 'public', label: 'Pública — qualquer pessoa pode ver' },
  { value: 'followers', label: 'Somente seguidores' },
  { value: 'private', label: 'Privada — só eu' },
]

const loading = ref(true)
const saving = ref(false)
const uploading = ref(false)
const fileInput = ref(null)
const errors = ref({})

const form = reactive({
  username: '',
  display_name: '',
  bio: '',
  avatar_url: '',
  library_visibility: 'public',
})

onMounted(async () => {
  try {
    const me = await profileStore.loadMe()
    if (me) {
      form.username = me.username || ''
      form.display_name = me.display_name || ''
      form.bio = me.bio || ''
      form.avatar_url = me.avatar_url || ''
      form.library_visibility = me.library_visibility || 'public'
    }
  } finally {
    loading.value = false
  }
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
    form.avatar_url = await storageService.uploadCover(file, auth.user.id)
  } catch {
    toast.error('Falha no upload da imagem.')
  } finally {
    uploading.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}

async function save() {
  errors.value = {}
  const username = form.username.trim().toLowerCase()

  if (!/^[a-z0-9_]{3,20}$/.test(username)) {
    errors.value.username = 'Use 3 a 20 caracteres: letras minúsculas, números ou _.'
    return
  }

  saving.value = true
  try {
    const available = await profilesService.isUsernameAvailable(username, auth.user.id)
    if (!available) {
      errors.value.username = 'Esse nome de usuário já está em uso.'
      return
    }
    await profileStore.updateMe({
      username,
      display_name: form.display_name.trim() || null,
      bio: form.bio.trim() || null,
      avatar_url: form.avatar_url || null,
      library_visibility: form.library_visibility,
    })
    form.username = username
    toast.success('Perfil atualizado!')
  } catch (e) {
    toast.error('Erro ao salvar o perfil.')
    console.error(e)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <section class="card p-6">
    <h2 class="mb-1 text-lg font-semibold">Perfil público</h2>
    <p class="mb-4 text-sm text-slate-500 dark:text-slate-400">
      Como você aparece para outras pessoas na rede.
    </p>

    <div v-if="loading" class="text-sm text-slate-400">Carregando...</div>

    <form v-else class="space-y-5" @submit.prevent="save">
      <!-- avatar -->
      <div class="flex items-center gap-4">
        <span class="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-600 text-lg font-semibold text-white">
          <img v-if="form.avatar_url" :src="form.avatar_url" alt="Avatar" class="h-full w-full object-cover" />
          <template v-else>{{ initialsOf(form.display_name || form.username) }}</template>
        </span>
        <div class="space-y-2">
          <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="onSelect" />
          <button
            type="button"
            class="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium transition hover:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:hover:bg-slate-800"
            :disabled="uploading"
            @click="fileInput?.click()"
          >
            {{ uploading ? 'Enviando...' : 'Enviar avatar' }}
          </button>
          <button
            v-if="form.avatar_url"
            type="button"
            class="block text-sm text-rose-600 hover:underline"
            @click="form.avatar_url = ''"
          >
            Remover
          </button>
        </div>
      </div>

      <BaseInput
        v-model="form.username"
        label="Nome de usuário"
        placeholder="seu_usuario"
        :error="errors.username"
        hint="Usado no link do seu perfil. Apenas letras minúsculas, números e _."
        required
      />
      <BaseInput v-model="form.display_name" label="Nome de exibição" placeholder="Seu nome" />

      <div>
        <label class="label-base">Bio</label>
        <textarea v-model="form.bio" rows="3" class="input-base resize-y" placeholder="Fale um pouco sobre você e suas leituras..." />
      </div>

      <BaseSelect
        v-model="form.library_visibility"
        label="Visibilidade da biblioteca"
        :options="VISIBILITY_OPTIONS"
      />

      <div class="flex justify-end border-t border-slate-200 pt-5 dark:border-slate-800">
        <BaseButton type="submit" :loading="saving">Salvar perfil</BaseButton>
      </div>
    </form>
  </section>
</template>
