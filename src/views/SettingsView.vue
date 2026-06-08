<script setup>
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import { useThemeStore } from '@/stores/ui.store'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
import BaseButton from '@/components/ui/BaseButton.vue'

const router = useRouter()
const auth = useAuthStore()
const theme = useThemeStore()
const toast = useToast()
const confirm = useConfirm()

async function logout() {
  const ok = await confirm({
    title: 'Sair da conta',
    message: 'Deseja realmente encerrar a sessão?',
    confirmText: 'Sair',
    variant: 'danger',
  })
  if (!ok) return
  await auth.logout()
  toast.success('Sessão encerrada.')
  router.push({ name: 'login' })
}
</script>

<template>
  <div class="mx-auto max-w-2xl space-y-6">
    <h1 class="text-2xl font-bold">Configurações</h1>

    <!-- Conta -->
    <section class="card p-6">
      <h2 class="mb-4 text-lg font-semibold">Conta</h2>
      <dl class="space-y-3 text-sm">
        <div class="flex justify-between">
          <dt class="text-slate-500 dark:text-slate-400">Nome</dt>
          <dd class="font-medium">{{ auth.displayName }}</dd>
        </div>
        <div class="flex justify-between">
          <dt class="text-slate-500 dark:text-slate-400">E-mail</dt>
          <dd class="font-medium">{{ auth.email }}</dd>
        </div>
      </dl>
    </section>

    <!-- Aparência -->
    <section class="card p-6">
      <h2 class="mb-4 text-lg font-semibold">Aparência</h2>
      <div class="flex items-center justify-between">
        <div>
          <p class="font-medium">Tema</p>
          <p class="text-sm text-slate-500 dark:text-slate-400">Escolha entre claro e escuro. A preferência é salva.</p>
        </div>
        <div class="flex gap-2">
          <button
            class="rounded-xl border px-4 py-2 text-sm font-medium transition"
            :class="theme.theme === 'light' ? 'border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-900/30' : 'border-slate-300 dark:border-slate-700'"
            @click="theme.set('light')"
          >
            Claro
          </button>
          <button
            class="rounded-xl border px-4 py-2 text-sm font-medium transition"
            :class="theme.theme === 'dark' ? 'border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-900/30' : 'border-slate-300 dark:border-slate-700'"
            @click="theme.set('dark')"
          >
            Escuro
          </button>
        </div>
      </div>
    </section>

    <!-- Sessão -->
    <section class="card p-6">
      <h2 class="mb-4 text-lg font-semibold">Sessão</h2>
      <BaseButton variant="danger" @click="logout">Sair da conta</BaseButton>
    </section>
  </div>
</template>
