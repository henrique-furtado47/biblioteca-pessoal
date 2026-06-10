<script setup>
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth.store'
import { authService } from '@/services/auth.service'
import { useToast } from '@/composables/useToast'
import { isStrongEnough } from '@/utils/validators'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'

const auth = useAuthStore()
const toast = useToast()

const current = ref('')
const password = ref('')
const confirm = ref('')
const errors = ref({})
const saving = ref(false)
const sendingReset = ref(false)

async function submit() {
  errors.value = {}
  if (!current.value) errors.value.current = 'Informe a senha atual.'
  if (!isStrongEnough(password.value)) errors.value.password = 'Mínimo de 6 caracteres.'
  if (password.value !== confirm.value) errors.value.confirm = 'As senhas não coincidem.'
  if (Object.keys(errors.value).length) return

  saving.value = true
  try {
    // confirma a senha atual reautenticando
    try {
      await authService.signIn(auth.email, current.value)
    } catch {
      errors.value.current = 'Senha atual incorreta.'
      return
    }
    await auth.updatePassword(password.value)
    toast.success('Senha alterada com sucesso!')
    current.value = ''
    password.value = ''
    confirm.value = ''
  } catch {
    toast.error('Não foi possível alterar a senha.')
  } finally {
    saving.value = false
  }
}

async function sendReset() {
  sendingReset.value = true
  try {
    await auth.sendPasswordReset(auth.email)
    toast.success(`Link de redefinição enviado para ${auth.email}.`)
  } catch {
    toast.error('Não foi possível enviar o e-mail.')
  } finally {
    sendingReset.value = false
  }
}
</script>

<template>
  <section class="card p-6">
    <h2 class="mb-1 text-lg font-semibold">Segurança</h2>
    <p class="mb-4 text-sm text-slate-500 dark:text-slate-400">Para alterar, confirme sua senha atual.</p>

    <form class="space-y-4" @submit.prevent="submit">
      <BaseInput v-model="current" label="Senha atual" type="password" placeholder="••••••••" :error="errors.current" />
      <BaseInput v-model="password" label="Nova senha" type="password" placeholder="••••••••" :error="errors.password" />
      <BaseInput v-model="confirm" label="Confirmar nova senha" type="password" placeholder="••••••••" :error="errors.confirm" />

      <div class="flex items-center justify-between gap-3">
        <button type="button" class="text-sm text-brand-600 hover:underline disabled:opacity-60" :disabled="sendingReset" @click="sendReset">
          Esqueci minha senha atual
        </button>
        <BaseButton type="submit" :loading="saving">Alterar senha</BaseButton>
      </div>
    </form>
  </section>
</template>
