<script setup>
import { onMounted, ref, computed } from 'vue'
import { Bar, Doughnut } from 'vue-chartjs'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
  ArcElement,
} from 'chart.js'
import ChartDataLabels from 'chartjs-plugin-datalabels'
import { booksService } from '@/services/books.service'
import { useAuthStore } from '@/stores/auth.store'
import { STATUS_LABELS } from '@/constants'
import StatCard from '@/components/stats/StatCard.vue'
import Skeleton from '@/components/ui/Skeleton.vue'
import EmptyState from '@/components/ui/EmptyState.vue'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, ArcElement, ChartDataLabels)

const auth = useAuthStore()
const loading = ref(true)
const rows = ref([])

const STATUS_COLORS = {
  unread: '#94a3b8',
  reading: '#3b82f6',
  finished: '#10b981',
  abandoned: '#f43f5e',
  wishlist: '#f59e0b',
}
// Paleta para barras (gêneros / autores)
const PALETTE = [
  '#1f41f5', '#3563ff', '#598bff', '#8eb4ff', '#10b981',
  '#f59e0b', '#f43f5e', '#8b5cf6', '#14b8a6', '#ec4899',
]

onMounted(async () => {
  loading.value = true
  try {
    rows.value = await booksService.stats(auth.user.id)
  } finally {
    loading.value = false
  }
})

const hasData = computed(() => rows.value.length > 0)

// --- Cards de resumo ---------------------------------------------------------
const finishedCount = computed(() => rows.value.filter((b) => b.status === 'finished').length)
const pagesRead = computed(() =>
  rows.value
    .filter((b) => b.status === 'finished')
    .reduce((sum, b) => sum + (b.pages || 0), 0),
)
const ratedRows = computed(() => rows.value.filter((b) => b.rating != null && Number(b.rating) > 0))
const avgRating = computed(() => {
  if (!ratedRows.value.length) return '—'
  const sum = ratedRows.value.reduce((s, b) => s + Number(b.rating), 0)
  return (sum / ratedRows.value.length).toFixed(1)
})

// --- Por status (doughnut) ---------------------------------------------------
const statusChart = computed(() => {
  const counts = {}
  for (const b of rows.value) counts[b.status] = (counts[b.status] || 0) + 1
  const keys = Object.keys(STATUS_LABELS).filter((k) => counts[k])
  return {
    labels: keys.map((k) => STATUS_LABELS[k]),
    datasets: [
      {
        data: keys.map((k) => counts[k]),
        backgroundColor: keys.map((k) => STATUS_COLORS[k]),
        borderWidth: 0,
      },
    ],
  }
})

// --- Lidos por ano (bar) -----------------------------------------------------
const byYearChart = computed(() => {
  const counts = {}
  for (const b of rows.value) {
    if (!b.finish_date) continue
    const year = new Date(b.finish_date).getFullYear()
    if (Number.isNaN(year)) continue
    counts[year] = (counts[year] || 0) + 1
  }
  const years = Object.keys(counts).sort((a, b) => a - b)
  return {
    labels: years,
    datasets: [
      { label: 'Livros lidos', data: years.map((y) => counts[y]), backgroundColor: '#1f41f5', borderRadius: 6 },
    ],
  }
})
const hasYearData = computed(() => byYearChart.value.labels.length > 0)

// --- Top gêneros (bar horizontal) -------------------------------------------
const topGenresChart = computed(() => buildTopChart(
  rows.value.flatMap((b) => (b.genres || []).map((g) => g.genre?.name).filter(Boolean)),
))
const hasGenreData = computed(() => topGenresChart.value.labels.length > 0)

// --- Autores mais lidos (bar horizontal) ------------------------------------
const topAuthorsChart = computed(() => buildTopChart(
  rows.value.map((b) => b.author?.name).filter(Boolean),
))
const hasAuthorData = computed(() => topAuthorsChart.value.labels.length > 0)

function buildTopChart(names) {
  const counts = {}
  for (const n of names) counts[n] = (counts[n] || 0) + 1
  const top = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
  return {
    labels: top.map(([name]) => name),
    datasets: [
      {
        label: 'Livros',
        data: top.map(([, count]) => count),
        backgroundColor: top.map((_, i) => PALETTE[i % PALETTE.length]),
        borderRadius: 6,
      },
    ],
  }
}

// --- Opções compartilhadas ---------------------------------------------------
const tickColor = '#94a3b8'
const gridColor = 'rgba(148, 163, 184, 0.18)'

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  layout: { padding: 8 },
  plugins: {
    legend: { position: 'bottom', labels: { color: tickColor, padding: 16 } },
    datalabels: {
      color: '#fff',
      font: { weight: 'bold', size: 13 },
      formatter: (value) => value,
    },
  },
}

function barOptions(horizontal = false) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: horizontal ? 'y' : 'x',
    layout: { padding: horizontal ? { right: 24 } : { top: 20 } },
    plugins: {
      legend: { display: false },
      datalabels: {
        color: tickColor,
        anchor: 'end',
        align: horizontal ? 'right' : 'top',
        clamp: true,
        font: { weight: 'bold' },
        formatter: (value) => value,
      },
    },
    scales: {
      x: { ticks: { color: tickColor, precision: 0 }, grid: { color: gridColor } },
      y: { ticks: { color: tickColor, precision: 0 }, grid: { color: gridColor } },
    },
  }
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold">Estatísticas</h1>
      <p class="text-sm text-slate-500 dark:text-slate-400">Visualize sua jornada de leitura.</p>
    </div>

    <!-- loading -->
    <div v-if="loading" class="space-y-6">
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Skeleton v-for="n in 4" :key="n" class="h-24" />
      </div>
      <div class="grid gap-6 lg:grid-cols-2">
        <Skeleton v-for="n in 2" :key="n" class="h-72" />
      </div>
    </div>

    <EmptyState
      v-else-if="!hasData"
      icon="book"
      title="Sem dados ainda"
      message="Adicione livros à sua coleção para ver suas estatísticas de leitura aqui."
    />

    <template v-else>
      <!-- Cards -->
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Livros lidos" :value="finishedCount" icon="check" accent="emerald" />
        <StatCard label="Páginas lidas" :value="pagesRead" icon="book" accent="brand" />
        <StatCard label="Avaliação média" :value="avgRating" icon="star" accent="amber" />
        <StatCard label="Livros avaliados" :value="ratedRows.length" icon="reading" accent="blue" />
      </div>

      <!-- Gráficos -->
      <div class="grid gap-6 lg:grid-cols-2">
        <div class="card p-5">
          <h2 class="mb-4 font-semibold">Por status</h2>
          <div class="h-72"><Doughnut :data="statusChart" :options="doughnutOptions" /></div>
        </div>

        <div class="card p-5">
          <h2 class="mb-4 font-semibold">Livros lidos por ano</h2>
          <div class="h-72">
            <Bar v-if="hasYearData" :data="byYearChart" :options="barOptions(false)" />
            <p v-else class="flex h-full items-center justify-center text-sm text-slate-400">
              Marque livros como lidos (com data de conclusão) para ver este gráfico.
            </p>
          </div>
        </div>

        <div class="card p-5">
          <h2 class="mb-4 font-semibold">Gêneros mais lidos</h2>
          <div class="h-72">
            <Bar v-if="hasGenreData" :data="topGenresChart" :options="barOptions(true)" />
            <p v-else class="flex h-full items-center justify-center text-sm text-slate-400">
              Associe gêneros aos seus livros para ver este gráfico.
            </p>
          </div>
        </div>

        <div class="card p-5">
          <h2 class="mb-4 font-semibold">Autores mais lidos</h2>
          <div class="h-72">
            <Bar v-if="hasAuthorData" :data="topAuthorsChart" :options="barOptions(true)" />
            <p v-else class="flex h-full items-center justify-center text-sm text-slate-400">
              Cadastre o autor dos seus livros para ver este gráfico.
            </p>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
