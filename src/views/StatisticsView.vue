<script setup>
import EmptyState from '@/components/ui/EmptyState.vue'
</script>

<template>
  <div class="space-y-5">
    <div>
      <h1 class="text-2xl font-bold">Estatísticas</h1>
      <p class="text-sm text-slate-500 dark:text-slate-400">Visualize sua jornada de leitura.</p>
    </div>

    <EmptyState icon="star" title="Em breve (Fase 4)" message="Gráficos com Chart.js: livros por ano/mês, por gênero, por status, páginas lidas e autores mais lidos." />
  </div>
</template>
