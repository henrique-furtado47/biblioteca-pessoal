<script setup>
import { ref } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import { useToast } from '@/composables/useToast'
import { isEmail } from '@/utils/validators'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'

const auth = useAuthStore()
const toast = useToast()
const router = useRouter()
const route = useRoute()

const email = ref('')
const password = ref('')
const errors = ref({})

async function submit() {
  errors.value = {}
  if (!isEmail(email.value)) errors.value.email = 'E-mail inválido.'
  if (!password.value) errors.value.password = 'Informe a senha.'
  if (Object.keys(errors.value).length) return

  try {
    await auth.login(email.value, password.value)
    toast.success('Bem-vindo de volta!')
    router.push(route.query.redirect || { name: 'dashboard' })
  } catch (e) {
    const msg = e.message || ''
    if (msg === 'Invalid login credentials') {
      toast.error('E-mail ou senha incorretos.')
    } else if (msg.toLowerCase().includes('email not confirmed')) {
      toast.error('Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.')
    } else {
      toast.error('Falha no login.')
    }
  }
}
</script>

<template>
  <div>
    <h2 class="text-2xl font-bold">Entrar</h2>
    <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
      Acesse sua biblioteca pessoal.
    </p>

    <form class="mt-8 space-y-4" @submit.prevent="submit">
      <BaseInput v-model="email" label="E-mail" type="email" placeholder="voce@email.com" :error="errors.email" required />
      <BaseInput v-model="password" label="Senha" type="password" placeholder="••••••••" :error="errors.password" required />

      <div class="flex justify-end">
        <RouterLink :to="{ name: 'forgot-password' }" class="text-sm font-medium text-brand-600 hover:underline">
          Esqueceu a senha?
        </RouterLink>
      </div>

      <BaseButton type="submit" block :loading="auth.loading">Entrar</BaseButton>
    </form>

    <p class="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
      Não tem conta?
      <RouterLink :to="{ name: 'register' }" class="font-semibold text-brand-600 hover:underline">Cadastre-se</RouterLink>
    </p>
  </div>
</template>
