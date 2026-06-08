<script setup>
import { ref } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import { useToast } from '@/composables/useToast'
import { isEmail, isStrongEnough } from '@/utils/validators'
import { profilesService } from '@/services/profiles.service'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'

const auth = useAuthStore()
const toast = useToast()
const router = useRouter()

const fullName = ref('')
const username = ref('')
const email = ref('')
const password = ref('')
const confirm = ref('')
const errors = ref({})

async function submit() {
  errors.value = {}
  const user = username.value.trim().toLowerCase()
  if (!fullName.value.trim()) errors.value.fullName = 'Informe seu nome.'
  if (!/^[a-z0-9_]{3,20}$/.test(user))
    errors.value.username = 'Use 3 a 20 caracteres: letras minúsculas, números ou _.'
  if (!isEmail(email.value)) errors.value.email = 'E-mail inválido.'
  if (!isStrongEnough(password.value)) errors.value.password = 'Mínimo de 6 caracteres.'
  if (password.value !== confirm.value) errors.value.confirm = 'As senhas não coincidem.'
  if (Object.keys(errors.value).length) return

  try {
    // Garante username único antes de criar a conta (perfil obrigatório)
    const available = await profilesService.isUsernameAvailablePublic(user)
    if (!available) {
      errors.value.username = 'Esse nome de usuário já está em uso.'
      return
    }

    const data = await auth.register(email.value, password.value, fullName.value.trim(), user)
    // Se a confirmação de e-mail estiver ativa, não há sessão imediata.
    if (data.session) {
      toast.success('Conta criada! Bem-vindo.')
      router.push({ name: 'dashboard' })
    } else {
      toast.info('Conta criada! Verifique seu e-mail para confirmar o acesso.')
      router.push({ name: 'login' })
    }
  } catch (e) {
    toast.error(e.message?.includes('already registered') ? 'E-mail já cadastrado.' : 'Falha no cadastro.')
  }
}
</script>

<template>
  <div>
    <h2 class="text-2xl font-bold">Criar conta</h2>
    <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Comece a organizar seus livros.</p>

    <form class="mt-8 space-y-4" @submit.prevent="submit">
      <BaseInput v-model="fullName" label="Nome completo" placeholder="Seu nome" :error="errors.fullName" required />
      <BaseInput v-model="username" label="Nome de usuário" placeholder="seu_usuario" :error="errors.username" hint="Será o link do seu perfil. Letras minúsculas, números e _." required />
      <BaseInput v-model="email" label="E-mail" type="email" placeholder="voce@email.com" :error="errors.email" required />
      <BaseInput v-model="password" label="Senha" type="password" placeholder="••••••••" :error="errors.password" required />
      <BaseInput v-model="confirm" label="Confirmar senha" type="password" placeholder="••••••••" :error="errors.confirm" required />

      <BaseButton type="submit" block :loading="auth.loading">Cadastrar</BaseButton>
    </form>

    <p class="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
      Já tem conta?
      <RouterLink :to="{ name: 'login' }" class="font-semibold text-brand-600 hover:underline">Entrar</RouterLink>
    </p>
  </div>
</template>
