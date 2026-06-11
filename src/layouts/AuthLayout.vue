<script setup>
import { RouterView } from 'vue-router'
import ThemeToggle from '@/components/ui/ThemeToggle.vue'
</script>

<template>
  <div class="flex min-h-screen">
    <!-- Painel ilustrativo (desktop) -->
    <div class="relative hidden w-1/2 flex-col justify-between bg-brand-600 p-12 text-white lg:flex">
      <div class="flex items-center gap-2 text-lg font-bold">
        <font-awesome-icon :icon="['fas', 'book']" class="h-7 w-7" />
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
