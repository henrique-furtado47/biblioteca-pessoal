<script setup>
import { RouterView } from 'vue-router'
import ThemeToggle from '@/components/ui/ThemeToggle.vue'
</script>

<template>
  <div class="flex min-h-screen">
    <!-- Painel ilustrativo (desktop) -->
    <div class="relative hidden w-1/2 flex-col justify-between bg-brand-600 p-12 text-white lg:flex">
      <div class="flex items-center gap-2 text-lg font-bold">
        <svg class="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.6"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.5C10.5 5.5 8.5 5 6.5 5H4v12.5h2.5c2 0 4 .5 5.5 1.5m0-12.5c1.5-1 3.5-1.5 5.5-1.5H20V17.5h-2.5c-2 0-4 .5-5.5 1.5m0-12.5V19"/></svg>
        Minha Biblioteca
      </div>
      <div>
        <h1 class="text-4xl font-extrabold leading-tight">
          Organize sua coleção<br />de livros com elegância.
        </h1>
        <p class="mt-4 max-w-md text-brand-100">
          Acompanhe leituras, avalie, marque favoritos e visualize estatísticas da sua jornada literária.
        </p>
      </div>
      <p class="text-sm text-brand-200">© {{ new Date().getFullYear() }} Minha Biblioteca</p>
    </div>

    <!-- Formulário -->
    <div class="flex w-full flex-col lg:w-1/2">
      <div class="flex justify-end p-4">
        <ThemeToggle />
      </div>
      <div class="flex flex-1 items-center justify-center px-6 pb-12">
        <div class="w-full max-w-md">
          <RouterView />
        </div>
      </div>
    </div>
  </div>
</template>
