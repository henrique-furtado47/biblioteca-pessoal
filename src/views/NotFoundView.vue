<script setup>
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import BaseButton from '@/components/ui/BaseButton.vue'

const router = useRouter()
const auth = useAuthStore()
</script>

<template>
  <div class="flex min-h-screen flex-col items-center justify-center px-6 text-center">
    <p class="text-7xl font-extrabold text-brand-600">404</p>
    <h1 class="mt-4 text-2xl font-bold">Página não encontrada</h1>
    <p class="mt-2 text-slate-500 dark:text-slate-400">O endereço que você tentou acessar não existe.</p>
    <BaseButton class="mt-6" @click="router.push(auth.isAuthenticated ? { name: 'dashboard' } : { name: 'login' })">
      Voltar ao início
    </BaseButton>
  </div>
</template>
