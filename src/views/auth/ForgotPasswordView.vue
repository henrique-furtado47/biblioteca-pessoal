<script setup>
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import { useToast } from '@/composables/useToast'
import { isEmail } from '@/utils/validators'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'

const auth = useAuthStore()
const toast = useToast()

const email = ref('')
const error = ref('')
const sent = ref(false)
const loading = ref(false)

async function submit() {
  error.value = ''
  if (!isEmail(email.value)) {
    error.value = 'E-mail inválido.'
    return
  }
  loading.value = true
  try {
    await auth.sendPasswordReset(email.value)
    sent.value = true
    toast.success('Link de recuperação enviado!')
  } catch {
    toast.error('Não foi possível enviar o e-mail.')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div>
    <h2 class="text-2xl font-bold">Recuperar senha</h2>
    <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
      Enviaremos um link para você redefinir a senha.
    </p>

    <div v-if="sent" class="mt-8 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
      Verifique sua caixa de entrada em <strong>{{ email }}</strong> e siga o link para criar uma nova senha.
    </div>

    <form v-else class="mt-8 space-y-4" @submit.prevent="submit">
      <BaseInput v-model="email" label="E-mail" type="email" placeholder="voce@email.com" :error="error" required />
      <BaseButton type="submit" block :loading="loading">Enviar link</BaseButton>
    </form>

    <p class="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
      <RouterLink :to="{ name: 'login' }" class="font-semibold text-brand-600 hover:underline">Voltar ao login</RouterLink>
    </p>
  </div>
</template>
