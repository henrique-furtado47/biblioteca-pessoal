<script setup>
import { ref } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import { useToast } from '@/composables/useToast'
import { isStrongEnough } from '@/utils/validators'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'

const auth = useAuthStore()
const toast = useToast()
const router = useRouter()

const password = ref('')
const confirm = ref('')
const errors = ref({})
const loading = ref(false)

async function submit() {
  errors.value = {}
  if (!isStrongEnough(password.value)) errors.value.password = 'Mínimo de 6 caracteres.'
  if (password.value !== confirm.value) errors.value.confirm = 'As senhas não coincidem.'
  if (Object.keys(errors.value).length) return

  loading.value = true
  try {
    await auth.updatePassword(password.value)
    toast.success('Senha atualizada com sucesso!')
    router.push({ name: 'dashboard' })
  } catch {
    toast.error('Link expirado ou inválido. Solicite um novo.')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div>
    <h2 class="text-2xl font-bold">Nova senha</h2>
    <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Defina sua nova senha de acesso.</p>

    <form class="mt-8 space-y-4" @submit.prevent="submit">
      <BaseInput v-model="password" label="Nova senha" type="password" placeholder="••••••••" :error="errors.password" required />
      <BaseInput v-model="confirm" label="Confirmar senha" type="password" placeholder="••••••••" :error="errors.confirm" required />
      <BaseButton type="submit" block :loading="loading">Salvar nova senha</BaseButton>
    </form>

    <p class="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
      <RouterLink :to="{ name: 'login' }" class="font-semibold text-brand-600 hover:underline">Voltar ao login</RouterLink>
    </p>
  </div>
</template>
